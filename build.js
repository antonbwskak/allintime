// All in Time build. Runs automatically on Netlify (see netlify.toml). Locally: node build.js
// 1. Reads every watch the CMS saves in content/watches/*.json
// 2. Writes content/watches.json + content/data.js (used by the home page)
// 3. Generates a real page for every watch at /watch/<name>/ with its own link, SEO and share preview
// 4. Writes sitemap.xml and robots.txt
const fs = require('fs'), path = require('path');
const ROOT = __dirname;
const PREVIEW = !!process.env.PREVIEW; // preview hosts without clean URLs: link to .../index.html
const read = p => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const kr = new Intl.NumberFormat('da-DK');
const V = Date.now();

const settings = read('content/settings.json');
const site = (settings.site_url || '').replace(/\/$/, '');
const ig = (settings.instagram || 'allintime.dk').replace(/^@/, '');
const email = settings.email || '';

// ---- watches
const dir = path.join(ROOT, 'content', 'watches');
const used = new Set();
const watches = fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => {
  const w = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  w.file = f;
  w.images = (w.images || []).filter(Boolean);
  return w;
}).filter(w => w.model && w.brand)
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
for (const w of watches) {
  let s = slugify(`${w.brand} ${w.model}`) || 'watch', n = 2;
  while (used.has(s)) s = `${slugify(`${w.brand} ${w.model}`)}-${n++}`;
  used.add(s); w.slug = s;
  w.url = `watch/${s}/${PREVIEW ? 'index.html' : ''}`;
}

const statusText = w => ({ available: 'Tilgængelig', reserved: 'Reserveret', sold: 'Solgt' }[w.status] || 'Tilgængelig');
const priceText = w => w.status === 'sold' ? 'Solgt' : (w.price_mode === 'price' && w.price_dkk ? `DKK ${kr.format(w.price_dkk)}` : 'Pris på forespørgsel');
const pos = w => `${w.focus_x ?? 50}% ${w.focus_y ?? 50}%`;
const rel = p => (p || '').replace(/^\//, '');

// ---- data for the home page
const built = new Date().toISOString();
const soldUrl = `sold/${PREVIEW ? 'index.html' : ''}`;
fs.writeFileSync(path.join(ROOT, 'content', 'watches.json'), JSON.stringify({ watches, built }, null, 2));
fs.writeFileSync(path.join(ROOT, 'content', 'data.js'), 'window.__AIT = ' + JSON.stringify({ watches, settings, built, sold_url: soldUrl }) + ';\n');

// ---- watch pages
const R = '../../';
const home = R + (PREVIEW ? 'index.html' : '');
const header = `<header class="top" data-qa-ignore>
  <a href="${home}" class="brand" aria-label="All in Time, home"><img src="${R}assets/logo-word.png" alt="All in Time" width="160" height="32"></a>
  <nav aria-label="Main"><a href="${R}${soldUrl}">Solgte ure</a><a href="${home}#sell">Sælg eller byt</a><a href="#enquire" class="pill">Skriv til os</a></nav>
</header>`;
const footer = `<footer class="foot">
  <div class="wrap fcols">
    <img src="${R}assets/logo.png" alt="All in Time" class="flogo" width="150" height="114">
    <div><p class="label light">Kontakt</p>${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a><br>` : ''}<a href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">Instagram</a></div>
    <div><p class="label light">Besøg</p>${esc(settings.viewings || '')}<br>${esc(settings.location || '')}</div>
    <div><p class="label light">Udforsk</p><a href="${R}${soldUrl}">Solgte ure</a><br><a href="${home}#sell">Sælg eller byt</a></div>
  </div>
  <div class="wrap fbig" aria-hidden="true"><img src="${R}assets/logo-word.png" alt="" loading="lazy"></div>
  <div class="wrap fine"><span>© ${new Date().getFullYear()} All in Time</span><a href="#">Til toppen</a></div>
