document.addEventListener('DOMContentLoaded', () => {

  // 1. Scroll progress bar
  const bar = document.getElementById('scroll-bar');
  if (bar) {
    window.addEventListener('scroll', () => {
      bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%';
    }, { passive: true });
  }

  // 2. Cursor ambient glow
  initCursorGlow();

  // 3. Section pill
  const pill = document.getElementById('section-pill');
  if (pill) {
    const pillObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) pill.textContent = e.target.dataset.section; });
    }, { threshold: 0.35 });
    document.querySelectorAll('[data-section]').forEach(s => pillObs.observe(s));
  }

  // 4. Countup
  const counters = document.querySelectorAll('[data-target]');
  if (counters.length) {
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, target = parseFloat(el.dataset.target);
        const decimal = el.dataset.decimal === 'true';
        const prefix = el.dataset.prefix || '', suffix = el.dataset.suffix || '';
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const p = Math.min((ts - start) / 1800, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + (decimal ? (eased * target / 10).toFixed(1) : Math.floor(eased * target)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        cObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(c => cObs.observe(c));
  }

  // 5. Scroll reveal
  initScrollReveal();

  // 6. FAQ — smooth height accordion
  const closeFaq = (item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.classList.remove('open');
    a.classList.remove('open');
    a.style.maxHeight = '0px';
  };

  const openFaq = (item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.classList.add('open');
    a.classList.add('open');
    a.style.maxHeight = a.scrollHeight + 'px';
  };

  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    a.style.maxHeight = '0px';
    q.addEventListener('click', () => {
      const isOpen = q.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(closeFaq);
      if (!isOpen) openFaq(item);
    });
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      const a = item.querySelector('.faq-a');
      if (q && a && q.classList.contains('open')) {
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  }, { passive: true });

  // 7. Mobile nav — beautiful full-screen drawer
  const menuBtn = document.querySelector('.nav-menu-btn');
  const drawer  = document.querySelector('.nav-drawer');
  const closeBtn = drawer ? drawer.querySelector('.drawer-close') : null;

  const openDrawer = () => {
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
    menuBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  };
  const closeDrawer = () => {
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    menuBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  };

  if (menuBtn && drawer) {
    menuBtn.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', closeDrawer));
  }

  initWhatsApp();

});

const WA_MESSAGE = 'Hallo Jordy, ik wil graag meer weten over een website voor mijn bedrijf.';
const WA_URL = 'https://wa.me/31618802551?text=' + encodeURIComponent(WA_MESSAGE);
const WA_ICON_PATH = 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z';

function initWhatsApp() {
  document.querySelectorAll('.chat-float').forEach((el) => {
    el.href = WA_URL;
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
    el.setAttribute('aria-label', 'WhatsApp ons');
    el.querySelectorAll('.chat-dot').forEach((dot) => dot.remove());
    const svg = el.querySelector('svg');
    if (!svg || !svg.querySelector('path[d*="17.472"]')) {
      el.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + WA_ICON_PATH + '"/></svg>';
    }
  });

  document.querySelectorAll('.cc-card-wa, a.cc-card[href*="wa.me"]').forEach((el) => {
    el.href = WA_URL;
    el.classList.add('cc-card-wa');
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener noreferrer');
    el.setAttribute('aria-label', 'WhatsApp Jordy op 06 18 80 25 51');
    const icon = el.querySelector('.cc-icon svg');
    if (icon && !icon.querySelector('path[d*="17.472"]')) {
      icon.innerHTML = '<path d="' + WA_ICON_PATH + '"/>';
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
    }
  });

  document.querySelectorAll('a.btn-wa, a[href*="wa.me"].btn-wa').forEach((el) => {
    el.href = WA_URL;
  });
}

const CURSOR_HOVER_SEL =
  'a, button, .btn, input, textarea, select, label, .card, .gc, .p-card, .t-card, .chip, .faq-q, .nav-cta, .social-btn';

/**
 * Custom cursor accent (dot + ring) — sitewide, desktop pointer only.
 */
function initCursorGlow() {
  const accent = document.getElementById('cursor-accent');
  if (!accent || accent.dataset.cursorAccentInit === '1') return;
  accent.dataset.cursorAccentInit = '1';
  initCursorAccent(accent);
}

