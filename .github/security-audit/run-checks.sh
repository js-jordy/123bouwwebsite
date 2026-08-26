#!/usr/bin/env bash
# Read-only deterministic security checks. Writes only under $RUNNER_TEMP.
set -euo pipefail

if [[ -z "${RUNNER_TEMP:-}" ]]; then
  echo "RUNNER_TEMP is not set; refusing to write scan output" >&2
  exit 1
fi

SCAN_DIR="${RUNNER_TEMP}/security-scan"
SITE_DIR="123bouwwebsite"
LIVE_URL="https://123zzpwebsite.nl"
NETLIFY_TOML="${SITE_DIR}/netlify.toml"
REDIRECTS="${SITE_DIR}/_redirects"

mkdir -p "${SCAN_DIR}"

CHECKS="${SCAN_DIR}/checks.txt"
LIVE_HEADERS="${SCAN_DIR}/live-headers.txt"
PATTERNS="${SCAN_DIR}/patterns.txt"
CHANGES="${SCAN_DIR}/changes.txt"
ORIGINS="${SCAN_DIR}/origins.txt"
FOOTPRINT="${SCAN_DIR}/footprint.txt"

: > "${CHECKS}"
: > "${LIVE_HEADERS}"
: > "${PATTERNS}"
: > "${CHANGES}"
: > "${ORIGINS}"
: > "${FOOTPRINT}"

section() {
  printf -- '\n===== %s =====\n' "$1" >> "${CHECKS}"
}

found_or_missing() {
  local label="$1"
  local path="$2"
  if [[ -e "${path}" ]]; then
    printf -- 'PRESENT\t%s\t%s\n' "${label}" "${path}" >> "${CHECKS}"
  else
    printf -- 'MISSING\t%s\t%s\n' "${label}" "${path}" >> "${CHECKS}"
  fi
}

header() {
  printf -- 'Weekly security-audit checks\n' >> "${CHECKS}"
  printf -- 'Generated (UTC): %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "${CHECKS}"
  printf -- 'Repository: %s\n' "${GITHUB_REPOSITORY:-unknown}" >> "${CHECKS}"
  printf -- 'Commit: %s\n' "${GITHUB_SHA:-unknown}" >> "${CHECKS}"
  printf -- 'Ref: %s\n' "${GITHUB_REF:-unknown}" >> "${CHECKS}"
  printf -- 'Working directory: %s\n' "$(pwd)" >> "${CHECKS}"
}

header

section "Repository configuration"
found_or_missing "netlify.toml" "${NETLIFY_TOML}"
found_or_missing "_redirects" "${REDIRECTS}"
found_or_missing "root netlify.toml.html (not a valid Netlify config filename)" "netlify.toml.html"
found_or_missing "root netlify.toml" "netlify.toml"

section "Unexpected .env files"
env_matches="$(find . -path './.git' -prune -o \( -name '.env' -o -name '.env.*' \) -print 2>/dev/null || true)"
if [[ -z "${env_matches}" ]]; then
  printf -- 'NONE_FOUND\t.env / .env.*\n' >> "${CHECKS}"
else
  printf -- '%s\n' "${env_matches}" >> "${CHECKS}"
fi

section "Source maps"
map_matches="$(find . -path './.git' -prune -o \( -name '*.map' -o -name '*.js.map' -o -name '*.css.map' \) -print 2>/dev/null || true)"
if [[ -z "${map_matches}" ]]; then
  printf -- 'NONE_FOUND\t*.map\n' >> "${CHECKS}"
else
  printf -- '%s\n' "${map_matches}" >> "${CHECKS}"
fi

section "Suspicious key / token files"
key_matches="$(find . -path './.git' -prune -o \( \
  -name '*.pem' -o -name '*.p12' -o -name '*.pfx' -o -name '*.keystore' \
  -o -name 'id_rsa' -o -name 'id_dsa' -o -name 'id_ed25519' \
  -o -name '*.pem.key' -o -name 'credentials.json' -o -name 'service-account.json' \
  \) -print 2>/dev/null || true)"
