/* ═══════════════════════════════════════════════════════════════
   Stark Studio Labs — Interactions
   Zero external dependencies
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Nav: Glassmorphism on scroll + shrink ────────────────────
  var nav = document.getElementById('nav');
  var scrolled = false;

  function onScroll() {
    var y = window.scrollY;
    var isScrolled = y > 40;
    if (isScrolled !== scrolled) {
      scrolled = isScrolled;
      nav.classList.toggle('nav-scrolled', scrolled);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ── Mobile nav toggle ────────────────────────────────────────
  var mobileToggle = document.getElementById('mobileToggle');
  var navLinks = document.getElementById('navLinks');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', function () {
      navLinks.classList.toggle('nav-open');
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('nav-open');
      });
    });
  }

  // ── Smooth scroll for anchor links ───────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var href = a.getAttribute('href');
      if (href === '#') return;
      var target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      var navHeight = nav.offsetHeight;
      var top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  // ── Intersection Observer for reveal animations ──────────────
  var reveals = document.querySelectorAll('.reveal');

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -60px 0px'
  });

  reveals.forEach(function (el) { revealObserver.observe(el); });

  // ── Stagger delay for grid children ──────────────────────────
  var grids = document.querySelectorAll(
    '.layer-grid, .tier-grid, .blog-grid, .community-grid'
  );
  grids.forEach(function (grid) {
    Array.from(grid.children).forEach(function (child, i) {
      child.style.transitionDelay = (i * 60) + 'ms';
    });
  });

  // ── Terminal typing animation ────────────────────────────────
  var terminal = document.getElementById('terminal');
  var terminalAnimated = false;

  function typeText(element, text, speed, callback) {
    var i = 0;
    element.textContent = '';
    function tick() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(tick, speed);
      } else if (callback) {
        callback();
      }
    }
    tick();
  }

  function animateTerminal() {
    if (terminalAnimated || !terminal) return;
    terminalAnimated = true;

    var lines = terminal.querySelectorAll('.terminal-line');
    lines.forEach(function (line) {
      var delay = parseInt(line.getAttribute('data-delay') || '0', 10);
      setTimeout(function () {
        line.classList.add('visible');
        var textEl = line.querySelector('.terminal-text');
        if (textEl) {
          var text = textEl.getAttribute('data-text');
          if (text) {
            typeText(textEl, text, 35);
          }
        }
      }, delay);
    });
  }

  if (terminal) {
    var terminalObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateTerminal();
          terminalObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    terminalObserver.observe(terminal);
  }

  // ── Active nav link highlighting ─────────────────────────────
  var sections = document.querySelectorAll('section[id]');
  var navAnchors = document.querySelectorAll('.nav-links a[href^="#"]');

  function updateActiveNav() {
    var scrollY = window.scrollY;
    var navHeight = nav.offsetHeight;

    sections.forEach(function (section) {
      var top = section.offsetTop - navHeight - 100;
      var bottom = top + section.offsetHeight;
      var id = section.getAttribute('id');

      navAnchors.forEach(function (a) {
        if (a.getAttribute('href') === '#' + id) {
          if (scrollY >= top && scrollY < bottom) {
            a.style.color = '#e6edf3';
          } else {
            a.style.color = '';
          }
        }
      });
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });

  // ── Parallax effect on hero gradient ─────────────────────────
  var heroGradient = document.querySelector('.hero-gradient');
  if (heroGradient) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y < window.innerHeight) {
        heroGradient.style.transform = 'translateY(' + (y * 0.3) + 'px)';
      }
    }, { passive: true });
  }

})();
