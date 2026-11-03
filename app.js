// TerraRent: óra, falukereső és térkép, kapumérő, talicskaszámoló, munkalap, kupac. Külső könyvtár nincs.
(() => {
  const $ = (id) => document.getElementById(id);
  const mozoghat = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '+36708566191', OLDAL = 'https://industriestitus.github.io/terrarent/';
  const SMS = (szoveg) => `sms:${TEL}?&body=${encodeURIComponent(szoveg)}`;

  /* --- Óra: Balassagyarmat, elérhetőség, napnyugta --- */
  const SZEL = 48.07, HOSSZ = 19.3;
  // PRÓBA: a munkaidő feltételezett, Bencével egyeztetendő
  const MUNKAIDO = { tol: 7, ig: 18, napok: [1, 2, 3, 4, 5, 6] };
  function napnyugta(d) {
    const rad = Math.PI / 180;
    const n = Math.floor(d.getTime() / 864e5 + 2440587.5 - 2451545.0 + 0.0008);
    const js = n - HOSSZ / 360;
    const m = (357.5291 + 0.98560028 * js) % 360;
    const c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad);
    const l = (m + c + 180 + 102.9372) % 360;
    const tr = 2451545.0 + js + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * l * rad);
    const dek = Math.asin(Math.sin(l * rad) * Math.sin(23.44 * rad));
    const om = Math.acos((Math.sin(-0.83 * rad) - Math.sin(SZEL * rad) * Math.sin(dek)) / (Math.cos(SZEL * rad) * Math.cos(dek)));
    return new Date((tr + om / (2 * Math.PI) - 2440587.5) * 864e5);
  }
  function ora() {
    const most = new Date();
    const r = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false, timeZone: 'Europe/Budapest' }).formatToParts(most).map((p) => [p.type, p.value]));
    const nap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(r.weekday);
    const hivhato = MUNKAIDO.napok.includes(nap) && +r.hour >= MUNKAIDO.tol && +r.hour < MUNKAIDO.ig;
    const perc = Math.round((napnyugta(most) - most) / 6e4);
    const nyugta = perc > 0 ? ` Napnyugtáig ${Math.floor(perc / 60)} ó ${perc % 60} p.` : '';
    $('allapot').textContent = `Balassagyarmat, ${r.hour}:${r.minute}. ${hivhato ? 'Most hívható.' : 'Írj SMS-t, reggel visszahívunk.'}${nyugta}`;
  }
  ora();
  setInterval(ora, 3e4);

  /* --- Következő szabad nap. PRÓBA: ezt majd egy Google-táblázatból olvassa, most kitalált --- */
  const NAPNEV = ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'];
  const szabad = new Date(Date.now() + 2 * 864e5);
  if (szabad.getDay() === 0) szabad.setDate(szabad.getDate() + 1);
  $('szabadnap').textContent = NAPNEV[szabad.getDay()];

  /* --- Falukereső és térkép --- */
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
  const FALU = (window.TERKEP ? window.TERKEP.falvak : []).map(([nev, x, y, km, zona]) => ({ nev, x, y, km, zona, kulcs: norm(nev) }));

  const svg = $('terkep'), NS = 'http://www.w3.org/2000/svg';
  let jelolo = null;
  function el(nev, attr, szulo) {
    const e = document.createElementNS(NS, nev);
    for (const k in attr) e.setAttribute(k, attr[k]);
    if (szulo) szulo.appendChild(e);
    return e;
  }
  if (window.TERKEP) {
    const T = window.TERKEP;
    svg.setAttribute('viewBox', `0 0 ${T.w} ${T.h}`);
    el('image', { href: 'kep/terkep.svg', x: 0, y: 0, width: T.w, height: T.h }, svg);
    el('circle', { cx: T.kx, cy: T.ky, r: T.r30, fill: 'rgba(240,160,32,.07)', stroke: '#F0A020', 'stroke-width': 2.5, 'stroke-dasharray': '10 7' }, svg);
    const felirat = el('text', { x: T.kx, y: T.ky + T.r30 - 12, 'text-anchor': 'middle', 'font-size': 24 }, svg);
    felirat.textContent = '30 km';
    for (const f of FALU) {
      f.pont = el('circle', { class: 'pont', cx: f.x, cy: f.y, r: f.zona === 3 ? 4 : 7, fill: f.zona === 1 ? '#F0A020' : f.zona === 2 ? '#fff' : '#8d8370' }, svg);
      f.pont.addEventListener('click', () => { $('falu').value = f.nev; valaszt(f); });
    }
    const kp = el('circle', { cx: T.kx, cy: T.ky, r: 12, fill: '#F0A020', stroke: '#141414', 'stroke-width': 3 }, svg);
    kp.style.pointerEvents = 'none';
    const kpt = el('text', { x: T.kx + 18, y: T.ky - 14, 'font-size': 28, 'font-weight': 900 }, svg);
    kpt.textContent = 'Balassagyarmat';
    jelolo = el('g', { visibility: 'hidden' }, svg);
    el('circle', { r: 16, fill: 'none', stroke: '#fff', 'stroke-width': 4 }, jelolo);
    el('text', { x: 24, y: 40, 'font-size': 32, 'font-weight': 900 }, jelolo);
  }

  function valaszt(f) {
    $('valasz').hidden = false;
    $('talalat').hidden = true;
    $('falu').setAttribute('aria-expanded', 'false');
    const km = Math.round(f.km);
    if (f.zona === 1) { $('v1').textContent = `${f.nev}: igen.`; $('v2').textContent = 'Nincs kiszállási díj.'; }
    else if (f.zona === 2) { $('v1').textContent = `${f.nev}: igen.`; $('v2').textContent = `Kb. ${km} km légvonalban. A kiszállásról telefonon megállapodunk.`; }
    else { $('v1').textContent = `${f.nev}: hívj.`; $('v2').textContent = `Kb. ${km} km légvonalban, ez már a 30 km-es körön túl van. Megbeszéljük.`; }
    $('v3').textContent = f.nev === 'Balassagyarmat' || f.zona === 3 ? '' : 'Itt még nem ástunk, legyél az első.';
    if (jelolo) {
      jelolo.setAttribute('visibility', 'visible');
      const jobbra = f.x < window.TERKEP.w * .62;
      jelolo.setAttribute('transform', `translate(${f.x} ${f.y})`);
      const t = jelolo.querySelector('text');
      t.textContent = f.nev;
      t.setAttribute('x', jobbra ? 24 : -24);
      t.setAttribute('text-anchor', jobbra ? 'start' : 'end');
    }
    $('hely').value = f.nev;
    frissit();
  }
  function ismeretlen(szo) {
    $('valasz').hidden = false;
    $('v1').textContent = 'Nem találjuk ezt a falut.';
    $('v2').textContent = `„${szo}": hívj, megbeszéljük.`;
    $('v3').textContent = '';
    if (jelolo) jelolo.setAttribute('visibility', 'hidden');
  }
  let talalatok = [], akt = -1;
  function listaz() {
    const q = norm($('falu').value), ul = $('talalat');
    ul.innerHTML = '';
    akt = -1;
    if (!q) { ul.hidden = true; $('falu').setAttribute('aria-expanded', 'false'); return; }
    talalatok = FALU.filter((f) => f.kulcs.includes(q))
      .sort((a, b) => (b.kulcs.startsWith(q) - a.kulcs.startsWith(q)) || a.km - b.km).slice(0, 5);
    for (const f of talalatok) {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.append(Object.assign(document.createElement('span'), { textContent: f.nev }), Object.assign(document.createElement('small'), { textContent: `${Math.round(f.km)} km` }));
      li.addEventListener('pointerdown', (e) => { e.preventDefault(); $('falu').value = f.nev; valaszt(f); });
      ul.appendChild(li);
    }
    ul.hidden = !talalatok.length;
    $('falu').setAttribute('aria-expanded', String(!!talalatok.length));
  }
  $('falu').addEventListener('input', listaz);
  $('falu').addEventListener('blur', () => setTimeout(() => { $('talalat').hidden = true; }, 80));
  $('falu').addEventListener('keydown', (e) => {
    const lik = [...$('talalat').children];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!lik.length) return;
      akt = (akt + (e.key === 'ArrowDown' ? 1 : -1) + lik.length) % lik.length;
      lik.forEach((l, i) => l.setAttribute('aria-selected', i === akt));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const f = talalatok[akt] || talalatok[0], ertek = $('falu').value.trim();
      if (f && ertek) { $('falu').value = f.nev; valaszt(f); $('falu').blur(); }
      else if (ertek) ismeretlen(ertek);
    } else if (e.key === 'Escape') $('talalat').hidden = true;
  });

  /* --- Munkalap: SMS, Viber, email --- */
  const NEV = { arok: 'Árok', alap: 'Alap', kerites: 'Kerítés', rakodas: 'Föld, sóder, sitt', terep: 'Tereprendezés', mas: 'Valami más' };
  const TANACS = {
    arok: 'Ehhez a kotró kell. 110 cm széles, befér a kapun.',
    alap: 'Ehhez a kotró kell. 2,2 méterig ér le.',
    kerites: 'Az alapot géppel ássuk ki, a kerítést felhúzzuk.',
    rakodas: 'Ehhez a homlokrakodó kell.',
    terep: 'A kotró és a homlokrakodó együtt, ha kell.',
    mas: 'Írd le, megnézzük. Kis munkára is kimegyünk.',
  };
  const lap = $('lap'), cs = $('cs');
  let kapuMozgott = false;
  function frissit() {
    const adat = new FormData(lap);
    const munka = adat.get('munka');
    $('tanacs').textContent = munka ? TANACS[munka] : '';
    const sorok = ['Szia! Ezt kérném:', `Munka: ${munka ? NEV[munka] : ''}`, `Hely: ${(adat.get('hely') || '').trim()}`, `Mikor: ${adat.get('mikor') || ''}`];
    if (kapuMozgott) sorok.push(`Kapu szélessége: ${cs.value} cm`);
    const szoveg = sorok.join('\n');
    $('sms').href = SMS(szoveg);
    $('level').href = `mailto:ajanlat@terrarent.example?subject=${encodeURIComponent(`Ajánlatkérés: ${munka ? NEV[munka] : 'munka'}`)}&body=${encodeURIComponent(`${szoveg}\n\nA telefonszámom: `)}`;
  }
  lap.addEventListener('input', frissit);
  frissit();

  /* --- Szomszéd-üzenet --- */
  $('uzen').addEventListener('click', async () => {
    const szoveg = `Szia! Földmunkát csináltatok a TerraRenttel. Ha neked is kell valami, egy napra jönnek, és a megspórolt gépmozgatás a miénk. 06 70 856 6191, ${OLDAL}`;
    if (navigator.share) { try { await navigator.share({ text: szoveg }); } catch (e) { /* a látogató meggondolta magát */ } return; }
    try {
      await navigator.clipboard.writeText(szoveg);
      const k = $('uzenkesz'); k.hidden = false; k.textContent = 'Kimásoltuk az üzenetet, csak illeszd be.';
    } catch (e) { location.href = `sms:?&body=${encodeURIComponent(szoveg)}`; }
  });

  /* --- Kapumérő: minden ugyanabban a léptékben, a jelenet 270 cm széles --- */
  const GEP = 110, JELENET = 270;
  function kapu() {
    const c = +cs.value, w = $('kapuk').clientWidth, p = w / JELENET, kozep = w / 2;
    $('bal').style.left = `${kozep - c / 2 * p - 16}px`;
    $('jobb').style.left = `${kozep + c / 2 * p}px`;
    $('szembol').style.width = `${GEP * p}px`;
    $('szembol').style.height = `${230 * p}px`;
    $('bal').style.height = $('jobb').style.height = `${200 * p}px`;
    $('kapuk').style.height = `${230 * p + 30}px`;
    $('meret').textContent = `${c} cm`;
    const f = c - GEP, it = $('itelet'), ma = $('magy');
    it.classList.toggle('rossz', f < 0);
    if (f >= 5) { it.textContent = 'Átfér.'; ma.textContent = `Marad még ${f} cm.`; }
    else if (f >= 0) { it.textContent = 'Épp hogy.'; ma.textContent = 'Szoros, de átfér. Nézzük meg együtt.'; }
    else { it.textContent = 'Nem fér át.'; ma.textContent = `Hiányzik ${-f} cm. Hívj, megnézzük, van-e másik út.`; }
  }
  cs.addEventListener('input', () => { kapuMozgott = true; kapu(); frissit(); });
  addEventListener('resize', kapu);
  kapu();

  /* --- Talicskaszámoló: 60 literes talicska, lazulás nélkül --- */
  const szam = (id) => { const n = parseFloat($(id).value.replace(',', '.')); return n > 0 ? n : 0; };
  function szamol() {
    const m3 = szam('sz-h') * szam('sz-sz') * szam('sz-m');
    $('sz-m3').textContent = m3.toLocaleString('hu-HU', { maximumFractionDigits: 2 });
    $('sz-db').textContent = Math.ceil(m3 * 1000 / 60 - 1e-9).toLocaleString('hu-HU');
  }
  ['sz-h', 'sz-sz', 'sz-m'].forEach((i) => $(i).addEventListener('input', szamol));
  szamol();

  /* --- Kupac a láblécben: saját, egyszerű fizika. Koppintásra még egy lapátnyi jön. --- */
  const vas = $('kupac'), ctx = vas.getContext('2d');
  const SZIN = ['#6B5233', '#55432B', '#7D6342', '#3F3022', '#8C7350', '#F0A020'];
  let W = 0, H = 0, R = 0, kovek = [], fut = false, lathato = false, szunet = 0;
  function meretez() {
    const d = Math.min(devicePixelRatio || 1, 2), b = vas.getBoundingClientRect();
    W = b.width; H = b.height; R = Math.max(7, W / 62);
    vas.width = W * d; vas.height = H * d;
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function uj(x, y) {
    const r = R * (.55 + Math.random() * .75);
    kovek.push({ x, y, vx: (Math.random() - .5) * 2.4, vy: Math.random() * 2, r, s: Math.random() < .07 ? SZIN[5] : SZIN[Math.floor(Math.random() * 5)], f: Math.random() * 6 });
  }
  function lepes() {
    for (const k of kovek) {
      k.vy += .34; k.x += k.vx; k.y += k.vy;
      if (k.y + k.r > H) { k.y = H - k.r; k.vy *= -.18; k.vx *= .7; }
      if (k.x < k.r) { k.x = k.r; k.vx *= -.4; }
      if (k.x > W - k.r) { k.x = W - k.r; k.vx *= -.4; }
    }
    for (let i = 0; i < kovek.length; i++) for (let j = i + 1; j < kovek.length; j++) {
      const a = kovek[i], b = kovek[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, t2 = dx * dx + dy * dy;
      if (t2 < min * min && t2 > 0) {
        const t = Math.sqrt(t2), nx = dx / t, ny = dy / t, atf = (min - t) * .5;
        a.x -= nx * atf; a.y -= ny * atf; b.x += nx * atf; b.y += ny * atf;
        const v = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (v < 0) { const im = v * .55; a.vx += nx * im; a.vy += ny * im; b.vx -= nx * im; b.vy -= ny * im; }
        a.vx *= .985; b.vx *= .985;
      }
    }
  }
  function rajz() {
    ctx.clearRect(0, 0, W, H);
    for (const k of kovek) {
      ctx.fillStyle = k.s;
      ctx.beginPath();
      for (let a = 0; a < 7; a++) {
        const sz = a / 7 * Math.PI * 2, rr = k.r * (.84 + .18 * Math.sin(k.f + a * 2.3));
        const px = k.x + Math.cos(sz) * rr, py = k.y + Math.sin(sz) * rr;
        a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  function ciklus() {
    if (!lathato) { fut = false; return; }
    if (szunet > 0) { szunet--; uj(W * (.12 + Math.random() * .1), -R); }
    lepes(); lepes(); rajz();
    const mozog = szunet > 0 || kovek.some((k) => Math.abs(k.vy) > .55 || Math.abs(k.vx) > .3);
    if (mozog) requestAnimationFrame(ciklus); else fut = false;
  }
  function indit() { if (!fut && lathato) { fut = true; requestAnimationFrame(ciklus); } }
  function felold() {
    const cel = Math.round(Math.min(150, W * H / (R * R * 9)));
    if (kovek.length) return;
    if (mozoghat) { szunet = cel; indit(); return; }
    for (let i = 0; i < cel; i++) uj(Math.random() * W, H - Math.random() * H * .5);
    for (let i = 0; i < 240; i++) lepes();
    rajz();
  }
  new IntersectionObserver((es) => {
    lathato = es[0].isIntersecting;
    if (lathato) { felold(); indit(); }
  }, { threshold: .2 }).observe(vas);
  vas.addEventListener('pointerdown', (e) => {
    const b = vas.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    for (const k of kovek) {
      const dx = k.x - x, dy = k.y - y, t = Math.hypot(dx, dy) || 1;
      if (t < R * 7) { const e2 = (R * 7 - t) / (R * 7) * 9; k.vx += dx / t * e2; k.vy += dy / t * e2 - 2; }
    }
    if (kovek.length < 220) for (let i = 0; i < 5; i++) uj(x + (Math.random() - .5) * R * 4, -R - i * R);
    fut = false; indit();
  });
  meretez();
  rajz();
  addEventListener('resize', () => { meretez(); rajz(); });
})();