# *.key is listed separately to avoid drowning in unrelated matches if none exist.
key_ext_matches="$(find . -path './.git' -prune -o -name '*.key' -print 2>/dev/null || true)"
if [[ -z "${key_matches}" && -z "${key_ext_matches}" ]]; then
  printf -- 'NONE_FOUND\tprivate-key/token-like files\n' >> "${CHECKS}"
else
  printf -- '%s\n%s\n' "${key_matches}" "${key_ext_matches}" | sed '/^$/d' >> "${CHECKS}"
fi

section "Security headers in ${NETLIFY_TOML}"
if [[ ! -f "${NETLIFY_TOML}" ]]; then
  printf -- 'SKIPPED\t%s not present\n' "${NETLIFY_TOML}" >> "${CHECKS}"
else
  printf -- '--- file contents ---\n' >> "${CHECKS}"
  cat "${NETLIFY_TOML}" >> "${CHECKS}"
  printf -- '\n--- presence ---\n' >> "${CHECKS}"

  for label in \
    "Content-Security-Policy" \
    "X-Content-Type-Options" \
    "Referrer-Policy" \
    "Permissions-Policy" \
    "X-Frame-Options" \
    "frame-ancestors" \
    "Strict-Transport-Security"
  do
    if grep -Fqi -- "${label}" "${NETLIFY_TOML}"; then
      printf -- 'PRESENT\t%s\n' "${label}" >> "${CHECKS}"
      grep -Fi -- "${label}" "${NETLIFY_TOML}" >> "${CHECKS}" || true
    else
      printf -- 'MISSING\t%s\n' "${label}" >> "${CHECKS}"
    fi
  done
  printf -- 'NOTE\tMissing HSTS is recorded only as presence/absence; severity is for Cursor.\n' >> "${CHECKS}"
fi

section "Live security headers (${LIVE_URL})"
set +e
curl -sS -L --max-time 30 --connect-timeout 15 \
  -D "${LIVE_HEADERS}" \
  -o /dev/null \
  -w "http_code=%{http_code}\nurl_effective=%{url_effective}\nnum_redirects=%{num_redirects}\nssl_verify_result=%{ssl_verify_result}\n" \
  "${LIVE_URL}" > "${SCAN_DIR}/live-meta.txt"
curl_ec=$?
set -e
{
  printf -- 'curl_exit_code=%s\n' "${curl_ec}"
  cat "${SCAN_DIR}/live-meta.txt"
  printf -- 'https_requested=yes\n'
  if [[ "${curl_ec}" -eq 0 ]]; then
    printf -- 'https_reachable=yes\n'
  else
    printf -- 'https_reachable=no\n'
  fi
} >> "${CHECKS}"

# Normalise header names for lookup (strip CR).
live_norm="${SCAN_DIR}/live-headers.norm.txt"
tr -d '\r' < "${LIVE_HEADERS}" > "${live_norm}"

extract_live_header() {
  local name="$1"
  awk -v n="${name}:" '
    BEGIN { FS=":" }
    tolower($0) ~ "^" tolower(n) {
      val=$0
      sub(/^[^:]+:[[:space:]]*/, "", val)
    }
    END {
      if (val != "") print val
    }
  ' "${live_norm}" || true
}

printf -- '\n--- live header values ---\n' >> "${CHECKS}"
http_code="$(awk -F= '/^http_code=/ { print $2 }' "${SCAN_DIR}/live-meta.txt" 2>/dev/null || true)"
printf -- 'HTTP status: %s\n' "${http_code:-unknown}" >> "${CHECKS}"
for live_header in \
  "Strict-Transport-Security" \
  "Content-Security-Policy" \
  "X-Content-Type-Options" \
  "X-Frame-Options" \
  "Referrer-Policy" \
  "Permissions-Policy"
do
  value="$(extract_live_header "${live_header}")"
  if [[ -z "${value}" ]]; then
    printf -- 'LIVE_MISSING\t%s\n' "${live_header}" >> "${CHECKS}"
  else
    printf -- 'LIVE_PRESENT\t%s\t%s\n' "${live_header}" "${value}" >> "${CHECKS}"
  fi
done

