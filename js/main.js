/* =========================================================
   Bella Ristorante — comportamiento de la página
   Los datos (idioma, textos, enlaces, horario) llegan en window.BELLA,
   que genera build.js a partir de site.config.js y src/i18n.js
   ========================================================= */

(() => {
  const root = document.documentElement;
  root.classList.remove('no-js');

  const { lang, base, t, config: CONFIG } = window.BELLA;

  /* ---------- enlaces de reserva ---------- */
  document.querySelectorAll('[data-reserva]').forEach((a) => { a.href = CONFIG.reservas; });

  /* ---------- nav: fondo al hacer scroll y ocultar al bajar ---------- */
  const nav = document.getElementById('nav');
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    const goingDown = y > lastY && y > 400;
    if (!document.body.classList.contains('menu-open')) nav.classList.toggle('is-hidden', goingDown);
    if (langBox?.classList.contains('is-open') && Math.abs(y - lastY) > 2) setLang(false);
    lastY = y;
  };

  /* ---------- selector de idioma ---------- */
  const langBox = document.getElementById('lang');
  const langBtn = langBox?.querySelector('.lang__btn');
  const setLang = (open) => {
    langBox.classList.toggle('is-open', open);
    langBtn.setAttribute('aria-expanded', String(open));
  };
  if (langBox) {
    langBtn.addEventListener('click', (e) => { e.stopPropagation(); setLang(!langBox.classList.contains('is-open')); });
    document.addEventListener('click', (e) => { if (!langBox.contains(e.target)) setLang(false); });
    langBox.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { setLang(false); langBtn.focus(); }
    });
  }
  // al cambiar de idioma se mantiene la sección en la que estaba el visitante
  document.querySelectorAll('[data-lang-link]').forEach((a) => {
    a.addEventListener('click', () => {
      if (location.hash) a.href = a.href.split('#')[0] + location.hash;
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- menú móvil ---------- */
  const toggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? t.closeMenu : t.openMenu);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    if (open) nav.classList.remove('is-hidden');
  };
  toggle.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  mobileMenu.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- apariciones al hacer scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- sección actual en el nav ---------- */
  const navLinks = [...document.querySelectorAll('.nav__links a')];
  const sections = navLinks.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => sectionIO.observe(s));

  /* ---------- platos: imagen que cambia ---------- */
  const dishes = [...document.querySelectorAll('.dish')];
  const stageImgs = [...document.querySelectorAll('.dishes__frame img')];
  const activate = (key) => {
    dishes.forEach((d) => d.classList.toggle('is-active', d.dataset.key === key));
    stageImgs.forEach((img) => img.classList.toggle('is-active', img.dataset.key === key));
  };
  dishes.forEach((d) => {
    d.addEventListener('mouseenter', () => activate(d.dataset.key));
    d.addEventListener('focus', () => activate(d.dataset.key));
  });
  // al hacer scroll también avanza (útil en pantallas táctiles y lectura lineal)
  const dishIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) activate(entry.target.dataset.key); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  dishes.forEach((d) => dishIO.observe(d));

  /* ---------- carta: pestañas accesibles ---------- */
  const tabsEl = document.getElementById('menuTabs');
  const panelsEl = document.getElementById('menuPanels');

  const initTabs = () => {
    const tabs = [...tabsEl.querySelectorAll('[role="tab"]')];
    const selectTab = (tab, focus) => {
      tabs.forEach((tb) => {
        const on = tb === tab;
        tb.setAttribute('aria-selected', String(on));
        tb.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(tb.getAttribute('aria-controls'));
        panel.hidden = !on;
        panel.classList.toggle('is-active', on);
      });
      if (focus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', (e) => {
        const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        selectTab(tabs[(i + dir + tabs.length) % tabs.length], true);
      });
    });
  };

  /* ---------- carta: refrescar desde la hoja de cálculo ---------- */
  // La carta ya viene escrita en el HTML (buena para SEO). Si hay una hoja de Google
  // configurada, se vuelve a pintar con los datos más recientes.
  const parseCSV = (text) => {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); rows.push(row); row = []; field = '';
      } else field += c;
    }
    if (field || row.length) { row.push(field); rows.push(row); }
    return rows.filter((r) => r.some((v) => v.trim()));
  };

  const norm = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const formatPrice = (p) => {
    const v = p.trim();
    if (!v) return '';
    const n = Number(v.replace('€', '').replace(',', '.').trim());
    if (Number.isNaN(n)) return v;
    return (Number.isInteger(n) ? String(n) : n.toFixed(2).replace('.', ',')) + ' €';
  };

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  };

  const renderMenu = (rows) => {
    const head = rows[0].map(norm);
    const col = (name) => head.indexOf(name);
    const iCat = col('categoria'), iName = col('plato'),
      iPrice = col('precio'), iTag = col('etiqueta'), iVis = col('visible');
    // descripción en el idioma de la página; si falta, en español
    const iDesc = [col('descripcion_' + lang), col('descripcion_es'), col('descripcion')].filter((i) => i >= 0);
    if (iCat < 0 || iName < 0) throw new Error('Faltan columnas "categoria" o "plato"');

    const groups = new Map();
    rows.slice(1).forEach((r) => {
      const cat = (r[iCat] || '').trim();
      const name = (r[iName] || '').trim();
      const vis = iVis >= 0 ? norm(r[iVis] || 'si') : 'si';
      if (!cat || !name || vis === 'no') return;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push({
        name,
        desc: iDesc.map((i) => (r[i] || '').trim()).find(Boolean) || '',
        price: iPrice >= 0 ? formatPrice(r[iPrice] || '') : '',
        tag: iTag >= 0 ? (r[iTag] || '').trim() : '',
      });
    });
    if (!groups.size) throw new Error('La carta está vacía');

    tabsEl.replaceChildren();
    panelsEl.replaceChildren();
    [...groups.entries()].forEach(([cat, items], i) => {
      const id = 'cat-' + i;
      const tab = el('button', '', cat);
      tab.setAttribute('role', 'tab');
      tab.setAttribute('lang', 'it');
      tab.id = 't-' + id;
      tab.setAttribute('aria-controls', 'm-' + id);
      tab.setAttribute('aria-selected', String(i === 0));
      tab.tabIndex = i === 0 ? 0 : -1;
      tabsEl.append(tab);

      const panel = el('div', 'menu__panel' + (i === 0 ? ' is-active' : ''));
      panel.setAttribute('role', 'tabpanel');
      panel.id = 'm-' + id;
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = i !== 0;
      items.forEach((it) => {
        const art = el('article', 'item');
        art.append(el('h3', '', it.name));
        if (it.desc) art.append(el('p', '', it.desc));
        if (it.price) art.append(el('span', 'item__price', it.price));
        if (it.tag) {
          const tag = el('span', 'tag', it.tag);
          tag.setAttribute('lang', 'it');
          art.append(tag);
        }
        panel.append(art);
      });
      panelsEl.append(panel);
    });
  };

  const loadMenu = async () => {
    const url = CONFIG.cartaCsv || base + 'data/carta.csv';
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(url + sep + 't=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      renderMenu(parseCSV(await res.text()));
    } catch (err) {
      // si falla, se queda la carta escrita en el HTML
      console.warn('Carta: usando la versión del HTML.', err);
    }
    initTabs();
  };
  loadMenu();

  if (CONFIG.cartaPdf) {
    const pdf = document.getElementById('menuPdf');
    pdf.querySelector('a').href = CONFIG.cartaPdf;
    pdf.hidden = false;
  }

  /* ---------- horario: resaltar el día de hoy (hora de Barcelona) ---------- */
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'short' }).format(new Date());
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  document.querySelectorAll('#hours tr').forEach((tr) => tr.classList.toggle('is-today', Number(tr.dataset.day) === today));
})();
