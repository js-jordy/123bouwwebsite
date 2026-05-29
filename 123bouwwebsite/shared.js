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

});

const CURSOR_HOVER_SEL =
  'a, button, .btn, input, textarea, select, label, .card, .gc, .p-card, .t-card, .chip, .faq-q, .nav-cta, .social-btn';

/**
 * Homepage custom cursor accent (dot + ring). Legacy #cursor-glow on other pages.
 */
function initCursorGlow() {
  const accent = document.getElementById('cursor-accent');
  if (accent) {
    initCursorAccent(accent);
    return;
  }

  const glow = document.getElementById('cursor-glow');
  if (!glow) return;

  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mqFine = window.matchMedia('(pointer: fine)');
  const mqDesktop = window.matchMedia('(min-width: 769px)');
  if (mqReduced.matches || !mqFine.matches || !mqDesktop.matches) return;

  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });
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