section "Live vs repository header comparison"
if [[ -f "${NETLIFY_TOML}" ]]; then
  printf -- 'Comparing live response to %s (not netlify.toml.html).\n' "${NETLIFY_TOML}" >> "${CHECKS}"
  compare_header() {
    local name="$1"
    local live_val repo_line
    live_val="$(extract_live_header "${name}")"
    repo_line="$(grep -Fi -- "${name}" "${NETLIFY_TOML}" | head -n 1 || true)"
    if [[ -n "${repo_line}" && -z "${live_val}" ]]; then
      printf -- 'MISMATCH\t%s configured in netlify.toml but not returned live\n' "${name}" >> "${CHECKS}"
      printf -- '  repo: %s\n' "${repo_line}" >> "${CHECKS}"
    elif [[ -z "${repo_line}" && -n "${live_val}" ]]; then
      printf -- 'MISMATCH\t%s returned live but not configured in netlify.toml\n' "${name}" >> "${CHECKS}"
      printf -- '  live: %s\n' "${live_val}" >> "${CHECKS}"
    elif [[ -z "${repo_line}" && -z "${live_val}" ]]; then
      printf -- 'ABSENT_BOTH\t%s\n' "${name}" >> "${CHECKS}"
    else
      printf -- 'PRESENT_BOTH\t%s\n' "${name}" >> "${CHECKS}"
      printf -- '  repo: %s\n' "${repo_line}" >> "${CHECKS}"
      printf -- '  live: %s\n' "${live_val}" >> "${CHECKS}"
    fi
  }
  compare_header "Content-Security-Policy"
  compare_header "X-Content-Type-Options"
  compare_header "Referrer-Policy"
  compare_header "Permissions-Policy"
  compare_header "X-Frame-Options"
  compare_header "Strict-Transport-Security"
else
  printf -- 'SKIPPED comparison; %s missing\n' "${NETLIFY_TOML}" >> "${CHECKS}"
fi

section "Netlify forms"
check_form() {
  local file="$1"
  printf -- '\n--- %s ---\n' "${file}" >> "${CHECKS}"
  if [[ ! -f "${file}" ]]; then
    printf -- 'MISSING_FILE\t%s\n' "${file}" >> "${CHECKS}"
    return
  fi
  grep -n -i '<form' "${file}" >> "${CHECKS}" || printf -- 'NO_FORM_TAG\n' >> "${CHECKS}"
  if grep -Eqi 'method=["'\'']POST["'\'']' "${file}"; then
    printf -- 'PRESENT\tmethod=POST\n' >> "${CHECKS}"
  else
    printf -- 'MISSING\tmethod=POST\n' >> "${CHECKS}"
  fi
  for attr in 'data-netlify' 'name="contact"' 'bot-field' 'data-netlify-honeypot' 'form-name'; do
    if grep -Fq -- "${attr}" "${file}"; then
      printf -- 'PRESENT\t%s\n' "${attr}" >> "${CHECKS}"
    else
      printf -- 'MISSING\t%s\n' "${attr}" >> "${CHECKS}"
    fi
  done
}
check_form "${SITE_DIR}/index.html"
check_form "${SITE_DIR}/contact.html"

section "Suspicious code patterns (matches are not automatically vulnerabilities)"
{
  printf -- 'Searched under %s only (*.html, *.js, *.css).\n' "${SITE_DIR}"
  printf -- 'A match is evidence for Cursor to classify, not a confirmed issue.\n'
} >> "${PATTERNS}"

search_pattern() {
  local pat="$1"
  printf -- '\n## Pattern: %s\n' "${pat}" >> "${PATTERNS}"
  if grep -RIn --exclude-dir=.git \
    --include='*.html' --include='*.js' --include='*.css' \
    -E -- "${pat}" "${SITE_DIR}" >> "${PATTERNS}" 2>/dev/null
  then
    :
  else
    printf -- 'NO_MATCH\n' >> "${PATTERNS}"
  fi
}

search_pattern 'eval\('
search_pattern 'new Function'
search_pattern 'document\.write'
search_pattern 'innerHTML'
search_pattern 'outerHTML'
search_pattern 'insertAdjacentHTML'
search_pattern 'javascript:'
search_pattern 'onclick='
search_pattern 'onerror='

