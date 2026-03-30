// Stark Labs GA4 Custom Event Tracking
document.addEventListener('DOMContentLoaded', function() {
  // Track all outbound link clicks
  document.querySelectorAll('a[href^="http"]').forEach(function(link) {
    link.addEventListener('click', function() {
      var url = this.href;
      var label = this.textContent.trim().substring(0, 50);
      
      if (url.includes('github.com')) {
        gtag('event', 'github_click', { link_url: url, link_text: label });
      } else if (url.includes('patreon.com')) {
        gtag('event', 'patreon_click', { link_url: url, link_text: label });
      } else if (url.includes('discord')) {
        gtag('event', 'discord_click', { link_url: url, link_text: label });
      }
    });
  });

  // Track download button clicks
  document.querySelectorAll('a[href*="download"], .btn-primary').forEach(function(btn) {
    if (btn.textContent.toLowerCase().includes('download')) {
      btn.addEventListener('click', function() {
        gtag('event', 'download_click', { 
          button_text: this.textContent.trim(),
          page: window.location.pathname 
        });
      });
    }
  });

  // Track persona selection on /download page
  document.querySelectorAll('[data-persona]').forEach(function(card) {
    card.addEventListener('click', function() {
      gtag('event', 'persona_select', { 
        persona: this.dataset.persona 
      });
    });
  });

  // Track mod card clicks on /mods page
  document.querySelectorAll('.mod-card, .layer-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var modName = this.querySelector('h3, h4')?.textContent || 'unknown';
      gtag('event', 'mod_interest', { mod_name: modName });
    });
  });

  // Track scroll depth (25%, 50%, 75%, 100%)
  var scrollMarks = { 25: false, 50: false, 75: false, 100: false };
  window.addEventListener('scroll', function() {
    var scrollPct = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    [25, 50, 75, 100].forEach(function(mark) {
      if (scrollPct >= mark && !scrollMarks[mark]) {
        scrollMarks[mark] = true;
        gtag('event', 'scroll_depth', { depth: mark + '%', page: window.location.pathname });
      }
    });
  });

  // Track time on page (30s, 60s, 120s, 300s)
  [30, 60, 120, 300].forEach(function(sec) {
    setTimeout(function() {
      gtag('event', 'engaged_time', { seconds: sec, page: window.location.pathname });
    }, sec * 1000);
  });
});
