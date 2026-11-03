// TerraRent: élő óra és napnyugta, munkalap, kapumérő, kupac. Külső könyvtár nincs.
(() => {
  const $ = (id) => document.getElementById(id);
  const mozoghat = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Fejléc: Balassagyarmat, óra, napnyugta (napegyenlet, néhány perc pontos) --- */
  const SZEL = 48.07, HOSSZ = 19.3;
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
    const t = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Budapest' }).format(most);
    const perc = Math.round((napnyugta(most) - most) / 6e4);
    $('allapot').textContent = perc > 0
      ? `Balassagyarmat, ${t}. Napnyugtáig ${Math.floor(perc / 60)} ó ${perc % 60} p. Egy árok még belefér.`
      : `Balassagyarmat, ${t}. A nap lement. Reggel ásunk.`;
  }
  ora();
  setInterval(ora, 3e4);

  /* --- Munkalap: a funnel --- */
  const NEV = { arok: 'Árok', alap: 'Alap', kerites: 'Kerítés', rakodas: 'Föld, sóder, sitt', terep: 'Tereprendezés', mas: 'Valami más' };
  const TANACS = {
    arok: 'Ehhez a kotró kell. 110 cm széles, befér a kapun.',
    alap: 'Ehhez a kotró kell. 2,2 méterig ér le.',
    kerites: 'Az alapot géppel ássuk ki, a kerítést felhúzzuk.',
    rakodas: 'Ehhez a Bobcat kell. Felrakja és odaviszi.',
    terep: 'A kotró és a Bobcat együtt, ha kell.',
    mas: 'Mondd el, megnézzük. Kisebb munkára is kijövünk.',
  };
  const lap = $('lap'), level = $('level'), cs = $('cs');
  let kapuMozgott = false;
  $('lapdatum').textContent = new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

  function frissit() {
    const adat = new FormData(lap);
    const munka = adat.get('munka');
    $('tanacs').textContent = munka ? TANACS[munka] : '';
    const sorok = ['Szia! Ezt kérném:', '', `Munka: ${munka ? NEV[munka] : ''}`, `Hely: ${(adat.get('hely') || '').trim()}`, `Mikor: ${adat.get('mikor') || ''}`];
    if (kapuMozgott) sorok.push(`Kapu szélessége: ${cs.value} cm`);
    sorok.push('', 'A telefonszámom: ');
    const targy = `Ajánlatkérés: ${munka ? NEV[munka] : 'munka'}`;
    level.href = `mailto:ajanlat@terrarent.example?subject=${encodeURIComponent(targy)}&body=${encodeURIComponent(sorok.join('\n'))}`;
  }
  lap.addEventListener('input', frissit);
  frissit();

  /* --- „Inkább ások" --- */
  $('asok').addEventListener('click', () => { $('asokvalasz').textContent = 'Jó. Vasárnap találkozunk.'; });

  /* --- Kapumérő: léptékhelyes, a jelenet 270 cm széles --- */
  const GEP = 110, JELENET = 270;
  function kapu() {
    const c = +cs.value, w = $('kapuk').clientWidth, p = w / JELENET, kozep = w / 2;
    $('bal').style.left = `${kozep - c / 2 * p - 16}px`;
    $('jobb').style.left = `${kozep + c / 2 * p}px`;
    // A gép 110 cm széles és 230 cm magas, a kapuoszlop 200 cm: minden ugyanabban a léptékben
    $('szembol').style.width = `${GEP * p}px`;
    $('szembol').style.height = `${230 * p}px`;
    $('bal').style.height = $('jobb').style.height = `${200 * p}px`;
    $('kapuk').style.height = `${230 * p + 34}px`;
    $('meret').textContent = `${c} cm`;
    const f = c - GEP, it = $('itelet'), ma = $('magy');
    it.classList.toggle('rossz', f < 0);
    if (f >= 5) { it.textContent = 'Átfér.'; ma.textContent = `Marad még ${f} cm. Hívj, és megyünk.`; }
    else if (f >= 0) { it.textContent = 'Épp hogy.'; ma.textContent = 'Szoros, de átfér. Hívj, megnézzük együtt.'; }
    else { it.textContent = 'Nem fér át.'; ma.textContent = `Hiányzik ${-f} cm. Hívj, megnézzük, van-e másik út.`; }
  }
  cs.addEventListener('input', () => { kapuMozgott = true; kapu(); frissit(); });
  addEventListener('resize', kapu);
  kapu();

  /* --- Filckarikák: akkor rajzolódnak ki, amikor odaérsz --- */
  const nyilFigyelo = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('latszik'); nyilFigyelo.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll('.gep').forEach((n) => nyilFigyelo.observe(n));

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
