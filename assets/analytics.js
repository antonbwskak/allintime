// Google Analytics 4 med cookie-consent.
// Scriptet indlæses på alle sider. Analytics (og dermed cookies) indlæses
// kun efter at besøgeren har accepteret. Valget gemmes i localStorage.
(function () {
  var script = document.currentScript;
  var GA = (script && script.getAttribute('data-ga')) || '';
  var KEY = 'ait_consent';

  if (!GA) return;

  function readConsent() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function writeConsent(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  var loaded = false;
  function loadGA() {
    if (loaded) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
    document.head.appendChild(s);
    window.gtag('js', new Date());
    window.gtag('config', GA, { anonymize_ip: true });
  }

  function banner() {
    var bar = document.createElement('div');
    bar.className = 'cookiebar';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie-samtykke');
    bar.innerHTML =
      '<p>Vi bruger cookies til statistik over besøg på allintime.dk. ' +
      '<a href="/service/">Læs mere om privatliv</a>.</p>' +
      '<div class="cookiebar-actions">' +
      '<button type="button" class="btn ghost" data-choice="denied">Afvis</button>' +
      '<button type="button" class="btn" data-choice="granted">Accepter</button>' +
      '</div>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('is-in'); });

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-choice]');
      if (!btn) return;
      var choice = btn.getAttribute('data-choice');
      writeConsent(choice);
      if (choice === 'granted') loadGA();
      bar.classList.remove('is-in');
      setTimeout(function () { bar.remove(); }, 400);
    });
  }

  var consent = readConsent();
  if (consent === 'granted') {
    loadGA();
  } else if (consent === 'denied') {
    // Valget er allerede truffet - spørg ikke igen
  } else {
    var start = function () { banner(); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }
})();