printf -- 'Pattern search written to patterns.txt\n' >> "${CHECKS}"

section "External origins"
{
  printf -- 'Unique http(s) URLs and hosts from %s HTML/CSS/JS\n' "${SITE_DIR}"
} >> "${ORIGINS}"
url_list="$(grep -RhoE 'https?://[^[:space:]"'\''<>)]+' \
  --include='*.html' --include='*.css' --include='*.js' \
  "${SITE_DIR}" 2>/dev/null | sed 's/[),;].*$//' | sort -u || true)"
if [[ -z "${url_list}" ]]; then
  printf -- 'NONE_FOUND\n' >> "${ORIGINS}"
else
  printf -- '%s\n' "${url_list}" >> "${ORIGINS}"
  printf -- '\n--- unique hosts ---\n' >> "${ORIGINS}"
  printf -- '%s\n' "${url_list}" | sed -E 's#^https?://##' | cut -d/ -f1 | sort -u >> "${ORIGINS}"
fi
printf -- 'Origin inventory written to origins.txt\n' >> "${CHECKS}"

section "Publish footprint"
{
  printf -- 'Repository root vs publish directory %s/\n' "${SITE_DIR}"
  printf -- '\n--- repository root (no .git) ---\n'
  find . -maxdepth 1 ! -name '.' ! -name '.git' | sed 's|^\./||' | sort
  printf -- '\n--- publish directory ---\n'
  if [[ -d "${SITE_DIR}" ]]; then
    find "${SITE_DIR}" -maxdepth 1 -print | sort
  else
    printf -- 'MISSING_DIR\t%s\n' "${SITE_DIR}"
  fi
  printf -- '\n--- notable root files ---\n'
} >> "${FOOTPRINT}"

if [[ -e "netlify.toml.html" ]]; then
  printf -- 'FLAG\tnetlify.toml.html exists at repository root (invalid Netlify config name)\n' >> "${FOOTPRINT}"
fi
root_verify="$(find . -maxdepth 1 -name 'verify-*.png' -print 2>/dev/null || true)"
if [[ -n "${root_verify}" ]]; then
  printf -- 'FLAG\tverification/screenshot PNGs outside publish directory:\n' >> "${FOOTPRINT}"
  printf -- '%s\n' "${root_verify}" >> "${FOOTPRINT}"
fi
outside="$(find . \
  \( -path './.git' -o -path "./${SITE_DIR}" -o -path './.github' -o -path './.cursor' -o -path './node_modules' \) -prune \
  -o -type f -print 2>/dev/null || true)"
printf -- '\n--- files outside %s/, .github/, .cursor/, .git ---\n' "${SITE_DIR}" >> "${FOOTPRINT}"
if [[ -z "${outside}" ]]; then
  printf -- 'NONE\n' >> "${FOOTPRINT}"
else
  printf -- '%s\n' "${outside}" >> "${FOOTPRINT}"
fi
printf -- 'Footprint written to footprint.txt\n' >> "${CHECKS}"

section "Changes in the last 8 days"
{
  printf -- 'git log --since=8 days ago\n'
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git log --since='8 days ago' --pretty=format:'%h %ad %s' --date=short || true
    printf -- '\n\n--- name-status ---\n'
    git log --since='8 days ago' --name-status --pretty=format:'commit %h %ad %s' --date=short || true
    printf -- '\n\n--- relevant paths ---\n'
    git log --since='8 days ago' --name-only --pretty=format:'commit %h %s' -- \
      "${NETLIFY_TOML}" \
      "${REDIRECTS}" \
      "${SITE_DIR}/*.html" \
      "${SITE_DIR}/*.js" \
      "${SITE_DIR}/*.css" \
      netlify.toml.html \
      .github \
      .cursor \
      || true
  else
    printf -- 'NOT_A_GIT_REPO\n'
  fi
} >> "${CHANGES}"
printf -- 'Change log written to changes.txt\n' >> "${CHECKS}"

printf -- '\n===== DONE =====\n' >> "${CHECKS}"
printf -- 'Scan output directory: %s\n' "${SCAN_DIR}" >> "${CHECKS}"
