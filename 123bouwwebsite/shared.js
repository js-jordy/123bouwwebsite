document.addEventListener('DOMContentLoaded', () => {

  // 1. Scroll progress bar
  const bar = document.getElementById('scroll-bar');
  if (bar) {
    window.addEventListener('scroll', () => {
      bar.style.width = (window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100) + '%';
    }, { passive: true });
  }

  // 2. Cursor spotlight — desktop only
  const glow = document.getElementById('cursor-glow');
  if (glow && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (e) => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
    }, { passive: true });
  }

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
  const revObs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('in'), i * 70);
        revObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach(r => revObs.observe(r));

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