</footer>`;
const card = w => `<a class="card" href="${R}${esc(w.url)}">
  <div class="ph"><img src="${R}${esc(rel(w.images[0]))}" alt="${esc(w.brand + ' ' + w.model)}" loading="lazy" style="object-position:${pos(w)}"></div>
  <div class="cap"><span class="b">${esc(w.brand)}</span><span class="st ${w.status === 'available' ? 'avail' : w.status === 'reserved' ? 'res' : ''}">${esc(statusText(w))}</span></div>
  <h3>${esc(w.model)}</h3>${w.status !== 'sold' ? `<p class="pr">${esc(priceText(w))}</p>` : ''}${w.description ? `<p class="ds">${esc(w.description)}</p>` : ''}
</a>`;

function page(w, i) {
  const name = `${w.brand} ${w.model}`;
  const sold = w.status === 'sold';
  const img0 = w.images[0] || '';
  const abs = p => site ? site + '/' + rel(p) : rel(p);
  const canonical = site ? `${site}/watch/${w.slug}/` : '';
  const desc = (w.description || `${name}${w.reference ? ', reference ' + w.reference : ''}${w.year ? ', ' + w.year : ''}. ${sold ? 'Sold' : priceText(w)} at All in Time, pre-loved watches in Denmark.`).slice(0, 300);
  const specs = [['Brand', w.brand], ['Model', w.model], ['Reference', w.reference], ['Year', w.year], ['Box & papers', w.set], ['Condition', w.condition], ['Status', statusText(w)]].filter(r => r[1]);
  const sameBrand = watches.filter(x => x !== w && x.brand === w.brand);
  const others = watches.filter(x => x !== w && x.brand !== w.brand);
  const more = [...watches.filter(x => x !== w && x.status !== 'sold'), ...sameBrand, ...others].filter((x, k, a) => a.indexOf(x) === k).slice(0, 4);
  const prev = watches[(i - 1 + watches.length) % watches.length], next = watches[(i + 1) % watches.length];
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name, brand: { '@type': 'Brand', name: w.brand },
    description: desc, image: w.images.map(abs), sku: w.reference || undefined, itemCondition: 'https://schema.org/UsedCondition',
    offers: { '@type': 'Offer', priceCurrency: 'DKK', availability: sold ? 'https://schema.org/SoldOut' : w.status === 'reserved' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock', ...(w.price_mode === 'price' && w.price_dkk && !sold ? { price: w.price_dkk } : {}), seller: { '@type': 'Organization', name: 'All in Time' } }
  };
  return `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(name)}${w.reference ? ' ' + esc(w.reference) : ''} · All in Time</title>
