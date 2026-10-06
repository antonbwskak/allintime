/* All in Time: shared behaviour (forms, reveal). Used by the home page and every watch page. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Forms: Netlify Forms, with an email fallback anywhere else
  function forms(getEmail) {
    $$('.js-form').forEach(f => {
      if (f.__bound) return; f.__bound = true;
      const fin = $('input[type=file]', f), dzb = $('.dz b', f);
      const setMode = sell => {
        f.classList.toggle('is-sell', sell);
        $$('input[name=topic]', f).forEach(r => r.checked = (r.value === 'Sell or trade') === sell);
        const lw = $('.lbl-watch', f); if (lw) lw.textContent = sell ? 'Your watch' : 'Watch';
        const w = $('input[name=watch]', f); if (w && !w.dataset.fixed) w.placeholder = sell ? 'Brand, model, year' : 'Which watch, or what you are looking for';
      };
      f.__setMode = setMode;
      $$('input[name=topic]', f).forEach(r => r.addEventListener('change', () => setMode(r.value === 'Sell or trade' && r.checked)));
      if (fin) fin.addEventListener('change', () => { dzb.textContent = fin.files.length ? `${fin.files.length} photo${fin.files.length > 1 ? 's' : ''} added` : 'Add photos'; });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const st = $('.status', f), btn = $('button[type=submit]', f);
        if (fin && !f.classList.contains('is-sell')) fin.value = '';
        if (fin && fin.files.length > 4) { st.className = 'status err'; st.textContent = 'Please attach up to 4 photos.'; return; }
        btn.disabled = true; st.className = 'status'; st.textContent = 'Sending…';
        const data = new FormData(f), hasFiles = fin && fin.files.length;
        try {
          const res = await fetch(f.getAttribute('action') || '/', { method: 'POST', body: hasFiles ? data : new URLSearchParams(data).toString(), headers: hasFiles ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' } });
          if (!res.ok) throw new Error(res.status);
          const sell = f.classList.contains('is-sell');
          f.reset(); if (dzb) dzb.textContent = 'Add photos'; setMode(false);
          st.className = 'status ok';
          st.textContent = sell ? 'Thank you. We will look at your watch and reply by email, usually within a day.' : 'Thank you. We will reply personally, usually the same day.';
        } catch (err) {
          const to = getEmail();
          const lines = [...data.entries()].filter(([k, v]) => typeof v === 'string' && v && !['form-name', 'company'].includes(k)).map(([k, v]) => `${k}: ${v}`).join('\n');
          st.className = 'status err';
          st.innerHTML = `That did not go through. <a href="mailto:${esc(to)}?subject=${encodeURIComponent(f.classList.contains('is-sell') ? 'Watch valuation' : 'Watch enquiry')}&body=${encodeURIComponent(lines)}">Send it by email instead</a>.`;
        } finally { btn.disabled = false; }
      });
    });
  }

  function reveal(qa) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv:not(.in)').forEach(el => qa ? el.classList.add('in') : io.observe(el));
  }


  // "View" cursor over watch cards (mouse only)
  function cursor() {
    if (!fine || matchMedia('(prefers-reduced-motion:reduce)').matches || document.querySelector('.cur')) return;
    const c = document.createElement('div'); c.className = 'cur'; c.textContent = 'View'; c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c); document.documentElement.classList.add('has-cur');
    let x = -200, y = -200, cx = x, cy = y, run = false;
    const loop = () => { cx += (x - cx) * .22; cy += (y - cy) * .22; c.style.transform = c.classList.contains('on') ? `translate(${cx}px,${cy}px) scale(1)` : `translate(${cx}px,${cy}px) scale(0)`; if (Math.abs(x - cx) + Math.abs(y - cy) > .3 || c.classList.contains('on')) requestAnimationFrame(loop); else run = false; };
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.toggle('on', !!e.target.closest('a.card')); if (!run) { run = true; requestAnimationFrame(loop); } }, { passive: true });
  }
  // green curtain between pages
  function curtain(qa) {
    const html = document.documentElement;
    const cv = document.createElement('div'); cv.className = 'curtain'; cv.setAttribute('aria-hidden', 'true');
    const base = (document.querySelector('link[rel=icon]') || {}).getAttribute?.('href') || 'assets/logo-mark.png';
    cv.innerHTML = `<img src="${base.replace('logo-mark', 'logo')}" alt="">`;
    document.body.appendChild(cv);
    if (html.classList.contains('cv') && !qa) {
      cv.style.transition = 'none'; cv.classList.add('cover'); html.classList.remove('cv');
      requestAnimationFrame(() => requestAnimationFrame(() => { cv.style.transition = ''; cv.classList.add('leave'); setTimeout(() => { cv.classList.remove('cover', 'leave'); }, 800); }));
    } else html.classList.remove('cv');
    if (qa || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      const u = new URL(a.href, location.href);
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash) || u.href.startsWith('mailto')) return;
      e.preventDefault(); try { sessionStorage.setItem('ait-cv', '1'); } catch (_) {}
      cv.classList.remove('leave'); cv.classList.add('cover'); setTimeout(() => { location.href = u.href; }, 650);
    });
    addEventListener('pageshow', ev => { if (ev.persisted) cv.classList.remove('cover'); });
  }
  const QA0 = new URLSearchParams(location.search).has('qa');

  // header tucks away while scrolling down, returns when scrolling up
  function autohide() {
    const t = document.querySelector('.top'); if (!t) return;
    let ly = scrollY, acc = 0;
    // over the dark hero (home page only) the bar is transparent while fully scrolled up
    const dark = !!document.querySelector('.hx');
    const top = () => t.classList.toggle('at-top', dark && scrollY < 8);
    top(); addEventListener('scroll', top, { passive: true });
    addEventListener('scroll', () => {
      const y = scrollY, d = y - ly; ly = y;
      acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
      if (y < 120) t.classList.remove('tuck');
      else if (acc > 24) t.classList.add('tuck');
      else if (acc < -24) t.classList.remove('tuck');
    }, { passive: true });
    document.addEventListener('focusin', e => { if (t.contains(e.target)) t.classList.remove('tuck'); });
  }
  autohide();


  window.AIT = Object.assign(window.AIT || {}, { forms, reveal, esc });
})();
