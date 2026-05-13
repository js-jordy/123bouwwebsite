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

  // 4b. Cases — stats under "Cijfers die het verschil maken" (IntersectionObserver, runs once)
  const casesStatsSection = document.querySelector('section.stats-bar');
  if (casesStatsSection) {
    const statNums = casesStatsSection.querySelectorAll('.stats-grid .stat-num[data-countup]');
    if (statNums.length) {
      const easeOut = (t) => 1 - Math.pow(1 - t, 4);
      const duration = 2200;
      const staggerMs = 70;
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          obs.unobserve(entry.target);
          statNums.forEach((el, i) => {
            const target = parseFloat(el.getAttribute('data-countup'), 10);
            const decimal = el.dataset.decimal === 'true';
            const prefix = el.dataset.prefix || '';
            const suffix = el.dataset.suffix || '';
            setTimeout(() => {
              let start = null;
              const step = (ts) => {
                if (!start) start = ts;
                const p = Math.min((ts - start) / duration, 1);
                const eased = easeOut(p) * target;
                if (p >= 1) {
                  el.textContent = decimal
                    ? prefix + target.toFixed(1) + suffix
                    : prefix + String(Math.round(target)) + suffix;
                  return;
                }
                el.textContent = decimal
                  ? prefix + eased.toFixed(1) + suffix
                  : prefix + String(Math.floor(eased)) + suffix;
                requestAnimationFrame(step);
              };
              requestAnimationFrame(step);
            }, i * staggerMs);
          });
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -5% 0px' });
      obs.observe(casesStatsSection);
    }
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

  // 6. FAQ
  document.querySelectorAll('.faq-q').forEach(q => {
    q.addEventListener('click', () => {
      const a = q.nextElementSibling, isOpen = a.classList.contains('open');
      document.querySelectorAll('.faq-a').forEach(x => x.classList.remove('open'));
      document.querySelectorAll('.faq-q').forEach(x => x.classList.remove('open'));
      if (!isOpen) { a.classList.add('open'); q.classList.add('open'); }
    });
  });

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
