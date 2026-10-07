(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { esc, loupe, forms, reveal } = window.AIT;
  const QA = new URLSearchParams(location.search).has('qa');
  if (QA) document.documentElement.setAttribute('data-qa', '');
  const D = window.__AIT || { watches: [], settings: {} };
  const W = (D.watches || []).filter(w => w.model), S = D.settings || {};
  const src = p => (p || '').replace(/^\//, '');
  const kr = new Intl.NumberFormat('da-DK');
  const priceText = w => w.status === 'sold' ? 'Solgt' : (w.price_mode === 'price' && w.price_dkk ? `DKK ${kr.format(w.price_dkk)}` : 'Pris på forespørgsel');
  const statusText = w => ({ available: 'Tilgængelig', reserved: 'Reserveret', sold: 'Solgt' }[w.status] || 'Tilgængelig');
  const pos = w => `${w.focus_x ?? 50}% ${w.focus_y ?? 50}%`;
  const ig = (S.instagram || 'allintime.dk').replace(/^@/, '');

  // editable text
  $$('[data-s]').forEach(el => { const v = S[el.dataset.s]; if (v) el.textContent = v; });
  { const h = $('#heroTitle'); if (h) { const t = h.textContent.trim(); let k = t.indexOf(',');
    let a, b; if (k > 0) { a = t.slice(0, k + 1); b = t.slice(k + 1).trim(); } else { const ws = t.split(' '), m = Math.ceil(ws.length / 2); a = ws.slice(0, m).join(' '); b = ws.slice(m).join(' '); }
    h.innerHTML = `<span class="w"><b>${esc(a)}</b></span>${b ? ` <span class="w"><b><em>${esc(b)}</em></b></span>` : ''}`; } }
  if (S.email) $$('#mailLink,.js-mail').forEach(a => { a.href = 'mailto:' + S.email; a.textContent = S.email; });
  $$('#igLink,.js-ig').forEach(a => a.href = `https://www.instagram.com/${ig}/`); $('#igLink').textContent = '@' + ig;
  $('#yr').textContent = new Date().getFullYear();
  const hb = $('#heroBg');
  if (S.hero_caption) { const hc = $('#heroCap'); if (hc) hc.textContent = S.hero_caption; }
  if (hb) {
    hb.muted = true; hb.defaultMuted = true; hb.playsInline = true; hb.setAttribute('muted', ''); hb.setAttribute('playsinline', ''); hb.removeAttribute('controls');
    const want = src(innerWidth < 820 && S.hero_video_mobile ? S.hero_video_mobile : (S.hero_video || '/media/video/Adobe Express - DSCF0700.mp4'));
    if (want && !hb.src.endsWith(want)) hb.src = want;
    hb.addEventListener('playing', () => hb.classList.add('is-playing'));
    const tryPlay = () => { const p = hb.play(); if (p && p.catch) p.catch(() => {}); };
    tryPlay();
    const kick = () => { if (hb.paused) tryPlay(); else ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(e => removeEventListener(e, kick)); };
    ['touchstart', 'pointerdown', 'scroll', 'keydown'].forEach(e => addEventListener(e, kick, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden && hb.paused) tryPlay(); });
  }

  const card = w => `<a class="card rv" href="${esc(w.url)}">
      <div class="ph"><img src="${esc(src((w.images || [])[0]))}" alt="${esc(w.brand + ' ' + w.model)}" loading="lazy" style="object-position:${pos(w)}"></div>
      <div class="cap"><span class="b">${esc(w.brand)}</span><span class="st ${w.status === 'available' ? 'avail' : w.status === 'reserved' ? 'res' : ''}">${esc(statusText(w))}</span></div>
      <h3>${esc(w.model)}</h3>${w.status !== 'sold' ? `<p class="pr">${esc(priceText(w))}</p>` : ''}${w.description ? `<p class="ds">${esc(w.description)}</p>` : ''}
    </a>`;

  // available
  {
    const a = W.filter(w => w.status !== 'sold'), g = $('#availGrid');
    if (a.length) { g.className = 'grid'; g.innerHTML = a.map(card).join(''); $$('.rv', g).forEach(el => el.classList.add('in')); }
    else { g.className = ''; $('#available').classList.add('is-empty'); g.innerHTML = `<div class="quiet"><p><b>Intet tilgængeligt lige nu.</b> Nye ure bliver announced på Instagram først.</p><a href="#contact">Spørg os til at finde et</a></div>`; }
  }

  // sold watches preview (8 most recent); the full list lives on /sold/
  {
    const sold = W.filter(w => w.status === 'sold').slice().reverse();
    if (!sold.length) $('#archive').hidden = true;
    else { $('#archGrid').innerHTML = sold.slice(0, 8).map(card).join(''); $('#allSold').textContent = `Se alle ${sold.length} solgte ure`; }
  }
  const soldHref = D.sold_url || 'sold/'; $$('.js-sold,#allSold').forEach(a => a.href = soldHref);

  // forms + deep links (?watch=... from a watch page, #sell mode)
  forms(() => S.email || 'antonbwehding@gmail.com');
  const ef = $('#enqForm');
  if (ef) { document.addEventListener('click', e => { const t = e.target.closest('[data-mode]'); if (t) ef.__setMode(t.dataset.mode === 'sell'); }); }
  reveal(QA);

  if (QA) {
    const H = innerHeight, top = el => Math.round(el.getBoundingClientRect().top + scrollY), h = document.documentElement;
    const st = [['y', 0], ['y', top($('.intro')) - 64], ['y', top($('#archive')) - 40], ['y', top($('#archive')) + H - 100], ['y', top($('#sell')) - 40], ['y', top($('#contact')) - 40], ['y', h.scrollHeight - H]];
    h.dataset.qaStops = JSON.stringify(st);
    new MutationObserver(() => { const v = h.dataset.qaGoto; if (!v) return; scrollTo(0, +v.split(',')[1]); h.dataset.qaGoto = ''; h.dataset.qaAt = v; }).observe(h, { attributes: true, attributeFilter: ['data-qa-goto'] });
  }
})();
