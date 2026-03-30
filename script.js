/* ═══════════════════════════════════════════════════════════════════
   Stark Studio Labs — Interactions & Animations
   Zero external dependencies. Apple-quality scroll animations.
   ═══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  /* ── Utility: throttle via requestAnimationFrame ─────────────── */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          fn(...args);
          ticking = false;
        });
      }
    };
  };

  /* ── Easing: easeOutQuart ────────────────────────────────────── */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);


  /* ═══════════════════════════════════════════════════════════════
     1. NAV SCROLL EFFECT
     Toggle .nav-scrolled on #nav when scrollY > 60
     ═══════════════════════════════════════════════════════════════ */
  const nav = document.getElementById('nav');
  let navScrolled = false;

  const updateNavScroll = () => {
    const isScrolled = window.scrollY > 60;
    if (isScrolled !== navScrolled) {
      navScrolled = isScrolled;
      if (nav) nav.classList.toggle('nav-scrolled', navScrolled);
    }
  };

  window.addEventListener('scroll', updateNavScroll, { passive: true });
  updateNavScroll();


  /* ═══════════════════════════════════════════════════════════════
     2. MOBILE NAV TOGGLE
     #nav-toggle (or #mobileToggle) toggles .nav-open on #nav.
     Clicking a .nav-links a also closes the menu.
     ═══════════════════════════════════════════════════════════════ */
  const navToggle = document.getElementById('nav-toggle') || document.getElementById('mobileToggle');
  const navLinksContainer = document.querySelector('.nav-links');

  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      nav.classList.toggle('nav-open');
    });
  }

  if (navLinksContainer) {
    navLinksContainer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        if (nav) nav.classList.remove('nav-open');
      });
    });
  }


  /* ═══════════════════════════════════════════════════════════════
     3. SMOOTH SCROLL
     All a[href^="#"] scroll smoothly to their target.
     ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const href = anchor.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });


  /* ═══════════════════════════════════════════════════════════════
     4. REVEAL ON SCROLL
     IntersectionObserver adds .revealed to .reveal elements.
     ═══════════════════════════════════════════════════════════════ */
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
      rootMargin: '0px 0px -60px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));


  /* ═══════════════════════════════════════════════════════════════
     5. STAGGER DELAYS
     Set incremental transitionDelay on grid children.
     ═══════════════════════════════════════════════════════════════ */
  const gridSelectors = [
    '.product-grid',
    '.layer-grid',
    '.steps-grid',
    '.blog-grid',
    '.tier-grid',
    '.community-grid',
  ];

  gridSelectors.forEach((selector) => {
    const grid = document.querySelector(selector);
    if (!grid) return;
    Array.from(grid.children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 100}ms`;
    });
  });

  // Roadmap timeline — stagger at 150ms per item
  const roadmapTimeline = document.querySelector('.roadmap-timeline');
  if (roadmapTimeline) {
    roadmapTimeline.querySelectorAll('.roadmap-item').forEach((item, i) => {
      item.style.transitionDelay = `${i * 150}ms`;
    });
  }


  /* ═══════════════════════════════════════════════════════════════
     6. TERMINAL TYPEWRITER
     When #terminal-body enters viewport, sequentially reveal
     .terminal-line children based on their data-delay attribute.
     Also types out .terminal-text content character by character.
     ═══════════════════════════════════════════════════════════════ */
  const terminalBody = document.getElementById('terminal-body');
  // Fallback: if no #terminal-body, look for .terminal-body inside #terminal
  const terminalContainer = terminalBody || (document.getElementById('terminal')
    ? document.getElementById('terminal').querySelector('.terminal-body')
    : null);
  let terminalAnimated = false;

  const typeText = (element, text, speed) => {
    let i = 0;
    element.textContent = '';
    const tick = () => {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      }
    };
    tick();
  };

  const animateTerminal = () => {
    if (terminalAnimated || !terminalContainer) return;
    terminalAnimated = true;

    const lines = terminalContainer.querySelectorAll('.terminal-line');
    lines.forEach((line) => {
      const delay = parseInt(line.getAttribute('data-delay') || '0', 10);
      setTimeout(() => {
        line.classList.add('visible');
        // Type out command text if present
        const textEl = line.querySelector('.terminal-text');
        if (textEl) {
          const text = textEl.getAttribute('data-text');
          if (text) {
            typeText(textEl, text, 30);
          }
        }
      }, delay);
    });
  };

  // Observe the terminal container for viewport entry
  const terminalTarget = terminalContainer || document.getElementById('terminal');
  if (terminalTarget) {
    const terminalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateTerminal();
            terminalObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    terminalObserver.observe(terminalTarget);
  }


  /* ═══════════════════════════════════════════════════════════════
     7. HERO PARALLAX
     Subtle parallax on .hero-bg (or .hero-gradient fallback).
     Fades hero scroll indicator after scrollY > 200.
     ═══════════════════════════════════════════════════════════════ */
  const heroBg = document.querySelector('.hero-bg') || document.querySelector('.hero-gradient');
  const heroScroll = document.querySelector('.hero-scroll') || document.querySelector('.hero-scroll-indicator');

  const updateHeroParallax = () => {
    const y = window.scrollY;

    // Parallax: translate background at 0.3x scroll speed and fade
    if (heroBg) {
      const opacity = Math.max(0, 1 - y / 800);
      heroBg.style.transform = `translateY(${y * 0.3}px)`;
      heroBg.style.opacity = opacity;
    }

    // Fade out scroll indicator after 200px
    if (heroScroll) {
      if (y > 200) {
        heroScroll.style.opacity = '0';
        heroScroll.style.pointerEvents = 'none';
      } else {
        heroScroll.style.opacity = '1';
        heroScroll.style.pointerEvents = '';
      }
    }
  };

  window.addEventListener('scroll', rafThrottle(updateHeroParallax), { passive: true });
  updateHeroParallax();


  /* ═══════════════════════════════════════════════════════════════
     8. STAT COUNTER
     When .hero-stats enters viewport, animate each .stat-value
     from 0 to its target number over 1.5s with easeOutQuart.
     Handles integers ("13", "6") and percentage ("100%").
     Only runs once.
     ═══════════════════════════════════════════════════════════════ */
  const heroStats = document.querySelector('.hero-stats');
  let statsAnimated = false;

  const animateCounter = (element, target, suffix, duration) => {
    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const current = Math.round(eased * target);

      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  };

  if (heroStats) {
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsAnimated) {
            statsAnimated = true;

            heroStats.querySelectorAll('.stat-value').forEach((el) => {
              const raw = el.textContent.trim();
              let target;
              let suffix = '';

              if (raw.endsWith('%')) {
                target = parseInt(raw.replace('%', ''), 10);
                suffix = '%';
              } else {
                target = parseInt(raw, 10);
              }

              if (!isNaN(target)) {
                el.textContent = '0' + suffix;
                animateCounter(el, target, suffix, 1500);
              }
            });

            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    statsObserver.observe(heroStats);
  }


  /* ═══════════════════════════════════════════════════════════════
     9. ACTIVE NAV HIGHLIGHTING
     On scroll, determine which section is in view and add
     .active to the corresponding .nav-links a.
     ═══════════════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll('section[id]');
  const navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  const updateActiveNav = () => {
    const scrollY = window.scrollY;
    const navHeight = nav ? nav.offsetHeight : 0;
    let currentId = '';

    sections.forEach((section) => {
      const top = section.offsetTop - navHeight - 120;
      const bottom = top + section.offsetHeight;
      if (scrollY >= top && scrollY < bottom) {
        currentId = section.getAttribute('id');
      }
    });

    navAnchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (href === '#' + currentId) {
        anchor.classList.add('active');
      } else {
        anchor.classList.remove('active');
      }
    });
  };

  window.addEventListener('scroll', rafThrottle(updateActiveNav), { passive: true });
  updateActiveNav();
});