<meta name="description" content="${esc(desc)}">
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(name)} · All in Time">
<meta property="og:description" content="${esc(sold ? 'Solgt. Leder du efter et lignende? Spørg os.' : priceText(w) + '. Brugt, fra Danmark.')}">
<meta property="og:image" content="${esc(abs(img0))}">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0e3725">
<link rel="icon" href="${R}assets/logo-mark.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${R}styles.css?v=${V}">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="wpage">
${header}
<main>
  <nav class="crumbs wrap" aria-label="Breadcrumb"><a href="${home}">All in Time</a><span>/</span>${sold ? `<a href="${R}${soldUrl}">Solgte ure</a>` : `<a href="${home}#available">Ure</a>`}<span>/</span><span aria-current="page">${esc(name)}</span></nav>
  <section class="wp wrap">
    <div class="gal">
      <div class="gmain" id="gmain"><img id="gimg" src="${R}${esc(rel(img0))}" alt="${esc(name)}" style="object-position:${pos(w)}" fetchpriority="high"></div>
      ${w.images.length > 1 ? `<div class="gthumbs" role="list">${w.images.map((p, k) => `<button type="button" role="listitem" data-src="${R}${esc(rel(p))}" aria-label="Foto ${k + 1} af ${w.images.length}"${k === 0 ? ' aria-current="true"' : ''}><img src="${R}${esc(rel(p))}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    </div>
    <aside class="info">
      <p class="label">${esc(w.brand)}</p>
      <h1 class="display">${esc(w.model)}</h1>
      ${(w.reference || w.year) ? `<p class="sub">${[w.reference && 'Ref. ' + esc(w.reference), esc(w.year)].filter(Boolean).join(' · ')}</p>` : ''}
      <div class="pricebox"><span class="price">${esc(priceText(w))}</span>${!sold ? `<span class="badge ${w.status}">${esc(statusText(w))}</span>` : ''}</div>
      ${sold ? `<p class="soldnote">Dette ur har fundet en ny ejer. Vi finder jævnligt lignende ure, så spørg — så holder vi øje.</p>` : ''}
      <div class="actions"><a class="btn" href="#enquire">${sold ? 'Find mig et lignende' : 'Spørg om dette ur'}</a><a class="tlink" href="https://www.instagram.com/${esc(ig)}/" target="_blank" rel="noopener">eller skriv på Instagram</a></div>
      ${w.description ? `<p class="body wdesc">${esc(w.description)}</p>` : ''}
      <dl class="specs">${specs.map(r => `<div><dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd></div>`).join('')}</dl>
      <ul class="assure">${settings.viewings ? `<li>${esc(settings.viewings)}${settings.location ? ', ' + esc(settings.location) : ''}</li>` : ''}<li>Alle spørgsmål besvares personligt${email ? ` på <a href="mailto:${esc(email)}">${esc(email)}</a>` : ''}</li></ul>
    </aside>
  </section>

  <section id="enquire" class="wp-enq">
    <div class="wrap wp-enq-in">
      <div>
        <p class="label light">${sold ? 'Find et lignende' : 'Skriv til os'}</p>
        <h2 class="display">${sold ? 'Leder du efter et lignende?' : 'Interesseret i dette ur?'}</h2>
        <p class="lead">${sold ? 'Fortæl os hvad der betyder noget for dig — reference, årstal eller skive — så giver vi besked når vi finder et.' : 'Spørg om hvad som helst, eller aftal en besigtigelse. Du hører personligt svar, som regel samme dag.'}</p>
      </div>
      <form name="contact" method="POST" action="/" data-netlify="true" netlify-honeypot="company" class="form dark js-form">
        <input type="hidden" name="form-name" value="contact">
        <input type="hidden" name="topic" value="Enquiry">
        <p class="hp"><label>Firma <input name="company"></label></p>
        <div class="row2"><label>Navn<input name="name" required autocomplete="name"></label><label>Email<input name="email" type="email" required autocomplete="email"></label></div>
        <label>Ur<input name="watch" data-fixed="1" value="${esc(name)}${w.reference ? ' (' + esc(w.reference) + ')' : ''}${sold ? ', eller lignende' : ''}"></label>
        <label>Besked<textarea name="message" rows="4" required placeholder="${sold ? 'Hvad leder du efter? Budget, år, skive, boks og papirer…' : 'Dit spørgsmål, eller hvornår du gerne vil se det'}"></textarea></label>
        <button class="btn light" type="submit">Send</button>
        <p class="status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>

  <section class="wp-more wrap" aria-label="Flere ure">
    <div class="shead split"><div><p class="label">Mere fra All in Time</p><h2 class="display">Du synes måske også om</h2></div>
      <div class="pn"><a href="${R}${esc(prev.url)}" rel="prev">← ${esc(prev.brand)} ${esc(prev.model)}</a><a href="${R}${esc(next.url)}" rel="next">${esc(next.brand)} ${esc(next.model)} →</a></div></div>
    <div class="grid">${more.map(card).join('')}</div>
  </section>
</main>
${footer}
<script src="${R}assets/common.js?v=${V}"></script>
<script>
(() => {
  const g = document.getElementById('gmain'), img = document.getElementById('gimg');
  document.querySelectorAll('.gthumbs button').forEach(b => b.addEventListener('click', () => {
    img.src = b.dataset.src;
    document.querySelectorAll('.gthumbs button').forEach(x => x.setAttribute('aria-current', x === b));
    g.dispatchEvent(new Event('swap'));
  }));
  AIT.forms(() => ${JSON.stringify(email)});
})();
</script>
</body>
</html>`;
}

const wdir = path.join(ROOT, 'watch');
fs.rmSync(wdir, { recursive: true, force: true });
watches.forEach((w, i) => {
  const d = path.join(wdir, w.slug); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), page(w, i));
});


// ---- sold watches page (/sold/)
{
  const soldList = watches.filter(w => w.status === 'sold').slice().reverse();
  const brands = [...new Set(soldList.map(w => w.brand))];
  const html = `<!doctype html>
<html lang="da">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Solgte ure · All in Time</title>
<meta name="description" content="${soldList.length} brugte ure All in Time har solgt: ${esc(brands.join(', '))}. Leder du efter et lignende? Spørg os.">
${site ? `<link rel="canonical" href="${site}/sold/">` : ''}
<meta property="og:title" content="Solgte ure · All in Time">
<meta property="og:image" content="${esc(site ? site + '/' + rel(soldList[0]?.images[0]) : rel(soldList[0]?.images[0]))}">
<meta name="theme-color" content="#0e3725">
<link rel="icon" href="${R}assets/logo-mark.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${R}styles.css?v=${V}">
</head>
<body class="soldpage">
${header}
<main>
  <section class="shero wrap">
    <div><p class="label">Arkiv · ${soldList.length} ure</p><h1 class="display">Solgte ure</h1></div>
    <p class="body narrow">Hvert ur der er gået gennem All in Time, fotograferet som det var. Leder du efter et lignende? Fortæl os det — så holder vi øje.</p>
  </section>
  <section class="sold-list wrap" aria-label="Alle solgte ure">
    <div class="filters" role="tablist" aria-label="Filtrer efter mærke">
      <button role="tab" aria-selected="true" data-b="">Alle<span>${soldList.length}</span></button>${brands.map(x => `<button role="tab" aria-selected="false" data-b="${esc(x)}">${esc(x)}<span>${soldList.filter(w => w.brand === x).length}</span></button>`).join('')}
    </div>
    <div class="grid" id="soldGrid">${soldList.map(w => card(w).replace('<a class="card"', `<a class="card" data-brand="${esc(w.brand)}"`)).join('')}</div>
    <div class="sold-cta"><h2 class="display">Leder du efter et lignende?</h2><a class="btn" href="${home}#contact">Spørg os til at finde et</a></div>
  </section>
</main>
${footer}
<script src="${R}assets/common.js?v=${V}"></script>
<script>
(() => {
  const bs = [...document.querySelectorAll('.filters button')], cs = [...document.querySelectorAll('#soldGrid .card')];
  bs.forEach(b => b.addEventListener('click', () => { bs.forEach(x => x.setAttribute('aria-selected', x === b)); cs.forEach(c => c.hidden = !!b.dataset.b && c.dataset.brand !== b.dataset.b); }));
  if (new URLSearchParams(location.search).has('qa')) { const h = document.documentElement, H = innerHeight; h.dataset.qa = ''; const t = document.getElementById('soldGrid').getBoundingClientRect().top + scrollY;
    h.dataset.qaStops = JSON.stringify([['y', 0], ['y', Math.round(t - 80)], ['y', Math.round(t + H)], ['y', h.scrollHeight - H]]);
    new MutationObserver(() => { const v = h.dataset.qaGoto; if (!v) return; scrollTo(0, +v.split(',')[1]); h.dataset.qaGoto = ''; h.dataset.qaAt = v; }).observe(h, { attributes: true, attributeFilter: ['data-qa-goto'] });
    h.dataset.qaReady = '1'; }
})();
</script>
</body>
</html>`;
  const d = path.join(ROOT, 'sold'); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'index.html'), html.split(R).join('../')); // one folder deep
}

// ---- sitemap + robots
if (site) {
  const urls = ['', 'sold/', ...watches.map(w => `watch/${w.slug}/`)];
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${site}/${u}</loc><lastmod>${built.slice(0, 10)}</lastmod></url>`).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nDisallow: /admin/\n${site ? `Sitemap: ${site}/sitemap.xml\n` : ''}`);

// ---- cache-bust home page assets
const idx = path.join(ROOT, 'index.html');
fs.writeFileSync(idx, fs.readFileSync(idx, 'utf8').replace(/(styles\.css|app\.js|content\/data\.js|assets\/common\.js)(\?v=\d+)?"/g, `$1?v=${V}"`));

console.log(`Built ${watches.length} watches${PREVIEW ? ' (preview links)' : ''}`);
