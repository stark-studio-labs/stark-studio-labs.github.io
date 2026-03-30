/* ═══════════════════════════════════════════════════════════════════
   Stark Studio Labs — Interactions & Animations
   Zero dependencies. Apple-quality scroll animations.
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ── Utility: rAF throttle ───────────────────────────────────── */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => { fn(...args); ticking = false; });
      }
    };
  };

  /* ── Utility: easeOutQuart ───────────────────────────────────── */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);


  /* ═══════════════════════════════════════════════════════════════
     1. NAV GLASSMORPHISM ON SCROLL
     Toggles .nav-scrolled on #nav when scrollY > 40
     ═══════════════════════════════════════════════════════════════ */
  const nav = document.getElementById('nav');
  let navScrolled = false;

  const updateNav = () => {
    const isScrolled = window.scrollY > 40;
    if (isScrolled !== navScrolled) {
      navScrolled = isScrolled;
      nav?.classList.toggle('nav-scrolled', navScrolled);
    }
  };

  window.addEventListener('scroll', rafThrottle(updateNav), { passive: true });
  updateNav();


  /* ═══════════════════════════════════════════════════════════════
     2. MOBILE NAV TOGGLE
     #nav-toggle toggles .nav-open on #nav.
     Clicking any nav link closes the menu.
     ═══════════════════════════════════════════════════════════════ */
  const navToggle = document.getElementById('nav-toggle');
  const navLinksEl = document.getElementById('navLinks');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('nav-open');
      const isOpen = nav.classList.contains('nav-open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });
  }

  if (navLinksEl) {
    navLinksEl.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        nav?.classList.remove('nav-open');
        navToggle?.setAttribute('aria-expanded', 'false');
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════
     3. SMOOTH SCROLL
     All a[href^="#"] links scroll smoothly to target.
     ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const navH = nav ? nav.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });


  /* ═══════════════════════════════════════════════════════════════
     4. SCROLL REVEAL
     IntersectionObserver adds .revealed to .reveal elements.
     Children of grids get staggered transitionDelay.
     ═══════════════════════════════════════════════════════════════ */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });

  revealEls.forEach((el) => revealObserver.observe(el));


  /* ═══════════════════════════════════════════════════════════════
     5. STAGGER DELAYS ON GRID CHILDREN
     Applies incremental transitionDelay to children of grids.
     ═══════════════════════════════════════════════════════════════ */
  const staggerSelectors = [
    '.layers-grid',
    '.tiers-grid',
    '.steps-grid',
    '.blog-grid',
    '.community-grid',
    '.spotlight-repos',
  ];

  staggerSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((grid) => {
      Array.from(grid.children).forEach((child, i) => {
        if (child.classList.contains('reveal')) {
          child.style.transitionDelay = `${i * 80}ms`;
        }
      });
    });
  });

  // Roadmap — longer stagger
  document.querySelectorAll('.roadmap-item').forEach((item, i) => {
    item.style.transitionDelay = `${i * 120}ms`;
  });


  /* ═══════════════════════════════════════════════════════════════
     6. TERMINAL TYPEWRITER
     When #terminal-body enters viewport, reveal .tl lines
     sequentially via data-delay. Runs only once.
     ═══════════════════════════════════════════════════════════════ */
  const terminalBody = document.getElementById('terminal-body');
  let terminalFired = false;

  const runTerminal = () => {
    if (terminalFired || !terminalBody) return;
    terminalFired = true;

    const lines = terminalBody.querySelectorAll('.tl');
    lines.forEach((line) => {
      const delay = parseInt(line.getAttribute('data-delay') || '0', 10);
      setTimeout(() => {
        line.classList.add('visible');

        // Optional: type out .tc (command) text character by character
        const cmdEl = line.querySelector('.tc');
        if (cmdEl && cmdEl.textContent.length > 0) {
          const fullText = cmdEl.textContent;
          cmdEl.textContent = '';
          let idx = 0;
          const type = () => {
            if (idx < fullText.length) {
              cmdEl.textContent += fullText.charAt(idx++);
              setTimeout(type, 28);
            }
          };
          type();
        }
      }, delay);
    });
  };

  if (terminalBody) {
    const termObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { runTerminal(); termObs.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    termObs.observe(terminalBody);
  }


  /* ═══════════════════════════════════════════════════════════════
     7. HERO GRADIENT PARALLAX + SCROLL CUE FADE
     Translates .hero-gradient at 0.25x scroll speed.
     Fades .hero-scroll-cue after 160px.
     ═══════════════════════════════════════════════════════════════ */
  const heroGradient = document.querySelector('.hero-gradient');
  const heroScrollCue = document.querySelector('.hero-scroll-cue');
  const heroContent = document.querySelector('.hero-content');

  const updateHeroParallax = () => {
    const y = window.scrollY;
    if (heroGradient) {
      heroGradient.style.transform = `translateY(${y * 0.25}px)`;
    }
    if (heroContent) {
      const fade = Math.max(0, 1 - y / 600);
      heroContent.style.opacity = fade;
      heroContent.style.transform = `translateY(${y * 0.1}px)`;
    }
    if (heroScrollCue) {
      heroScrollCue.style.opacity = y > 160 ? '0' : '1';
    }
  };

  window.addEventListener('scroll', rafThrottle(updateHeroParallax), { passive: true });
  updateHeroParallax();


  /* ═══════════════════════════════════════════════════════════════
     8. HERO STAT COUNTERS
     Animates .hero-stat-num from 0 to data-target over 1.4s.
     Uses data-suffix for "%" etc.
     Fires once when .hero-stats enters viewport.
     ═══════════════════════════════════════════════════════════════ */
  const heroStats = document.querySelector('.hero-stats');
  let statsFired = false;

  const animateCount = (el, target, suffix, duration) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(easeOutQuart(p) * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (heroStats) {
    const statsObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !statsFired) {
          statsFired = true;
          heroStats.querySelectorAll('.hero-stat-num').forEach((el) => {
            const target = parseInt(el.getAttribute('data-target') || el.textContent, 10);
            const suffix = el.getAttribute('data-suffix') || '';
            if (!isNaN(target)) animateCount(el, target, suffix, 1400);
          });
          statsObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    statsObs.observe(heroStats);
  }


  /* ═══════════════════════════════════════════════════════════════
     9. ACTIVE NAV LINK HIGHLIGHTING
     Watches section scroll position and marks matching nav link
     with .active class.
     ═══════════════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const updateActiveNav = () => {
    const scrollY = window.scrollY;
    const navH = nav ? nav.offsetHeight : 0;
    let activeId = '';

    sections.forEach((section) => {
      const top = section.offsetTop - navH - 100;
      if (scrollY >= top) activeId = section.id;
    });

    navAnchors.forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + activeId);
    });
  };

  window.addEventListener('scroll', rafThrottle(updateActiveNav), { passive: true });
  updateActiveNav();


  /* ═══════════════════════════════════════════════════════════════
     10. SPOTLIGHT SECTION REVEAL ON SCROLL
     Large viewport reveal with slide-in for spotlight text/visual.
     The .reveal observer above handles this, but we add a special
     entry to ensure spotlight pairs animate together.
     ═══════════════════════════════════════════════════════════════ */
  // Already handled by the generic revealObserver above.
  // spotlight-text and spotlight-visual both carry .reveal class.


  /* ═══════════════════════════════════════════════════════════════
     11. TIER CARD HOVER GLOW (Plumbob tier accent colors)
     ═══════════════════════════════════════════════════════════════ */
  const tierGlowMap = {
    green:   'rgba(52, 211, 153, 0.15)',
    blue:    'rgba(96, 165, 250, 0.15)',
    purple:  'rgba(167, 139, 250, 0.15)',
    gold:    'rgba(251, 191, 36, 0.15)',
    diamond: 'rgba(125, 211, 252, 0.15)',
    platinum: 'rgba(192, 132, 252, 0.15)',
  };

  document.querySelectorAll('.tier[data-tier]').forEach((card) => {
    const tier = card.getAttribute('data-tier');
    const glow = tierGlowMap[tier];
    if (!glow) return;
    card.addEventListener('mouseenter', () => {
      card.style.boxShadow = `0 0 0 1px ${glow.replace('0.15', '0.4')}, 0 16px 48px ${glow}`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.boxShadow = '';
    });
  });


  /* ═══════════════════════════════════════════════════════════════
     12. ROADMAP ITEM PULSE
     Active roadmap dots get a subtle entrance animation when
     they scroll into view.
     ═══════════════════════════════════════════════════════════════ */
  // Handled by .reveal + .revealed + the CSS animation on .rm-active.


  /* ═══════════════════════════════════════════════════════════════
     13. ACCESSIBILITY: RESPECT REDUCED MOTION
     Disable all JS animations for prefers-reduced-motion.
     ═══════════════════════════════════════════════════════════════ */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReducedMotion) {
    // Immediately reveal all elements
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('revealed'));
    // Skip terminal animation — show all lines immediately
    document.querySelectorAll('.tl').forEach((el) => el.classList.add('visible'));
    // Skip hero parallax
    window.removeEventListener('scroll', rafThrottle(updateHeroParallax));
  }

});
