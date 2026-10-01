/* All in Time: shared behaviour (loupe, forms, reveal). Used by the home page and every watch page. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;

  // Loupe: a real magnifier. Works on whichever image is currently shown in `host`,
  // survives image swaps, and waits for images to load.
  function loupe(host, getImg, opts = {}) {
    if (!host || host.__loupe) return;
    if (!fine) return touchLoupe(host, getImg, opts);
    host.__loupe = true;
    const L = opts.size || 220, Z = opts.zoom || 2.6;
    const lens = document.createElement('div'); lens.className = 'lens'; lens.setAttribute('aria-hidden', 'true');
    host.appendChild(lens);
    let last = null, inside = false;
    const draw = () => {
      if (!inside || !last) return;
      const im = getImg();
      if (!im || !im.complete || !im.naturalWidth) { lens.classList.remove('on'); return; }
      if (!lens.isConnected) host.appendChild(lens);
      const r = host.getBoundingClientRect(), x = last.clientX - r.left, y = last.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) { lens.classList.remove('on'); return; }
      const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      const op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ').map(v => parseFloat(v) / 100);
      const ox = (r.width - dw) * (isNaN(op[0]) ? .5 : op[0]), oy = (r.height - dh) * (isNaN(op[1]) ? .5 : op[1]);
      lens.style.backgroundImage = `url("${im.currentSrc || im.src}")`;
      lens.style.backgroundSize = `${dw * Z}px ${dh * Z}px`;
      lens.style.backgroundPosition = `${-((x - ox) * Z - L / 2)}px ${-((y - oy) * Z - L / 2)}px`;
      lens.style.width = lens.style.height = L + 'px';
      lens.style.left = `${x - L / 2}px`; lens.style.top = `${y - L / 2}px`;
      lens.classList.add('on');
    };
    host.addEventListener('pointerenter', e => { inside = true; last = e; draw(); });
    host.addEventListener('pointermove', e => { last = e; draw(); });
    host.addEventListener('pointerleave', () => { inside = false; lens.classList.remove('on'); });
    // re-draw when the image changes or finishes loading
    host.addEventListener('swap', () => requestAnimationFrame(draw));
    host.addEventListener('load', () => draw(), true);
    addEventListener('scroll', () => { if (inside) requestAnimationFrame(draw); }, { passive: true });
  }


  // touch: press and hold a photo, then drag to look closer
  function touchLoupe(host, getImg, opts = {}) {
    host.__loupe = true;
    const L = opts.touchSize || 150, Z = opts.zoom || 2.6;
    const lens = document.createElement('div'); lens.className = 'lens touch'; lens.setAttribute('aria-hidden', 'true'); host.appendChild(lens);
    let timer = 0, on = false, sx = 0, sy = 0;
    const draw = (cx, cy) => {
      const im = getImg(); if (!im || !im.naturalWidth) return;
      if (!lens.isConnected) host.appendChild(lens);
      const r = host.getBoundingClientRect(), x = Math.min(r.width, Math.max(0, cx - r.left)), y = Math.min(r.height, Math.max(0, cy - r.top));
      const s = Math.max(r.width / im.naturalWidth, r.height / im.naturalHeight), dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      const op = (getComputedStyle(im).objectPosition || '50% 50%').split(' ').map(v => parseFloat(v) / 100);
      const ox = (r.width - dw) * (isNaN(op[0]) ? .5 : op[0]), oy = (r.height - dh) * (isNaN(op[1]) ? .5 : op[1]);
      lens.style.width = lens.style.height = L + 'px';
      lens.style.backgroundImage = `url("${im.currentSrc || im.src}")`; lens.style.backgroundSize = `${dw * Z}px ${dh * Z}px`;
      lens.style.backgroundPosition = `${-((x - ox) * Z - L / 2)}px ${-((y - oy) * Z - L / 2)}px`;
      lens.style.left = `${x - L / 2}px`; lens.style.top = `${y - L - 36}px`; // sits above the thumb
    };
    const end = () => { clearTimeout(timer); if (on) { on = false; lens.classList.remove('on'); } };
    host.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; clearTimeout(timer);
      timer = setTimeout(() => { on = true; draw(sx, sy); lens.classList.add('on'); navigator.vibrate && navigator.vibrate(8); }, 260); }, { passive: true });
    host.addEventListener('touchmove', e => { const t = e.touches[0];
      if (!on) { if (Math.hypot(t.clientX - sx, t.clientY - sy) > 10) clearTimeout(timer); return; }
      e.preventDefault(); draw(t.clientX, t.clientY); }, { passive: false });
    host.addEventListener('touchend', e => { if (on) e.preventDefault(); end(); });
    host.addEventListener('touchcancel', end);
    host.addEventListener('contextmenu', e => { if (on) e.preventDefault(); });
  }

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


  window.AIT = Object.assign(window.AIT || {}, { loupe, forms, reveal, esc });
})();