function initCursorAccent(accent) {
  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(pointer: fine)');
  const mqDesktop = window.matchMedia('(min-width: 769px)');

  if (!mqFine.matches || !mqDesktop.matches) return;

  const ease = mqReduced.matches ? 0.55 : 0.2;
  let targetX = -100;
  let targetY = -100;
  let currentX = targetX;
  let currentY = targetY;
  let rafId = 0;

  const paint = () => {
    currentX += (targetX - currentX) * ease;
    currentY += (targetY - currentY) * ease;
    accent.style.left = currentX + 'px';
    accent.style.top = currentY + 'px';
    if (Math.abs(targetX - currentX) > 0.25 || Math.abs(targetY - currentY) > 0.25) {
      rafId = requestAnimationFrame(paint);
    } else {
      currentX = targetX;
      currentY = targetY;
      accent.style.left = currentX + 'px';
      accent.style.top = currentY + 'px';
      rafId = 0;
    }
  };

  const schedule = () => {
    if (!rafId) rafId = requestAnimationFrame(paint);
  };

  document.addEventListener('mousemove', (e) => {
    if (!accent.classList.contains('is-visible')) accent.classList.add('is-visible');
    targetX = e.clientX;
    targetY = e.clientY;
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    accent.classList.toggle('cursor-accent--hover', !!(hit && hit.closest(CURSOR_HOVER_SEL)));
    schedule();
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    accent.classList.remove('is-visible', 'cursor-accent--hover');
  }, { passive: true });
}

/**
 * Subtle scroll reveal — IntersectionObserver, one-shot, grid stagger.
 * Plain CSS + vanilla JS; respects prefers-reduced-motion.
 */
function initScrollReveal() {
  const STAGGER_GRIDS = [
    ['.pricing-grid.reveal', '.p-card'],
    ['.g3.reveal', '.gc'],
    ['.g4.reveal', '.gc'],
    ['.process-grid.reveal', '.step'],
    ['.transform-grid.reveal', '.t-card'],
    ['.guarantee.reveal', '.gu-item'],
    ['.values-list.reveal', '.vc'],
    ['.trust-strip.reveal', '.ti-item'],
    ['#caseGrid', '.case-card'],
  ];
  const STAGGER_MS = 55;
  const SKIP_SEL = '.chat-float, nav, .nav-drawer, #scroll-bar, #cursor-glow, #cursor-accent, .cursor-accent, #section-pill';

  STAGGER_GRIDS.forEach(([gridSel, childSel]) => {
    document.querySelectorAll(gridSel).forEach((grid) => {
      grid.classList.remove('reveal');
      grid.classList.add('reveal-stagger');
      grid.querySelectorAll(childSel).forEach((child, i) => {
        child.classList.add('reveal');
        child.style.setProperty('--reveal-delay', i * STAGGER_MS + 'ms');
      });
    });
  });

  document.querySelectorAll(
    'section.faq-section:not(.reveal) .faq-max > div:first-child, section.faq-section .faq-header'
  ).forEach((el) => {
    if (!el.classList.contains('reveal')) el.classList.add('reveal');
  });

  const items = [...document.querySelectorAll('.reveal')].filter(
    (el) => !el.matches(SKIP_SEL) && !el.closest(SKIP_SEL)
  );

  items.forEach((el) => {
    if (el.style.getPropertyValue('--reveal-delay')) return;
    const parent = el.parentElement;
    if (!parent) return;
    const siblings = [...parent.children].filter((c) => c.classList.contains('reveal'));
    if (siblings.length < 2) return;
    const idx = siblings.indexOf(el);
    if (idx >= 0) el.style.setProperty('--reveal-delay', idx * STAGGER_MS + 'ms');
  });

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }

  const revealOne = (el) => {
    if (!el.classList.contains('in')) el.classList.add('in');
  };

  const getDelay = (el) => {
    const v = el.style.getPropertyValue('--reveal-delay');
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const delay = getDelay(el);
      if (delay > 0) setTimeout(() => revealOne(el), delay);
      else requestAnimationFrame(() => revealOne(el));
      revObs.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  const isInView = (el) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
  };

  items.forEach((el) => {
    if (isInView(el) && getDelay(el) === 0) revealOne(el);
  });
  document.documentElement.classList.add('js-reveal');

  items.forEach((el) => {
    if (!isInView(el)) {
      revObs.observe(el);
      return;
    }
    const delay = getDelay(el);
    if (delay > 0) setTimeout(() => revealOne(el), delay);
  });
}
