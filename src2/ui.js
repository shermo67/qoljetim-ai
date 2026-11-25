/* =====================================================================
   Баптаулар
   ===================================================================== */
// Google Forms сілтемесі берілгенде осында жазылады. Бос болса, «Пікір қалдыру» батырмасы көрсетілмейді.
const FEEDBACK_URL = window.QJ_FEEDBACK_URL || '';
const APP_VER = '2.1';

/* =====================================================================
   Ортақ көмекшілер
   ===================================================================== */
const state = { lessonPreview: null, editMode: false, run: null, candFilter: '' };
const students = () => { let s = Store.get('students', null); if (!s) { s = [{ id: 's1', name: 'Оқушы', note: '' }]; Store.set('students', s); } return s; };
const studentName = id => id === 'link' ? 'Оқушы (сілтеме арқылы)' : id === 'preview' ? 'Алдын ала қарау' : (students().find(s => s.id === id) || { name: 'Оқушы' }).name;
const getLesson = () => migrateLesson(Store.get('lesson', null));

const RULES_VER = 4;
function getDraft() {
  const d0 = Store.get('draft', null);
  if (d0 && d0.rulesVer !== RULES_VER) { d0.rulesVer = RULES_VER; if (d0.approved) { d0.approved = false; d0.approvedAt = 0; d0.needReapprove = true; } Store.set('draft', d0); }
  return d0 || { supports: {}, custom: {}, criterion: '', method: '', studentId: 's1', approved: false, approvedAt: 0, stageIdx: null, rulesVer: RULES_VER };
}
function saveDraft(d, keepApproval = false) { if (!keepApproval) { d.approved = false; d.approvedAt = 0; } d.rulesVer = RULES_VER; Store.set('draft', d); }

/* --- Жазылған дауыстар ---
   1) Кірістірілген демо-жазбалар (математика, 3 тапсырма): адам дауысымен «Қысқа нұсқаулық» + «Қарапайым тіл» мәтіні оқылған.
      Сондықтан олар тек осы екі қолдау таңдалып, мәтін өзгертілмегенде ғана қолданылады.
   2) Мұғалім осы құрылғыда өзі жазған дауыс: жазу кезіндегі мәтін қазіргі мәтінмен сәйкес келсе ғана ойнатылады. */
const localRecs = () => Store.get('recs', {});
function recKindFor(it, S, c) {
  const lr = localRecs()[it.id]; if (lr && lr.text === speechCore(it)) return 'local';
  const em = (window.QJ_AUDIO || {})[it.id];
  if (em && S.short && S.simple && !(c && (c.instruction != null || c.explain != null || c.question != null))) return 'embed';
  return '';
}
function itemsFromTasks(tasks, S, custom) {
  return (tasks || []).filter(t => t.selected !== false && !validateTask(t)).map(t => {
    const base = adaptTask(t, S); const c = (custom || {})[base.id] || {};
    const it = { ...base };
    ['instruction', 'question', 'explain', 'hints'].forEach(k => { if (c[k] != null) it[k] = c[k]; });
    if (c.visualText != null && S.visual) it.visual = c.visualText ? { kind: 'text', text: c.visualText } : null;
    it.edited = !!Object.keys(c).length; it.recKind = recKindFor(it, S, c);
    return it;
  });
}
function draftItems(L, d) { return itemsFromTasks((L?.tasks || []).filter(t => t.selected), d.supports || {}, d.custom); }
function draftTasks(L) { return (L?.tasks || []).filter(t => t.selected && !validateTask(t)); }
const draftCriterion = d => d.criterion || CRITERION_DEFAULT;
const draftMethod = d => d.method || methodText(d.supports || {});
/* Ойнатуға болатын жазба (оқушы жағында, ойнату сәтінде тексеріледі) */
function playableRec(it, S) {
  const lr = localRecs()[it.id]; if (lr && lr.text === speechCore(it)) return lr.data;
  const em = (window.QJ_AUDIO || {})[it.id];
  if (em && (it.recKind === 'embed' || (it.recKind == null && S.short && S.simple))) return em;
  return null;
}

/* Сілтеме арқылы беру: деректер сығылып, сілтеменің ішіне жазылады (сервер жоқ) */
async function packData(obj) {
  const json = new TextEncoder().encode(JSON.stringify(obj));
  if (typeof CompressionStream === 'undefined') return 'j' + bufToB64(json.buffer).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const buf = await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
  return 'z' + bufToB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function unpackData(s) {
  const kind = s[0]; let b = s.slice(1).replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  const buf = b64ToBuf(b);
  if (kind === 'j') return JSON.parse(new TextDecoder().decode(buf));
  const txt = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
  return JSON.parse(txt);
}
const baseUrl = () => location.href.split('#')[0];
async function copyText(txt) { try { await navigator.clipboard.writeText(txt); return true; } catch (e) { return false; } }

/* Сынақ жолы (гид) */
const tour = () => Store.get('tour', { on: false });
function markTour(k) { const t = tour(); if (!t[k]) { t[k] = true; Store.set('tour', t); updateTourPanel(); } }
function tourSteps() {
  const L = getLesson(), d = getDraft(), t = tour(); const as = Store.get('assignments', {}); const res = Store.get('results', []).filter(r => !r.preview);
  const sent = Object.keys(as).length > 0;
  const steps = [
    { text: 'Дайын сабақты таңдаңыз немесе өз ҚМЖ-ңызды (.docx) жүктеңіз.', go: '/t/upload', done: !!(L || state.lessonPreview) },
    { text: 'ЕББҚ оқушысына берілетін тапсырмаларды белгілеп, «Сақтау және бейімдеуге өту» батырмасын басыңыз.', go: '/t/upload', done: !!(L && L.tasks.some(x => x.selected)) },
    { text: 'Оқушыға қажет қолдау түрлерін таңдаңыз (бірнешеуін таңдауға болады).', go: '/t/adapt', done: Object.values(d.supports || {}).some(Boolean) },
    { text: 'Бейімделген нұсқаны тексеріңіз: «Өңдеу» арқылы түзетіңіз немесе «Оқушы көрінісі» арқылы қараңыз.', go: '/t/adapt', done: !!d.reviewed },
    { text: '«Бекіту» батырмасын басыңыз. Тапсырма ортақ ҚМЖ-ға кіріктіріледі.', go: '/t/adapt', done: !!d.approved },
    { text: '«Осы құрылғыда жіберу» батырмасын басып, оқушы кабинетіне өтіңіз.', go: sent ? '/s' : '/t/adapt', done: sent && !!t.student },
    { text: 'Оқушы кабинетінде «Әріп өлшемі», «Контраст», «Мәтінді тыңдау», «Қадамдап түсіндіру» құралдарын байқап көріңіз.', go: '/s', done: !!t.tools },
    { text: 'Тапсырмаларды орындап, «Аяқтау» батырмасын басыңыз. Нәтиже мұғалім кабинетінде шығады.', go: '/s', done: res.length > 0 }
  ];
  if (FEEDBACK_URL) steps.push({ text: 'Платформа туралы пікіріңізді қалдырыңыз. Бұл бізге өте маңызды!', go: 'feedback', done: !!t.fb });
  return steps;
}
function updateTourPanel() {
  let el = $('#tour'); const t = tour();
  document.body.classList.toggle('tour-on', !!t.on);
  if (!t.on) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('aside'); el.id = 'tour'; el.setAttribute('aria-label', 'Сынақ жолы'); document.body.appendChild(el); }
  const steps = tourSteps(); const cur = steps.findIndex(s => !s.done); const doneAll = cur < 0;
  const open = t.open !== false;
  el.className = 'tour' + (open ? ' open' : '');
  el.innerHTML = `<div class="tour-h"><button class="tour-toggle" id="tourToggle" aria-expanded="${open}">🧭 Сынақ жолы · ${doneAll ? steps.length : cur}/${steps.length}</button><button class="tour-x" id="tourClose" aria-label="Гидті жабу" title="Гидті жабу">×</button></div>
    ${open ? `<div class="tour-b">${doneAll ? `<p><b>Барлық қадам орындалды! Рақмет!</b></p>${FEEDBACK_URL ? `<a class="btn sm" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener" data-fb="1">${icon('star')}Пікір қалдыру</a>` : ''}`
      : `<p class="tour-now"><b>${cur + 1}-қадам.</b> ${esc(steps[cur].text)}</p><button class="btn sm" id="tourGo">${icon('right')}Осы қадамға өту</button>`}
      <details class="tour-all"><summary>Барлық қадамдар</summary><ol class="tour-list">${steps.map((s, i) => `<li class="${s.done ? 'd' : i === cur ? 'c' : ''}">${s.done ? '✓ ' : ''}${esc(s.text.split('.')[0])}</li>`).join('')}</ol>
      <button class="linkbtn" id="tourRestart">Басынан бастау (демо-деректер тазаланады)</button></details></div>` : ''}`;
  $('#tourToggle').onclick = () => { const x = tour(); x.open = !open; Store.set('tour', x); updateTourPanel(); };
  $('#tourClose').onclick = () => { const x = tour(); x.on = false; Store.set('tour', x); updateTourPanel(); };
  $('#tourGo') && ($('#tourGo').onclick = () => { const g = steps[cur].go; if (g === 'feedback') { window.open(FEEDBACK_URL, '_blank', 'noopener'); markTour('fb'); } else go(g); });
  $('#tourRestart') && ($('#tourRestart').onclick = () => { if (!confirm('Барлық демо-деректер өшіріліп, сынақ басынан басталсын ба?')) return; Store.clearAll(); state.lessonPreview = null; Store.set('tour', { on: true, open: true }); go('/t/upload'); });
}
function startTour() { Store.set('tour', { ...tour(), on: true, open: true }); go(getLesson() ? '/t/dash' : '/t/upload'); }
document.addEventListener('click', e => { if (e.target.closest('[data-fb]')) markTour('fb'); });

/* =====================================================================
   Маршрутизация
   ===================================================================== */
function go(path) { if (location.hash !== '#' + path) location.hash = path; else render(); }
window.addEventListener('hashchange', () => render());
window.addEventListener('storage', e => {
  if (!e.key || !e.key.startsWith('qj_')) return; const p = location.hash.slice(1);
  if (p.startsWith('/t/') && !state.editMode && !state.lessonPreview) { render(); if (e.key === 'qj_results') toast('Оқушыдан жаңа нәтиже келді', 'ok'); }
  else if (p === '/s' || p === '/s/home') render();
  updateTourPanel();
});
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); } });

async function render() {
  const p = location.hash.slice(1) || '/';
  stopSpeech(); closeDlg();
  const app = $('#app');
  document.body.classList.toggle('hc', p.startsWith('/s') && !!Store.get('contrast', false));
  try {
    if (p.startsWith('/s/open/')) return await openAssignmentLink(p.slice(8));
    if (p.startsWith('/t/import/')) return await importResultLink(p.slice(10));
    window.scrollTo(0, 0);
    if (p === '/' || p === '') { app.innerHTML = viewLanding(); bindLanding(); }
    else if (p.startsWith('/t')) { const sec = p.split('/')[2] || 'dash'; app.innerHTML = teacherShell(sec, teacherView(sec)); bindTeacher(sec); }
    else if (p.startsWith('/s')) { const sec = p.split('/')[2] || 'home'; studentRender(sec); }
    else { app.innerHTML = viewLanding(); bindLanding(); }
  } catch (err) {
    console.error(err);
    app.innerHTML = `<main class="wrap"><section class="card mt2"><h2>Бетті ашу кезінде қате шықты</h2><p class="muted">${esc(err.message || err)}</p><button class="btn" data-go="/">${icon('home')}Басты бетке</button></section></main>`;
  }
  updateTourPanel();
}

/* =====================================================================
   Басты бет
   ===================================================================== */
function viewLanding() {
  return `<header class="land-top"><div class="wrap row"><span class="logo"><span class="logo-mark">QJ</span>QolJetim AI</span><span class="spacer"></span>
    <a class="btn ghost sm" href="#how">Қалай жұмыс істейді?</a>${FEEDBACK_URL ? `<a class="btn ghost sm" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener" data-fb="1">Кері байланыс</a>` : ''}</div></header>
  <main>
  <section class="hero2"><div class="wrap">
    <div class="hero-text">
      <span class="tag g">Инклюзивті білім беру · Тегін · Тіркелусіз</span>
      <h1>QolJetim AI</h1>
      <p class="slogan">«Бір сабақ — әр балаға тең мүмкіндік»</p>
      <p class="lead">Мұғалімге ЕББҚ оқушысының тапсырмасын бейімдеуге, оны ортақ ҚМЖ-ға кіріктіруге және оқушының орындауын көруге көмектесетін веб-платформа.</p>
      <div class="hero-btns">
        <button class="btn lg" id="tryBtn">${icon('star')}Платформаны сынап көру</button>
        <button class="btn lg blue" data-go="/t/dash">${icon('teacher')}Мұғалім кабинеті</button>
        <button class="btn lg ghost" data-go="/s">${icon('student')}Оқушы кабинеті</button>
      </div>
      <p class="muted small">«Платформаны сынап көру» батырмасы сізді 5–7 минуттық толық сценарий арқылы қадамдап алып өтеді.</p>
    </div>
  </div></section>

  <section class="wrap sect"><h2>Мүмкіндіктер</h2><div class="feat">
    <div class="card">${icon('file')}<h3>ҚМЖ-мен жұмыс</h3><p>Word форматындағы ҚМЖ-ны жүктеңіз немесе дайын сабақты таңдаңыз. Құжаттағы кез келген жолды тапсырма ретінде алуға болады.</p></div>
    <div class="card">${icon('wand')}<h3>Тапсырманы бейімдеу</h3><p>8 қолдау түрі: қарапайым тіл, қадамдық көмек, көрнекі көмек, дыбыстау, жауап нұсқаларын азайту және т.б. Соңғы шешімді мұғалім қабылдайды.</p></div>
    <div class="card">${icon('student')}<h3>Оқушы кабинеті</h3><p>Әріп өлшемі, контраст, дыбыстау, қадамдық түсіндірме. Есептеу, таңдау, сәйкестендіру, мәтінмен жұмыс тапсырмалары.</p></div>
    <div class="card">${icon('chart')}<h3>Нәтиже мұғалімге</h3><p>Дұрыс жауаптар, әрекет саны, қолданылған көмек. Бұл диагноз емес, мұғалімге арналған педагогикалық ақпарат.</p></div>
  </div></section>

  <section class="wrap sect" id="how"><h2>Қалай жұмыс істейді?</h2>
    <ol class="how">
      <li><b>1</b><span>${icon('upload')}</span><h4>Сабақ</h4><p>Дайын сабақты таңдаңыз немесе өз ҚМЖ-ңызды жүктеңіз.</p></li>
      <li><b>2</b><span>${icon('check')}</span><h4>Тапсырма</h4><p>ЕББҚ оқушысына берілетін тапсырмаларды белгілеңіз немесе өзіңіз қосыңыз.</p></li>
      <li><b>3</b><span>${icon('wand')}</span><h4>Бейімдеу</h4><p>Қолдау түрін таңдап, бастапқы және бейімделген нұсқаны салыстырыңыз.</p></li>
      <li><b>4</b><span>${icon('send')}</span><h4>Бекіту</h4><p>Бекітілген тапсырма ҚМЖ-ға кіріктіріледі және оқушыға жіберіледі.</p></li>
      <li><b>5</b><span>${icon('chart')}</span><h4>Нәтиже</h4><p>Оқушы орындайды, нәтиже мұғалімге қайтады.</p></li>
    </ol>
  </section>

  <section class="wrap sect"><div class="grid2">
    <div class="card"><h3>🔒 Деректер қауіпсіздігі</h3><p>Тіркелу қажет емес. Барлық деректер тек сіздің браузеріңізде сақталады және серверге жіберілмейді.</p><p><b>Оқушылардың нақты аты-жөнін, диагнозын немесе медициналық мәліметтерін енгізбеңіз.</b> Жеке деректерден тазартылған ҚМЖ қолданыңыз.</p></div>
    <div class="card"><h3>ℹ️ Ашық айтамыз</h3><p>Бейімдеу қазір <b>ережеге негізделген алгоритм</b> арқылы жүреді, тілдік модель (ЖИ) әзірге қолданылмайды. Әр ұсынысты мұғалім тексеріп, бекітеді.</p><p>Тестілік нұсқада тапсырманы басқа құрылғыға <b>сілтеме арқылы</b> жіберуге болады.</p></div>
  </div></section>
  ${FEEDBACK_URL ? `<section class="wrap sect"><div class="card fbcard"><div><h3>Кері байланыс</h3><p>Платформаны сынап көрдіңіз бе? Пікіріңіз бізге оны жақсартуға көмектеседі.</p></div><a class="btn lg" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener" data-fb="1">${icon('star')}Пікір қалдыру</a></div></section>` : ''}
  </main>
  <footer class="wrap foot2">QolJetim AI · ${APP_VER} · Кейс: «Инклюзивті білім беру» · <a href="https://github.com/shermo67/qoljetim-ai" target="_blank" rel="noopener">GitHub</a></footer>`;
}
function bindLanding() { $('#tryBtn').onclick = startTour; }

/* =====================================================================
   МҰҒАЛІМ КАБИНЕТІ
   ===================================================================== */
const T_NAV = [['dash', 'Басты бет', 'home'], ['upload', 'Сабақ және ҚМЖ', 'upload'], ['adapt', 'Тапсырманы бейімдеу', 'wand'], ['compare', 'Салыстыру', 'eye'], ['students', 'Оқушылар', 'users'], ['results', 'Нәтижелер', 'chart']];
function teacherShell(sec, body) {
  return `<header class="top"><div class="wrap">
    <button class="logo" data-go="/" aria-label="Басты бетке"><span class="logo-mark">QJ</span>QolJetim AI</button>
    <span class="tag g">Мұғалім</span>
    <nav class="nav" aria-label="Мұғалім мәзірі">${T_NAV.map(([k, t, i]) => `<button data-go="/t/${k}" class="${k === sec ? 'on' : ''}" ${k === sec ? 'aria-current="page"' : ''}>${icon(i)}${t}</button>`).join('')}</nav>
    <span class="spacer"></span>
    ${FEEDBACK_URL ? `<a class="btn soft sm" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener" data-fb="1">${icon('star')}Пікір қалдыру</a>` : ''}
    <button class="btn ghost sm" data-go="/">${icon('out')}Шығу</button>
  </div></header><main class="wrap" id="tmain">${body}</main>`;
}
function teacherView(sec) { return ({ dash: tDash, upload: tUpload, adapt: tAdapt, compare: tCompare, students: tStudents, results: tResults }[sec] || tDash)(); }
function bindTeacher(sec) { ({ upload: bindUpload, adapt: bindAdapt, compare: bindCompare, students: bindStudents, results: bindResults, dash: bindDash }[sec] || (() => { }))(); }

function flowStatus() {
  const L = getLesson(), d = getDraft(), as = Store.get('assignments', {}), res = Store.get('results', []);
  return [
    ['Сабақ таңдалды', !!L],
    ['Тапсырмалар белгіленді', !!(L && L.tasks.some(t => t.selected))],
    ['Қолдау таңдалды', Object.values(d.supports || {}).some(Boolean)],
    ['Мұғалім бекітті', !!d.approved],
    ['ҚМЖ-ға кіріктірілді', !!d.approved],
    ['Оқушыға жіберілді', Object.keys(as).length > 0],
    ['Нәтиже келді', res.length > 0]
  ];
}
function tDash() {
  const L = getLesson(); const fs = flowStatus(); const curI = fs.findIndex(x => !x[1]); const res = Store.get('results', []);
  const next = !L ? ['/t/upload', 'Сабақ таңдаудан бастаңыз', 'upload'] : !getDraft().approved ? ['/t/adapt', 'Тапсырманы бейімдеп, бекітіңіз', 'wand'] : !fs[5][1] ? ['/t/adapt', 'Тапсырманы оқушыға жіберіңіз', 'send'] : ['/t/results', 'Нәтижелерді қарау', 'chart'];
  return `<h1>Қайырлы күн!</h1><p class="muted">QolJetim AI бір сабақтың ішінде ЕББҚ оқушысының тапсырмасын бейімдеуге және нәтижесін көруге көмектеседі. Бөлек жоспар жасалмайды: тапсырма ортақ ҚМЖ-ға кіріктіріледі.</p>
  ${!tour().on ? `<div class="note mt row"><span>Платформамен алғаш танысып жүрсіз бе? Қадамдық гид толық сценарий арқылы алып өтеді.</span><span class="spacer"></span><button class="btn sm" id="dashTour">${icon('star')}Гидті қосу</button></div>` : ''}
  <section class="card mt"><h2>Жұмыс барысы</h2>
    <div class="steps">${fs.map(([t, ok], i) => `<div class="step ${ok ? 'done' : i === curI ? 'cur' : ''}"><b>${ok ? '✓ ' : ''}${i + 1}-қадам</b>${t}</div>`).join('')}</div>
    <div class="row mt"><button class="btn" data-go="${next[0]}">${icon(next[2])}${next[1]}</button></div>
  </section>
  <div class="grid3 mt">
    <section class="card"><h3>Ағымдағы сабақ</h3>${L ? `<p><b>${esc(L.topic || '—')}</b></p><p class="muted small">${esc(L.subject || 'Пән көрсетілмеген')}${L.grade ? ' · ' + esc(L.grade) + '-сынып' : ''}<br>${L.source === 'demo' ? 'Дайын демо-сабақ' : L.fileName ? 'Файл: ' + esc(L.fileName) : 'Қолмен енгізілді'} · ${L.tasks.filter(t => t.selected).length} тапсырма</p>` : '<p class="muted">Әзірге сабақ таңдалмаған.</p>'}</section>
    <section class="card"><h3>Оқушылар</h3><p><b style="font-size:28px">${students().length}</b></p><p class="muted small">Шартты аттар. Диагноз емес, тек оқу қажеттіліктері белгіленеді.</p></section>
    <section class="card"><h3>Нәтижелер</h3><p><b style="font-size:28px">${res.length}</b></p><p class="muted small">Аяқталған орындау саны</p></section>
  </div>
  <section class="card mt2 no-print"><h3>Демо-деректерді тазалау</h3><p class="muted small">Сабақ, бейімдеу, жіберілген тапсырмалар мен нәтижелер осы браузерден өшіріледі. Басқа құрылғыларға әсер етпейді.</p><button class="btn danger sm" id="resetAll">${icon('trash')}Барлық демо-деректерді тазалау</button></section>`;
}
function bindDash() {
  $('#resetAll')?.addEventListener('click', () => { if (confirm('Барлық демо-деректер өшірілсін бе?')) { const t = tour(); Store.clearAll(); if (t.on) Store.set('tour', { on: true, open: true }); state.lessonPreview = null; toast('Деректер тазаланды', 'ok'); render(); } });
  $('#dashTour') && ($('#dashTour').onclick = startTour);
}

/* ---------------- Сабақ және ҚМЖ ---------------- */
function tUpload() {
  const L = state.lessonPreview || getLesson();
  return `<h1>Сабақ және ҚМЖ</h1>
  <section class="card"><h2>Дайын сабақпен сынап көру</h2><p class="muted">Әр сабақта ЕББҚ оқушысына арналған тапсырмалар дайын. Оларды өзгертуге, жаңасын қосуға болады.</p>
    <div class="demos">${DEMO_LESSONS.map(d => `<button class="demo ${L && L.demoKey === d.key ? 'on' : ''}" data-demo="${d.key}"><span class="demo-i" aria-hidden="true">${d.icon}</span><b>${esc(d.subject)} · ${d.grade}-сынып</b><span>${esc(d.title)}</span><small>${esc(d.note)}</small></button>`).join('')}</div>
  </section>
  <section class="card"><h2>Өз ҚМЖ-ңызды жүктеу</h2>
    <div class="note w small">🔒 Құжатта оқушылардың нақты аты-жөні, диагнозы немесе медициналық мәліметі болмауы керек. Файл тек осы браузерде оқылады, ешқайда жіберілмейді.</div>
    <label class="drop mt" id="drop" for="file" tabindex="0">${icon('upload')}<h3 class="mt">ҚМЖ жүктеу (.docx)</h3><div class="muted">Файлды таңдаңыз немесе осында сүйреп әкеліңіз</div></label>
    <input type="file" id="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="sr">
    <div class="row mt"><button class="btn ghost" id="manual">${icon('edit')}Сабақты қолмен енгізу</button></div>
    <div id="upmsg"></div>
  </section>
  <div id="parsed">${L ? lessonEditor(L) : ''}</div>`;
}
function fld(id, lab, val, note, multi) {
  return `<label class="f" for="${id}">${lab} ${note ? `<span class="tag ${/тексер|болжам/.test(note) ? 'w' : 'g'}">${esc(note)}</span>` : (val ? '' : '<span class="tag e">Анықталмады — толтырыңыз</span>')}</label>${multi ? `<textarea class="inp" id="${id}">${esc(val)}</textarea>` : `<input class="inp" id="${id}" value="${esc(val)}">`}`;
}
function lessonEditor(L) {
  const sel = L.tasks.filter(t => t.selected).length;
  return `<section class="card mt2"><div class="row"><h2 style="margin:0">Сабақ туралы мәлімет</h2><span class="spacer"></span>${L.source === 'docx' ? `<span class="tag">${icon('file', 'width="14" height="14"')} ${esc(L.fileName)}</span>` : L.source === 'demo' ? '<span class="tag g">Дайын демо-сабақ</span>' : '<span class="tag w">Қолмен енгізілді</span>'}</div>
   ${L.source === 'docx' && !L.ok ? '<div class="note e mt">Құжаттан ҚМЖ құрылымы анықталмады. Мәліметтерді қолмен толтырып, тапсырмаларды төменде қосыңыз.</div>' : ''}
   <div class="grid2"><div>${fld('f_grade', 'Сынып', L.grade, L.grade ? L.gradeNote : '')}</div><div>${fld('f_subject', 'Пән', L.subject, L.subject ? L.subjectNote : '')}</div></div>
   ${fld('f_topic', 'Сабақтың тақырыбы', L.topic, '')}
   ${fld('f_obj', 'Оқу мақсаты', L.objectives, '', true)}
   <p class="muted small">Оқу мақсаты бейімдеу кезінде өзгертілмейді.</p>
   ${L.stages.length ? `<details class="mt"><summary>Сабақ кезеңдері (${L.stages.length})</summary><div class="scroll"><table class="tbl"><tr><th>Кезең</th><th>Уақыт</th><th>Педагогтің әрекеті (басы)</th></tr>${L.stages.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.time)}</td><td class="small">${esc(s.teacher.split('\n').filter(Boolean).slice(0, 3).join(' · ').slice(0, 160))}…</td></tr>`).join('')}</table></div></details>` : ''}
  </section>
  <section class="card" id="taskSec"><div class="row"><h2 style="margin:0">ЕББҚ оқушысына арналған тапсырмалар</h2><span class="spacer"></span><span class="tag g">Таңдалды: ${sel}</span></div>
   ${L.source === 'docx' ? (L.senTasks.length || L.senLines.length ? `<div class="note g mt small">✓ Құжатта «${esc(L.senLabel)}» белгісі табылды (${esc(L.senStage || '—')}). Ондағы тапсырмалар төменде. Бұлар мұғалімнің өз тапсырмалары, жүйе оларды жаңадан ойлап таппайды.</div>` : '<div class="note w mt small">Құжатта ЕББҚ оқушысына арналған тапсырма автоматты түрде табылмады. Төмендегі «Құжаттан тапсырма таңдау» бөлімінен қажетті жолды таңдаңыз немесе тапсырманы өзіңіз қосыңыз.</div>') : ''}
   <div id="taskList">${L.tasks.map((t, i) => taskCard(t, i, L)).join('') || '<p class="muted mt">Әзірге тапсырма жоқ.</p>'}</div>
   <div class="row mt"><label class="f" for="newType" style="margin:0">Жаңа тапсырма:</label><select class="inp" id="newType" style="max-width:260px">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn soft" id="addTask">${icon('plus')}Тапсырма қосу</button></div>
   ${L.candidates && L.candidates.length ? `<details class="mt" id="candBox" ${L.source === 'docx' && !L.senTasks.length ? 'open' : ''}><summary>Құжаттан тапсырма таңдау (${L.candidates.length} жол)</summary>
     <p class="muted small">Қажетті жолдың жанындағы «Қосу» батырмасын басыңыз. Өрнек болса (мысалы, 25 + 17), ол есептеу тапсырмасы болады. Қалғаны қысқа жауап ретінде қосылады, түрін кейін өзгертуге болады.</p>
     <input class="inp" id="candQ" placeholder="Іздеу…" value="${esc(state.candFilter)}"><div class="cands" id="cands">${candList(L)}</div></details>` : ''}
   ${L.stages.length ? `<label class="f" for="f_stage">Тапсырмалар ҚМЖ-ның қай кезеңіне кіріктіріледі</label><select class="inp" id="f_stage">${L.stages.map((s, i) => `<option value="${i}" ${i === (L.senStageIdx ?? 1) ? 'selected' : ''}>${esc(s.name)}${s.time ? ' · ' + esc(s.time) : ''}</option>`).join('')}</select>` : ''}
   <div id="saveMsg"></div>
   <div class="row mt"><button class="btn lg" id="saveLesson">${icon('check')}Сақтау және бейімдеуге өту</button></div>
  </section>
  ${L.rawText ? `<section class="card"><details><summary>Құжаттан оқылған толық мәтін (${fmt(L.rawText.length)} таңба)</summary><div class="raw">${esc(L.rawText)}</div></details></section>` : ''}`;
}
function candList(L) {
  const q = norm(state.candFilter); const used = new Set(L.tasks.map(t => t.question || t.expr));
  const list = L.candidates.filter(c => !q || norm(c.text).includes(q)).slice(0, 150);
  return list.map(c => { const i = L.candidates.indexOf(c); const isExpr = !!parseExpr(c.text); return `<div class="cand"><div><span class="small muted">${esc(c.stage || '')}</span><div>${esc(c.text)}</div></div><button class="btn sm ${isExpr ? 'soft' : 'ghost'}" data-cand="${i}" ${used.has(c.text) ? 'disabled' : ''}>${icon('plus')}${isExpr ? 'Есеп ретінде' : 'Қосу'}</button></div>`; }).join('') || '<p class="muted small">Ештеңе табылмады.</p>';
}
function taskCard(t, i, L) {
  const err = validateTask(t); const f = (k, ph = '', multi = false) => multi ? `<textarea class="inp" data-t="${i}" data-f="${k}" placeholder="${esc(ph)}">${esc(t[k] || '')}</textarea>` : `<input class="inp" data-t="${i}" data-f="${k}" value="${esc(t[k] || '')}" placeholder="${esc(ph)}">`;
  let body = '';
  if (t.type === 'calc') { const p = parseExpr(t.expr); body = `<label class="f">Өрнек</label>${f('expr', 'мысалы: 120 : 12 немесе 25 + 17')}<div class="small ${p ? 'muted' : 'err'}" data-calc="${i}">${p ? `Дұрыс жауап: ${fmt(p.answer)}${p.remainder ? ` (қалдық ${p.remainder})` : ''}` : 'Өрнекті екі сан және бір амал түрінде жазыңыз.'}</div>`; }
  if (t.type === 'choice') body = `<label class="f">Сұрақ</label>${f('question', 'Сұрақ', true)}<label class="f">Жауап нұсқалары (дұрысын белгілеңіз)</label>${t.options.map((o, j) => `<div class="optrow"><input type="radio" name="cor${i}" data-t="${i}" data-corr="${j}" ${t.correct === j ? 'checked' : ''} aria-label="Дұрыс жауап"><input class="inp" data-t="${i}" data-opt="${j}" value="${esc(o)}" placeholder="${j + 1}-нұсқа">${t.options.length > 2 ? `<button class="btn ghost sm" data-delopt="${i}:${j}" aria-label="Нұсқаны өшіру">×</button>` : ''}</div>`).join('')}${t.options.length < 6 ? `<button class="btn ghost sm" data-addopt="${i}">${icon('plus')}Нұсқа қосу</button>` : ''}`;
  if (t.type === 'match') body = `<label class="f">Нұсқаулық</label>${f('question', 'мысалы: Сөзді суретпен сәйкестендір.')}<label class="f">Жұптар (сол жақ → оң жақ)</label>${t.pairs.map((p, j) => `<div class="optrow"><input class="inp" data-t="${i}" data-pair="${j}:0" value="${esc(p[0])}" placeholder="сол жақ"><span aria-hidden="true">→</span><input class="inp" data-t="${i}" data-pair="${j}:1" value="${esc(p[1])}" placeholder="оң жақ">${t.pairs.length > 2 ? `<button class="btn ghost sm" data-delpair="${i}:${j}" aria-label="Жұпты өшіру">×</button>` : ''}</div>`).join('')}${t.pairs.length < 8 ? `<button class="btn ghost sm" data-addpair="${i}">${icon('plus')}Жұп қосу</button>` : ''}`;
  if (t.type === 'short' || t.type === 'text') body = `${t.type === 'text' ? `<label class="f">Мәтін</label>${f('passage', 'Оқушы оқитын шағын мәтін', true)}` : ''}<label class="f">Сұрақ</label>${f('question', 'Сұрақ', true)}
    <label class="f">Дұрыс жауаптар (бірнешеу болса, үтір арқылы)</label><input class="inp" data-t="${i}" data-list="answers" value="${esc((t.answers || []).join(', '))}" placeholder="мысалы: алма">
    <label class="f">Кілт сөздер (міндетті емес, жауапта бәрі болса — дұрыс)</label><input class="inp" data-t="${i}" data-list="keywords" value="${esc((t.keywords || []).join(', '))}" placeholder="мысалы: кітап, дәптер">
    <p class="small muted">Екеуі де бос болса, жауапты мұғалім «Нәтижелер» бөлімінде өзі тексереді.</p>`;
  return `<div class="tcard ${t.selected ? 'sel' : ''}" id="tc${i}">
    <div class="row"><label class="chk"><input type="checkbox" data-t="${i}" data-sel ${t.selected ? 'checked' : ''}> Оқушыға беру</label>
      <span class="tag">${i + 1}</span><select class="inp sm" data-t="${i}" data-type aria-label="Тапсырма түрі">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}" ${k === t.type ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <span class="tag ${t.origin === 'doc' ? 'g' : t.origin === 'demo' ? '' : 'w'}">${t.origin === 'doc' ? 'құжаттан' : t.origin === 'demo' ? 'дайын мысал' : 'мұғалім қосты'}</span>
      <span class="spacer"></span><button class="btn danger sm" data-del="${i}" aria-label="Тапсырманы өшіру">${icon('trash')}</button></div>
    ${body}
    <details class="mt"><summary>Қосымша: көрнекі көмек, қадамдар, түсіндірме</summary>
      <label class="f">Көрнекі көмек (сурет-белгі немесе қысқа сипаттама)</label>${f('visual', 'мысалы: 🌱 тамыр · 🌿 сабақ', true)}
      <label class="f">Өз қадамдарыңыз (әр жолға біреу; бос болса — стандартты қадамдар)</label><textarea class="inp" data-t="${i}" data-lines="steps">${esc((t.steps || []).join('\n'))}</textarea>
      ${t.type !== 'calc' ? `<label class="f">Қарапайым түсіндірме (бос болса — стандартты)</label>${f('simple', '', true)}` : ''}
    </details>
    ${err && t.selected ? `<div class="small err mt">⚠ ${esc(err)}</div>` : ''}
  </div>`;
}
async function handleBuffer(buf, name) {
  const msg = $('#upmsg'); msg.innerHTML = '<div class="note mt">Файл оқылып жатыр…</div>';
  try {
    const L = finalizeLesson(await readDocx(buf, name)); L.docxB64 = bufToB64(buf);
    state.lessonPreview = L;
    msg.innerHTML = L.ok ? `<div class="note g mt">Файл оқылды: ${L.stages.length} кезең, ${L.candidates.length} жол. ЕББҚ тапсырмасы: ${L.tasks.length}. Мәліметтерді тексеріңіз.</div>` : '<div class="note e mt">Файл ашылды, бірақ ҚМЖ құрылымы анықталмады. Мәліметтерді қолмен енгізіңіз.</div>';
    showEditor();
  } catch (err) {
    console.error(err); state.lessonPreview = null; $('#parsed').innerHTML = '';
    msg.innerHTML = `<div class="note e mt"><b>Файлды оқу мүмкін болмады.</b> ${esc(ERR_TXT[err.message] || 'Белгісіз қате.')}<div class="row mt"><button class="btn sm" id="manual2">${icon('edit')}Қолмен енгізу</button></div></div>`;
    $('#manual2').onclick = startManual;
  }
  updateTourPanel();
}
function showEditor() { $('#parsed').innerHTML = lessonEditor(state.lessonPreview); bindEditor(); $('#parsed').scrollIntoView({ behavior: 'smooth', block: 'start' }); updateTourPanel(); }
function startManual() {
  state.lessonPreview = { source: 'manual', fileName: '', section: '', topic: '', objectives: '', lessonGoal: '', grade: '', gradeNote: '', subject: '', subjectNote: '', stages: [], mainTasks: [], senTasks: [], senLines: [], candidates: [], senFound: false, senLabel: 'ЕББҚ оқушысына арналған тапсырма', senStage: '', rawText: '', ok: true, tasks: [newTask('choice')] };
  $('#upmsg').innerHTML = ''; showEditor();
}
function bindUpload() {
  const inp = $('#file'), drop = $('#drop');
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; await handleBuffer(await f.arrayBuffer(), f.name); inp.value = ''; };
  drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async e => { const f = e.dataTransfer.files[0]; if (f) await handleBuffer(await f.arrayBuffer(), f.name); });
  $('#manual').onclick = startManual;
  $$('[data-demo]').forEach(b => b.onclick = async () => {
    const cur = state.lessonPreview || getLesson();
    if (cur && cur.demoKey !== b.dataset.demo && getDraft().approved && !confirm('Ағымдағы сабақтың орнына жаңа сабақ ашылсын ба? Бекітілген бейімдеу қайта бекітуді қажет етеді.')) return;
    try { state.lessonPreview = await loadDemoLesson(b.dataset.demo); $('#upmsg').innerHTML = ''; showEditor(); $$('[data-demo]').forEach(x => x.classList.toggle('on', x === b)); }
    catch (e) { console.error(e); toast('Сабақты ашу мүмкін болмады', 'err'); }
  });
  if ($('#saveLesson')) { if (!state.lessonPreview) state.lessonPreview = getLesson(); bindEditor(); }
}
function bindEditor() {
  const L = state.lessonPreview; if (!L) return;
  const rerender = () => { const y = window.scrollY; $('#parsed').innerHTML = lessonEditor(L); bindEditor(); window.scrollTo(0, y); };
  const box = $('#parsed');
  box.oninput = e => {
    const el = e.target; const i = el.dataset.t; if (i == null) return; const t = L.tasks[+i];
    if (el.dataset.f) { t[el.dataset.f] = el.value; if (el.dataset.f === 'expr') { const p = parseExpr(el.value); const c = $(`[data-calc="${i}"]`); if (c) { c.className = 'small ' + (p ? 'muted' : 'err'); c.textContent = p ? `Дұрыс жауап: ${fmt(p.answer)}${p.remainder ? ` (қалдық ${p.remainder})` : ''}` : 'Өрнекті екі сан және бір амал түрінде жазыңыз.'; } } }
    if (el.dataset.opt != null) t.options[+el.dataset.opt] = el.value;
    if (el.dataset.pair) { const [j, k] = el.dataset.pair.split(':'); t.pairs[+j][+k] = el.value; }
    if (el.dataset.list) t[el.dataset.list] = el.value.split(',').map(x => x.trim()).filter(Boolean);
    if (el.dataset.lines) t[el.dataset.lines] = el.value.split('\n').map(x => x.trim()).filter(Boolean);
  };
  box.onchange = e => {
    const el = e.target; const i = el.dataset.t;
    if (el.id === 'candQ') return;
    if (i == null) return; const t = L.tasks[+i];
    if (el.dataset.sel != null) { t.selected = el.checked; rerender(); }
    if (el.dataset.corr != null) t.correct = +el.dataset.corr;
    if (el.dataset.type != null) { const q = t.question || (t.type === 'calc' ? t.expr : ''); const nt = newTask(el.value, { id: t.id, origin: t.origin, stageIdx: t.stageIdx, question: el.value === 'calc' ? '' : q, visual: t.visual, steps: t.steps, simple: t.simple }); if (el.value === 'calc' && parseExpr(q)) nt.expr = parseExpr(q).expr; L.tasks[+i] = nt; rerender(); }
  };
  box.onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    const ds = b.dataset;
    if (ds.del != null) { if (confirm('Тапсырма өшірілсін бе?')) { L.tasks.splice(+ds.del, 1); rerender(); } }
    else if (ds.addopt != null) { L.tasks[+ds.addopt].options.push(''); rerender(); }
    else if (ds.delopt) { const [i, j] = ds.delopt.split(':').map(Number); const t = L.tasks[i]; t.options.splice(j, 1); if (t.correct >= t.options.length || t.correct === j) t.correct = 0; else if (t.correct > j) t.correct--; rerender(); }
    else if (ds.addpair != null) { L.tasks[+ds.addpair].pairs.push(['', '']); rerender(); }
    else if (ds.delpair) { const [i, j] = ds.delpair.split(':').map(Number); L.tasks[i].pairs.splice(j, 1); rerender(); }
    else if (ds.cand != null) { const c = L.candidates[+ds.cand]; L.tasks.push(taskFromLine(c.text, c.stageIdx)); rerender(); toast('Тапсырма қосылды. Түрі мен мәтінін тексеріңіз.', 'ok'); setTimeout(() => $(`#tc${L.tasks.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
    else if (b.id === 'addTask') { L.tasks.push(newTask($('#newType').value, { stageIdx: L.senStageIdx })); rerender(); setTimeout(() => $(`#tc${L.tasks.length - 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); }
    else if (b.id === 'saveLesson') saveLesson();
  };
  const cq = $('#candQ'); if (cq) cq.oninput = () => { state.candFilter = cq.value; $('#cands').innerHTML = candList(L); };
}
function saveLesson() {
  const L = state.lessonPreview; if (!L) return;
  L.grade = $('#f_grade').value.trim(); L.subject = $('#f_subject').value.trim(); L.topic = $('#f_topic').value.trim(); L.objectives = $('#f_obj').value.trim();
  if ($('#f_stage')) { L.senStageIdx = +$('#f_stage').value; L.senStage = L.stages[L.senStageIdx]?.name || ''; }
  const msg = $('#saveMsg');
  if (!L.topic) { toast('Сабақтың тақырыбын енгізіңіз', 'err'); $('#f_topic').focus(); return; }
  const sel = L.tasks.filter(t => t.selected);
  if (!sel.length) { msg.innerHTML = '<div class="note e mt">Кемінде бір тапсырманы «Оқушыға беру» деп белгілеңіз.</div>'; return; }
  const bad = L.tasks.map((t, i) => [t, i]).filter(([t]) => t.selected && validateTask(t));
  if (bad.length) { msg.innerHTML = `<div class="note e mt">${bad.map(([t, i]) => `${i + 1}-тапсырма: ${esc(validateTask(t))}`).join('<br>')}</div>`; $(`#tc${bad[0][1]}`).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  L.tasks.forEach(t => { if (t.type === 'calc') { const p = parseExpr(t.expr); if (p) t.expr = p.expr; t.id = taskId(t); } if (t.type === 'choice') { const keep = t.options.map((o, j) => [o.trim(), j]).filter(x => x[0]); t.correct = Math.max(0, keep.findIndex(x => x[1] === t.correct)); t.options = keep.map(x => x[0]); } if (t.type === 'match') t.pairs = t.pairs.filter(p => p[0].trim() && p[1].trim()); });
  const ids = new Set(); L.tasks.forEach(t => { if (ids.has(t.id)) t.id = t.id + '_' + uid().slice(0, 3); ids.add(t.id); });
  const old = getLesson(); const sig = x => JSON.stringify((x?.tasks || []).filter(t => t.selected));
  L.savedAt = Date.now();
  Store.set('lesson', L);
  const d = getDraft(); d.stageIdx = L.senStageIdx ?? null;
  if (!old || sig(old) !== sig(L) || old.topic !== L.topic) { if (old && (old.demoKey !== L.demoKey || old.fileName !== L.fileName)) d.custom = {}; saveDraft(d); } else saveDraft(d, true);
  state.lessonPreview = null; toast('Сабақ сақталды', 'ok'); go('/t/adapt');
}

/* ---------------- Тапсырманы бейімдеу ---------------- */
let recCtl = null; // мұғалімнің дауыс жазуы
function tAdapt() {
  const L = getLesson();
  if (!L) return `<h1>Тапсырманы бейімдеу</h1><section class="card"><p>Алдымен сабақты таңдаңыз немесе ҚМЖ жүктеңіз.</p><button class="btn" data-go="/t/upload">${icon('upload')}Сабақ таңдау</button></section>`;
  const d = getDraft(); const S = d.supports || {}; const items = draftItems(L, d); const st = students(); const ed = state.editMode; const tts = TTS.status();
  if (!items.length) return `<h1>Тапсырманы бейімдеу</h1><section class="card"><p>Оқушыға берілетін тапсырма таңдалмаған.</p><button class="btn" data-go="/t/upload">${icon('edit')}Тапсырмаларды белгілеу</button></section>`;
  const hasChoice = items.some(i => i.type === 'choice' || i.type === 'match');
  const nRec = items.filter(i => i.recKind).length;
  return `<h1>Тапсырманы бейімдеу</h1>
  <p class="muted">${esc(L.subject || '')}${L.grade ? ' · ' + esc(L.grade) + '-сынып' : ''} · <b>${esc(L.topic)}</b> · ${items.length} тапсырма <button class="linkbtn" data-go="/t/upload">өзгерту</button></p>
  <section class="card"><h2>1. Оқушыға қандай қолдау қажет?</h2>
    <p class="muted small">Мұғалім педагогикалық қажеттілікті таңдайды. Жүйе диагноз қоймайды. Бір қиындығы бар балалардың бәріне бірдей бейімдеу сәйкес келе бермейді, сондықтан қолдау әр оқушыға жеке таңдалады.</p>
    <div class="row" style="margin-bottom:12px"><label class="f" for="stuSel" style="margin:0">Оқушы:</label><select class="inp" id="stuSel" style="max-width:280px">${st.map(s => `<option value="${s.id}" ${s.id === d.studentId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="chips">${SUPPORTS.map(([k, t]) => `<label class="chip ${S[k] ? 'on' : ''}"><input type="checkbox" data-sup="${k}" ${S[k] ? 'checked' : ''}>${t}${k === 'fewer' && !hasChoice ? ' <small class="muted">(таңдау мен сәйкестендіруге)</small>' : ''}</label>`).join('')}</div>
    ${d.needReapprove ? '<div class="note w mt small">Платформа жаңартылды. Тапсырманы қарап шығып, қайта <b>бекітіңіз</b>.</div>' : ''}
    ${S.tts ? `<div class="note ${nRec === items.length || tts.ok ? 'g' : 'w'} mt small">${icon('speaker', 'width="16" height="16"')} Жазылған дауыс: ${nRec}/${items.length} тапсырмада (интернетсіз ойнатылады). ${nRec < items.length ? (tts.ok ? `Қалғаны браузер дауысымен оқылады: ${esc(TTS.voice.name)}.` : 'Қалғаны үшін осы браузерде қазақ дауысы жоқ: оқушыға шынайы ескерту көрсетіледі. Төменде әр тапсырмаға өз дауысыңызды жаза аласыз («Дауыс жазу») немесе Microsoft Edge-ті интернетпен қолданыңыз.') : ''}</div>` : ''}
    <div class="note mt small">${icon('bulb', 'width="16" height="16"')} Бейімдеу <b>ережеге негізделген алгоритм</b> арқылы ұсынылады (тілдік модель емес). Оқу мақсаты өзгермейді, тек тапсырманың берілу және орындалу тәсілі өзгереді. Кез келген мәтінді мұғалім өзгерте алады.</div>
  </section>
  ${actionCard(L, d, 'top')}
  <section class="card"><div class="row"><h2 style="margin:0">2. Бастапқы және бейімделген тапсырма</h2><span class="spacer"></span>
    <button class="btn ghost sm" data-go="/t/compare">${icon('eye')}Салыстыру</button>
    <button class="btn ghost sm" id="previewBtn">${icon('student')}Оқушы көрінісі</button>
    <button class="btn ${ed ? '' : 'ghost'} sm" id="editBtn">${icon('edit')}${ed ? 'Өңдеуді сақтау' : 'Өңдеу'}</button></div>
    ${items.map((it, i) => adaptCompare(it, i, S, ed)).join('')}
    ${ed ? `<label class="f">Орындау тәсілі</label><textarea class="inp" id="edMethod">${esc(draftMethod(d))}</textarea><label class="f">Бағалау критерийі</label><textarea class="inp" id="edCrit">${esc(draftCriterion(d))}</textarea>
      <div class="row mt"><button class="btn ghost sm" id="resetEdits">Бастапқы ұсынысқа қайтару</button><button class="btn" id="editBtn2">${icon('check')}Өңдеуді сақтау</button></div>` : ''}
  </section>
  ${actionCard(L, d, 'bottom')}
  <section class="card" id="planCard"><div class="row"><h2 style="margin:0">Ортақ ҚМЖ</h2><span class="spacer"></span>
    <button class="btn ghost sm" id="printBtn">${icon('file')}Басып шығару</button>
    <button class="btn ghost sm" id="wordBtn">${icon('down')}Word жүктеу</button></div>
    <div class="seg mt" role="tablist" aria-label="ҚМЖ көрінісі">${[['orig', 'Бастапқы ҚМЖ'], ['adapted', 'Бейімделген ҚМЖ'], ['diff', 'Салыстыру']].map(([k, t]) => `<button role="tab" aria-selected="${(state.planMode || 'adapted') === k}" class="${(state.planMode || 'adapted') === k ? 'on' : ''}" data-pm="${k}">${t}</button>`).join('')}</div>
    <p class="muted small">Бөлек жоспар жасалмайды: бейімделген тапсырма ортақ жоспардың тиісті кезеңіне кіріктіріледі. ${L.docxB64 ? 'Мұнда құжаттың мәтіндік көрінісі берілген. Word файлында бастапқы құжаттың пішімі сақталып, тек ЕББҚ блогы қосылады.' : 'Word файлы осы сабақ жоспарынан жасалады.'}</p>
    ${planView(L, d, items, state.planMode || 'adapted')}
  </section>`;
}
function actionCard(L, d, pos) {
  return `<section class="card actcard ${d.approved ? 'ok' : ''}" ${pos === 'top' ? 'id="actTop"' : ''}>
    <div class="row">
      <div class="act-st">${d.approved ? `<b>✓ Мұғалім бекітті</b><span class="small muted">${nowStr(d.approvedAt)} · Тапсырма ортақ ҚМЖ-ға кіріктірілді</span>` : `<b>Бекітілмеген</b><span class="small muted">Тапсырмаларды тексеріп, бекітіңіз. Содан кейін оқушыға жіберуге болады.</span>`}</div>
      <span class="spacer"></span>
      ${d.approved ? '' : `<button class="btn blue lg" data-approve>${icon('check')}Бекіту</button>`}
      <button class="btn lg" data-send ${d.approved ? '' : 'disabled'}>${icon('send')}Оқушыға жіберу</button>
    </div>${d.approved ? sendStatusHtml(d) : ''}</section>`;
}
function sendStatusHtml(d) {
  const s = Store.get('sends', []).filter(x => x.version === d.approvedAt).slice(-3).reverse();
  if (!s.length) return '';
  return `<div class="sendstat">${s.map(x => `<div>${x.kind === 'local' ? `✓ «${esc(x.name)}» оқушысына осы құрылғыда ашылды` : '✓ Оқушыға сілтеме және QR-код жасалды'} · ${nowStr(x.at)}</div>`).join('')}${s.some(x => x.kind === 'link') ? '<div class="small muted">Сілтеме арқылы жіберілген тапсырманың орындалғаны оқушы нәтиже сілтемесін қайтарғанда «Нәтижелер» бөлімінде көрінеді.</div>' : ''}</div>`;
}
function itemSummaryHtml(it) {
  if (it.type === 'calc') return `<div class="big">${esc(it.expr)} = ?</div>`;
  if (it.type === 'choice') return `<div><b>${esc(it.question)}</b><ol class="opts">${it.options.map((o, j) => `<li>${esc(o)}${j === it.correctIdx ? ' <span class="tag g">дұрыс</span>' : ''}</li>`).join('')}</ol></div>`;
  if (it.type === 'match') return `<div><b>${esc(it.question)}</b><ul class="opts">${it.left.map((l, j) => `<li>${esc(l)} → ${esc(it.rightAns[j])}</li>`).join('')}</ul></div>`;
  return `<div>${it.passage ? `<p class="passage-s">${esc(it.passage)}</p>` : ''}<b>${esc(it.question)}</b><div class="small muted">${it.autoCheck ? 'Дұрыс жауап: ' + esc([...it.answers, ...(it.keywords.length ? ['кілт сөздер: ' + it.keywords.join(', ')] : [])].join('; ')) : 'Жауапты мұғалім тексереді'}</div></div>`;
}
function recRowHtml(it) {
  const lr = localRecs()[it.id]; const valid = lr && lr.text === speechCore(it); const busy = recCtl && recCtl.id === it.id;
  const st = busy ? '<span class="tag e">● Жазылып жатыр…</span>' : valid ? '<span class="tag g">Мұғалімнің дауысы жазылған (осы құрылғыда)</span>' : lr ? '<span class="tag w">Мәтін өзгерді, қайта жазыңыз</span>' : it.recKind === 'embed' ? '<span class="tag g">Кірістірілген жазба бар</span>' : '<span class="muted small">Жазба жоқ</span>';
  return `<div class="recrow" data-recid="${it.id}">${icon('speaker')}<b>Дауыс:</b> ${st}<span class="spacer"></span>
    ${busy ? '<button class="btn sm" data-recstop>⏹ Жазуды тоқтату</button>' : `<button class="btn ghost sm" data-recstart>🎙 ${lr ? 'Қайта жазу' : 'Дауыс жазу'}</button>`}
    ${lr && !busy ? '<button class="btn ghost sm" data-recplay>▶ Тыңдау</button><button class="btn ghost sm" data-recdel aria-label="Жазбаны өшіру">' + icon('trash') + '</button>' : ''}</div>
    ${busy ? `<div class="note small">Мына мәтінді анық оқыңыз: «${esc(speechCore(it))}»</div>` : ''}`;
}
function adaptCompare(it, i, S, ed) {
  return `<div class="cmp mt">
    <div class="src"><h4>Бастапқы тапсырма ${i + 1} · ${TYPES[it.type]}</h4><div class="srctxt">${esc(it.original)}</div></div>
    <div class="ad"><h4>Бейімделген тапсырма <span class="tag">алгоритм ұсынысы</span> ${it.edited ? '<span class="tag w">мұғалім өзгертті</span>' : ''}</h4>
    ${ed ? `<label class="f">Нұсқаулық</label><textarea class="inp" data-ed="instruction" data-id="${it.id}">${esc(it.instruction)}</textarea>
      ${S.simple ? `<label class="f">Қарапайым түсіндірме</label><textarea class="inp" data-ed="explain" data-id="${it.id}">${esc(it.explain)}</textarea>` : ''}
      <label class="f">Көмек қадамдары (әр жолға біреу; оқушы «Көмек алу» басқанда біртіндеп ашылады)</label><textarea class="inp" data-ed="hints" data-id="${it.id}">${esc(it.hints.join('\n'))}</textarea>
      <label class="f">Сұрақ</label><input class="inp" data-ed="question" data-id="${it.id}" value="${esc(it.question)}">
      ${S.visual && (!it.visual || it.visual.kind === 'text') ? `<label class="f">Көрнекі көмек</label><textarea class="inp" data-ed="visualText" data-id="${it.id}">${esc(it.visual ? it.visual.text : '')}</textarea>` : ''}`
    : `<div class="adinstr">${esc(it.instruction)}</div>
      ${it.explain ? `<div class="mt" style="margin-top:6px">${esc(it.explain)}</div>` : ''}
      ${itemSummaryHtml(it)}
      ${it.hints.length ? `<details class="small mt"><summary>Көмек қадамдары (${it.hints.length}) — оқушы «Көмек алу» басқанда біртіндеп ашылады</summary><ol>${it.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol></details>` : ''}
      ${it.visual ? `<div class="small mt"><b>Көрнекі көмек:</b> ${it.visual.kind === 'groups' ? `${it.visual.groups} топ × ${it.visual.per} (оқушы өзі санайды)` : it.visual.kind === 'dots' ? 'нүктелер сызбасы' : esc(it.visual.text)}</div>` : ''}
      <div class="row small mt">${SUPPORTS.filter(([k]) => S[k]).map(([, t]) => `<span class="tag g">${t}</span>`).join('') || '<span class="muted">Қолдау түрі әлі таңдалмаған</span>'}</div>
      ${S.tts ? recRowHtml(it) : ''}`}
    </div></div>`;
}
function senBlockHtml(L, d, items) {
  const S = d.supports || {};
  return `<div class="sen"><h5>ЕББҚ оқушысына арналған бейімделген тапсырма ${d.approved ? '<span class="tag g">мұғалім бекітті</span>' : '<span class="tag w">жоба, бекітілмеген</span>'}</h5><dl>
    <dt>Бастапқы тапсырма:</dt><dd>${items.map((i, j) => `${j + 1}) ${esc(i.label)}`).join('<br>')}</dd>
    <dt>Қолдау тәсілдері:</dt><dd>${SUPPORTS.filter(([k]) => S[k]).map(([, t]) => t).join(', ') || '—'}</dd>
    <dt>Бейімделген нұсқаулық:</dt><dd>${items.map((i, j) => `${j + 1}) ${esc(i.instruction)}`).join('<br>')}</dd>
    <dt>Орындау тәсілі:</dt><dd>${esc(draftMethod(d))}</dd>
    <dt>Бағалау критерийі:</dt><dd>${esc(draftCriterion(d))}</dd></dl></div>`;
}
function planView(L, d, items, mode = 'adapted') {
  const idx = d.stageIdx ?? L.senStageIdx ?? 0;
  const head = `<p><b>Тақырып:</b> ${esc(L.topic)}${L.objectives ? `<br><b>Оқу мақсаты:</b> <span class="pre">${esc(L.objectives)}</span>` : ''}</p>`;
  if (mode === 'diff') {
    const stName = L.stages[idx]?.name || 'ҚМЖ соңы';
    const summary = `<div class="note mt"><b>Не өзгерді:</b><ol style="margin:6px 0 0"><li>«${esc(stName)}» кезеңіне ЕББҚ оқушысына арналған бейімделген тапсырма блогы <b>қосылды</b> (${items.length} тапсырма).</li><li>Тақырып, оқу мақсаты, сабақ кезеңдері, басқа тапсырмалар, бағалау мен ресурстар <b>өзгерген жоқ</b>.</li></ol></div>`;
    if (!L.stages.length) return head + summary + `<div class="diffgrid mt"><div><h4>Бастапқы</h4><p class="muted">Кезеңдер кестесі жоқ.</p></div><div><h4>Бейімделген</h4><div class="addmark">＋ Қосылды</div>${senBlockHtml(L, d, items)}</div></div>`;
    return head + summary + `<div class="scroll mt"><table class="plan diff"><tr><th>Кезең</th><th>Бастапқы ҚМЖ (педагогтің әрекеті)</th><th>Бейімделген ҚМЖ (педагогтің әрекеті)</th></tr>
      ${L.stages.map((s, i) => `<tr class="${i === idx ? 'chg' : ''}"><td class="st">${esc(s.name)}<div class="muted small">${esc(s.time)}</div></td>
      <td><div class="pre">${esc(i === idx ? s.teacher : s.teacher.slice(0, 220) + (s.teacher.length > 220 ? '…' : ''))}</div></td>
      <td>${i === idx ? `<div class="pre">${esc(s.teacher)}</div><div class="addmark">＋ Қосылды</div>${senBlockHtml(L, d, items)}` : '<span class="tag">өзгеріс жоқ</span>'}</td></tr>`).join('')}</table></div>`;
  }
  const withBlock = mode === 'adapted';
  if (!L.stages.length) return `<div>${head}${withBlock ? senBlockHtml(L, d, items) : '<p class="muted">Бастапқы жоспарда ЕББҚ блогы жоқ.</p>'}</div>`;
  return `<div class="scroll">${head}
   <table class="plan"><tr><th>Кезең / уақыт</th><th>Педагогтің әрекеті</th><th>Оқушының әрекеті</th><th>Бағалау</th><th>Ресурстар</th></tr>
   ${L.stages.map((s, i) => `<tr><td class="st">${esc(s.name)}<div class="muted small">${esc(s.time)}</div></td>
     <td><div class="pre">${esc(s.teacher.length > 600 && i !== idx ? s.teacher.slice(0, 600) + '…' : s.teacher)}</div>${i === idx && withBlock ? senBlockHtml(L, d, items) : ''}</td>
     <td class="pre">${esc(s.student)}</td><td class="pre">${esc(s.assessment)}</td><td class="pre">${esc(s.resources)}</td></tr>`).join('')}</table></div>`;
}
function buildAssignment(L, d, studentId) {
  const items = draftItems(L, d);
  return { id: uid(), v: 2, version: d.approvedAt, studentId, sentAt: Date.now(), subject: L.subject || '', grade: L.grade, topic: L.topic,
    stage: L.stages[d.stageIdx ?? L.senStageIdx ?? 0]?.name || '', supports: { ...d.supports }, items: items.map(({ edited, original, ...x }) => x), method: draftMethod(d), criterion: draftCriterion(d) };
}
/* Сілтемеге жазылатын ықшам дерек: бастапқы тапсырмалар + қолдау + мұғалім түзетулері. Оқушы құрылғысында қайта құрастырылады. */
function buildLinkPayload(L, d) {
  const tasks = draftTasks(L).map(({ origin, stageIdx, selected, ...t }) => t);
  const ids = new Set(tasks.map(t => taskId(t))); const custom = {}; Object.entries(d.custom || {}).forEach(([k, v]) => { if (ids.has(k)) custom[k] = v; });
  return { v: 3, id: uid(), version: d.approvedAt, sentAt: Date.now(), subject: L.subject || '', grade: L.grade, topic: L.topic, stage: L.stages[d.stageIdx ?? L.senStageIdx ?? 0]?.name || '', supports: { ...d.supports }, tasks, custom, method: d.method || '', criterion: d.criterion || '' };
}
function assignmentFromPayload(p) {
  if (p.v !== 3) return p;
  const items = itemsFromTasks(p.tasks, p.supports || {}, p.custom).map(({ edited, original, ...x }) => x);
  return { id: p.id, v: 3, version: p.version, sentAt: p.sentAt, subject: p.subject, grade: p.grade, topic: p.topic, stage: p.stage, supports: p.supports || {}, items, method: p.method || methodText(p.supports || {}), criterion: p.criterion || CRITERION_DEFAULT };
}
function logSend(kind, d) { const s = Store.get('sends', []); s.push({ kind, at: Date.now(), version: d.approvedAt, name: studentName(d.studentId) }); Store.set('sends', s.slice(-20)); }

/* --- «Оқушыға жіберу» терезесі --- */
function closeDlg() { const o = $('#sendDlg'); if (o) o.remove(); document.removeEventListener('keydown', dlgKey); }
function dlgKey(e) { if (e.key === 'Escape') closeDlg(); }
function openSendDialog() {
  const L = getLesson(), d = getDraft(); if (!L || !d.approved) return;
  closeDlg();
  const ov = document.createElement('div'); ov.className = 'dlg-ov'; ov.id = 'sendDlg';
  ov.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgT"><div class="row"><h2 id="dlgT" style="margin:0">Оқушыға жіберу</h2><span class="spacer"></span><button class="btn ghost sm" id="dlgX" aria-label="Жабу">✕ Жабу</button></div>
    <p class="muted">Оқушы: <b>${esc(studentName(d.studentId))}</b> · ${draftItems(L, d).length} тапсырма · ${esc(L.topic)}</p>
    <div class="grid2"><button class="sendchoice" id="sendLocal">${icon('student')}<b>Осы құрылғыда ашу</b><span>Оқушы кабинеті осы браузерде ашылады. Сыныптағы компьютерге немесе демонстрацияға ыңғайлы.</span></button>
    <button class="sendchoice" id="sendLink">${icon('send')}<b>Сілтеме арқылы жіберу</b><span>Оқушы тапсырманы өз телефонында немесе компьютерінде ашады. Сілтеме мен QR-код жасалады.</span></button></div>
    <div id="dlgOut"></div></div>`;
  document.body.appendChild(ov);
  $('#dlgX').onclick = closeDlg; ov.onclick = e => { if (e.target === ov) closeDlg(); }; document.addEventListener('keydown', dlgKey);
  $('#sendLocal').focus();
  $('#sendLocal').onclick = () => {
    const all = Store.get('assignments', {}); all[d.studentId] = buildAssignment(L, d, d.studentId); Store.set('assignments', all);
    try { sessionStorage.setItem('qj_sid', d.studentId); } catch (e) { }
    logSend('local', d); closeDlg(); toast(`Тапсырма «${studentName(d.studentId)}» оқушысына жіберілді. Оқушы кабинеті ашылды.`, 'ok'); go('/s/home');
  };
  $('#sendLink').onclick = async () => {
    const out = $('#dlgOut'); out.innerHTML = '<p class="muted mt">Сілтеме жасалып жатыр…</p>';
    try {
      const url = baseUrl() + '#/s/open/' + await packData(buildLinkPayload(L, d));
      let qr = ''; try { qr = qrSvg(url); } catch (e) { console.error(e); }
      logSend('link', d);
      const local = location.protocol === 'file:';
      out.innerHTML = `<div class="linkres mt"><div class="qrbox">${qr ? qr + '<p class="small muted">Оқушы телефонының камерасымен сканерлейді</p>' : '<p class="small muted">QR-код жасау мүмкін болмады. Сілтемені көшіріп жіберіңіз.</p>'}</div>
        <div><label class="f" for="linkInp">Оқушыға арналған сілтеме</label><input class="inp" id="linkInp" readonly value="${esc(url)}">
        <div class="row mt"><button class="btn" id="copyLink">${icon('check')}Сілтемені көшіру</button>${navigator.share ? `<button class="btn ghost" id="shareLink">${icon('send')}Бөлісу</button>` : ''}<a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">${icon('eye')}Ашып көру</a></div>
        <p class="small muted mt">Сілтемені WhatsApp, электрондық пошта немесе басқа жолмен жіберіңіз. Сілтемеде оқушының жеке деректері жоқ. Оқушы аяқтаған соң, нәтиже сілтемесін сізге қайтарады.</p>
        ${local ? '<div class="note w small">Қосымша компьютердегі файлдан ашылған. Мұндай сілтеме басқа құрылғыда ашылмайды. Басқа құрылғыға жіберу үшін платформаны сайттан ашыңыз: shermo67.github.io/qoljetim-ai</div>' : ''}</div></div>`;
      $('#copyLink').onclick = async () => { const ok = await copyText(url); if (!ok) { $('#linkInp').select(); } toast(ok ? 'Сілтеме көшірілді' : 'Көшіру мүмкін болмады: сілтеме белгіленді, Ctrl+C басыңыз', ok ? 'ok' : 'err'); };
      $('#shareLink') && ($('#shareLink').onclick = () => navigator.share({ title: 'QolJetim AI тапсырма', url }).catch(() => { }));
      if ($('#actTop')) { $$('.actcard').forEach(c => { const old = c.querySelector('.sendstat'); const html = sendStatusHtml(d); if (old) old.outerHTML = html; else c.insertAdjacentHTML('beforeend', html); }); }
    } catch (e) { console.error(e); out.innerHTML = '<div class="note e mt">Сілтеме жасау мүмкін болмады. Браузерді жаңартып көріңіз.</div>'; }
  };
}

/* --- Мұғалімнің дауысын жазу (MediaRecorder; тек осы құрылғыда сақталады) --- */
async function startRecording(it) {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { toast('Бұл браузерде дауыс жазу мүмкін емес', 'err'); return; }
  if (recCtl) { toast('Алдымен басталған жазуды тоқтатыңыз', 'err'); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Микрофонға рұқсат берілмеді', 'err'); return; }
  const mt = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
  let mr; try { mr = new MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 32000 } : undefined); } catch (e) { mr = new MediaRecorder(stream); }
  const chunks = []; const text = speechCore(it); const id = it.id;
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  mr.onstop = () => {
    stream.getTracks().forEach(t => t.stop()); if (recCtl) clearTimeout(recCtl.timer); recCtl = null;
    const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
    if (blob.size < 800) { toast('Жазба тым қысқа болды, қайта жазыңыз', 'err'); render(); return; }
    const fr = new FileReader(); fr.onload = () => { const all = localRecs(); all[id] = { data: fr.result, text, at: Date.now() }; Store.set('recs', all); toast('Дауыс сақталды (осы құрылғыда)', 'ok'); render(); }; fr.readAsDataURL(blob);
  };
  mr.start(); recCtl = { id, mr, timer: setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 60000) };
  render();
}

function bindAdapt() {
  const L = getLesson(); if (!L || !$('#stuSel')) return;
  $('#stuSel').onchange = e => { const d = getDraft(); d.studentId = e.target.value; saveDraft(d, true); render(); };
  $$('[data-sup]').forEach(cb => cb.onchange = () => { const d = getDraft(); d.supports = { ...d.supports, [cb.dataset.sup]: cb.checked }; saveDraft(d); render(); });
  const saveEdits = () => {
    const d = getDraft(); const before = JSON.stringify(d.custom || {}) + d.method + d.criterion; d.custom = d.custom || {}; const S = d.supports || {};
    $$('[data-ed]').forEach(el => {
      const id = el.dataset.id, f = el.dataset.ed; const t = L.tasks.find(x => taskId(x) === id); if (!t) return;
      const base = adaptTask(t, S); let v = el.value.trim(); if (f === 'hints') v = v.split('\n').map(x => x.trim()).filter(Boolean);
      const baseV = f === 'visualText' ? (base.visual && base.visual.kind === 'text' ? base.visual.text : '') : base[f];
      const same = f === 'hints' ? JSON.stringify(v) === JSON.stringify(baseV) : v === baseV;
      d.custom[id] = d.custom[id] || {}; if (same) delete d.custom[id][f]; else d.custom[id][f] = v;
      if (!Object.keys(d.custom[id]).length) delete d.custom[id];
    });
    const m = $('#edMethod').value.trim(), c = $('#edCrit').value.trim();
    d.method = m === methodText(S) ? '' : m; d.criterion = c === CRITERION_DEFAULT ? '' : c; d.reviewed = true;
    const changed = before !== JSON.stringify(d.custom) + d.method + d.criterion;
    saveDraft(d, !changed); state.editMode = false; toast(changed ? 'Өзгерістер сақталды. Қайта бекітіңіз.' : 'Өзгеріс жоқ', 'ok'); render();
  };
  $('#editBtn').onclick = () => { if (state.editMode) saveEdits(); else { state.editMode = true; const d = getDraft(); d.reviewed = true; saveDraft(d, true); render(); } };
  $('#editBtn2') && ($('#editBtn2').onclick = saveEdits);
  $('#resetEdits') && ($('#resetEdits').onclick = () => { const d = getDraft(); d.custom = {}; d.method = ''; d.criterion = ''; saveDraft(d); state.editMode = false; toast('Бастапқы ұсыныс қайтарылды'); render(); });
  $('#previewBtn').onclick = () => { if (state.editMode) { toast('Алдымен «Өңдеуді сақтау» батырмасын басыңыз', 'err'); return; } const d = getDraft(); d.reviewed = true; saveDraft(d, true); state.run = null; go('/s/preview'); };
  $$('[data-approve]').forEach(b => b.onclick = () => {
    if (state.editMode) { toast('Алдымен «Өңдеуді сақтау» батырмасын басыңыз', 'err'); return; }
    const d = getDraft(); if (!Object.values(d.supports || {}).some(Boolean)) { toast('Кемінде бір қолдау түрін таңдаңыз', 'err'); $('#stuSel').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    d.approved = true; d.approvedAt = Date.now(); d.needReapprove = false; Store.set('draft', d); toast('Тапсырма бекітілді және ҚМЖ-ға кіріктірілді', 'ok'); render();
    setTimeout(() => $('#actTop')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  });
  $$('[data-send]').forEach(b => b.onclick = () => { if (!b.disabled) openSendDialog(); });
  $$('[data-pm]').forEach(b => b.onclick = () => { state.planMode = b.dataset.pm; const y = window.scrollY; render(); window.scrollTo(0, y); });
  $$('.recrow').forEach(row => {
    const id = row.dataset.recid; const it = draftItems(L, getDraft()).find(x => x.id === id); if (!it) return;
    row.querySelector('[data-recstart]') && (row.querySelector('[data-recstart]').onclick = () => startRecording(it));
    row.querySelector('[data-recstop]') && (row.querySelector('[data-recstop]').onclick = () => { if (recCtl && recCtl.mr.state === 'recording') recCtl.mr.stop(); });
    row.querySelector('[data-recplay]') && (row.querySelector('[data-recplay]').onclick = () => { const r = localRecs()[id]; if (!r) return; if (window.__qjAudio) window.__qjAudio.pause(); const a = new Audio(r.data); window.__qjAudio = a; a.play().catch(() => toast('Ойнату мүмкін болмады', 'err')); });
    row.querySelector('[data-recdel]') && (row.querySelector('[data-recdel]').onclick = () => { if (!confirm('Жазба өшірілсін бе?')) return; const all = localRecs(); delete all[id]; Store.set('recs', all); render(); });
  });
  $('#printBtn').onclick = () => printPlan(L, getDraft());
  $('#wordBtn').onclick = () => exportWord(L, getDraft()).catch(e => { console.error(e); toast('Word файлын жасау мүмкін болмады', 'err'); });
}
function printPlan(L, d) {
  const w = window.open('', '_blank'); if (!w) { toast('Браузер жаңа терезені бұғаттады', 'err'); return; }
  w.document.write(`<!DOCTYPE html><html lang="kk"><head><meta charset="utf-8"><title>${esc(L.topic)}</title><style>${$('style').textContent}</style></head><body style="background:#fff"><main class="wrap"><h2>${esc(L.subject)} ${L.grade ? esc(L.grade) + '-сынып' : ''}</h2>${planView(L, d, draftItems(L, d), 'adapted')}</main></body></html>`);
  w.document.close(); setTimeout(() => w.print(), 300);
}

/* ---------------- Бейімдеуге дейін және кейін ---------------- */
function beforeHtml(t, L) {
  const stage = L.stages[t.stageIdx ?? L.senStageIdx ?? -1]?.name;
  let body = '';
  if (t.type === 'calc') { const p = parseExpr(t.expr); body = `<p class="sh-i">Есепте.</p><p class="sh-x">${esc(p ? p.expr : t.expr)} = ______</p>`; }
  if (t.type === 'choice') body = `<p class="sh-i">${esc(t.question)}</p><p>${t.options.filter(x => x.trim()).map((o, j) => `${'АӘБВГҒ'[j]}) ${esc(o)}`).join('&nbsp;&nbsp;&nbsp;')}</p>`;
  if (t.type === 'match') { const ps = t.pairs.filter(p => p[0] && p[1]); const r = seededShuffle(ps.map(p => p[1]), 'before' + t.id); body = `<p class="sh-i">${esc(t.question || 'Сәйкестендір.')}</p><div class="sh-cols"><ol>${ps.map(p => `<li>${esc(p[0])}</li>`).join('')}</ol><ol type="a">${r.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>`; }
  if (t.type === 'short') body = `<p class="sh-i">${esc(t.question)}</p><p>Жауабы: ________________</p>`;
  if (t.type === 'text') body = `<p class="sh-t">${esc(t.passage)}</p><p class="sh-i">${esc(t.question)}</p><p>Жауабы: ________________</p>`;
  return `<div class="sh-h">ҚМЖ${stage ? ' · ' + esc(stage) : ''} · ${TYPES[t.type]}</div>${body}`;
}
function tCompare() {
  const L = getLesson(); if (!L) return `<h1>Бейімдеуге дейін және кейін</h1><section class="card"><p>Алдымен сабақты таңдаңыз.</p><button class="btn" data-go="/t/upload">${icon('upload')}Сабақ таңдау</button></section>`;
  const d = getDraft(); const items = draftItems(L, d); const tasks = draftTasks(L);
  if (!items.length) return `<h1>Бейімдеуге дейін және кейін</h1><section class="card"><p>Оқушыға берілетін тапсырма таңдалмаған.</p><button class="btn" data-go="/t/upload">${icon('edit')}Тапсырмаларды белгілеу</button></section>`;
  const S = d.supports || {}; const i = Math.min(state.cmpIdx || 0, items.length - 1);
  return `<div class="row"><h1 style="margin:0">Бейімдеуге дейін және кейін</h1><span class="spacer"></span><button class="btn ghost sm" data-go="/t/adapt">${icon('left')}Бейімдеуге оралу</button></div>
  <p class="muted">Сол жақта ҚМЖ-дағы бастапқы тапсырма. Оң жақта сол тапсырма оқушының көзімен: таңдалған қолдау қосылған, батырмаларды басып көруге болады.</p>
  <div class="row cmptabs" role="tablist" aria-label="Тапсырмалар">${items.map((x, j) => `<button role="tab" aria-selected="${j === i}" class="btn ${j === i ? '' : 'ghost'} sm" data-ci="${j}">${j + 1}. ${esc(TYPES[x.type])}</button>`).join('')}</div>
  ${Object.values(S).some(Boolean) ? '' : '<div class="note w mt">Қолдау түрі әлі таңдалмаған, сондықтан оң жақта өзгеріс аз. «Тапсырманы бейімдеу» бөлімінде қолдау түрлерін таңдаңыз.</div>'}
  <div class="ba mt">
    <section class="ba-col before" aria-label="Бейімдеуге дейін"><h2>Бейімдеуге дейін</h2>
      <div class="sheet">${beforeHtml(tasks[i], L)}</div>
      <ul class="ba-list"><li>ҚМЖ-дағы бастапқы мәтін мен нұсқаулық</li><li>Баспа парақ пішімі, стандартты әріп өлшемі</li><li>Көмек, дыбыстау, көрнекі тірек жоқ</li></ul></section>
    <section class="ba-col after" aria-label="Бейімдеуден кейін"><h2>Бейімдеуден кейін</h2>
      <div class="row small" style="gap:6px;margin-bottom:8px">${SUPPORTS.filter(([k]) => S[k]).map(([, t]) => `<span class="tag g">${t}</span>`).join('')}<span class="tag">+ «Көмек алу», «Контраст», «Әріп өлшемі»</span></div>
      <div id="cmpRight" class="stu-frame"></div></section>
  </div>
  <div class="note g mt goalnote"><b>Оқу мақсаты өзгермейді. Тапсырманың берілу және орындалу тәсілі оқушының қажеттілігіне қарай бейімделеді.</b>${L.objectives ? `<div class="small mt">Оқу мақсаты: ${esc(L.objectives)}</div>` : ''}</div>
  ${d.approved ? '' : '<p class="muted small mt">Бұл жоба. Оқушыға жіберу үшін «Тапсырманы бейімдеу» бөлімінде бекітіңіз.</p>'}`;
}
function bindCompare() {
  const L = getLesson(); if (!L || !$('#cmpRight')) return;
  const d = getDraft(); const i = Math.min(state.cmpIdx || 0, draftItems(L, d).length - 1);
  $$('[data-ci]').forEach(b => b.onclick = () => { state.cmpIdx = +b.dataset.ci; render(); });
  const asg = buildAssignment(L, d, 'preview');
  startRun(asg, 'preview', true); state.run.compare = true; state.run.idx = i; state.run.hc = false;
  renderTask();
}

/* ---------------- Word экспорты ---------------- */
const xesc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function wPara(runs, o = {}) {
  const box = o.box !== false;
  const pPr = (box ? `<w:pBdr>${['top', 'left', 'bottom', 'right'].map(s => `<w:${s} w:val="single" w:sz="12" w:space="4" w:color="178A5E"/>`).join('')}</w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${o.head ? 'CDEBDD' : 'EEF8F3'}"/>` : '') + `<w:spacing w:before="${o.head ? 160 : 0}" w:after="${o.gap ? 80 : 20}" w:line="264" w:lineRule="auto"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr>${runs.map(([text, st = {}]) => { const rp = (st.b || o.head ? '<w:b/>' : '') + (o.head || st.color ? `<w:color w:val="${o.head ? '0F6B48' : st.color}"/>` : '') + (o.head ? '<w:sz w:val="26"/>' : o.size ? `<w:sz w:val="${o.size}"/>` : '');
    return `<w:r>${rp ? `<w:rPr>${rp}</w:rPr>` : ''}<w:t xml:space="preserve">${xesc(String(text).replace(/ /g, ' '))}</w:t></w:r>`; }).join('')}</w:p>`;
}
function senBlockXml(d, items) {
  const S = d.supports || {}; const L2 = (l, v) => wPara([[l + ' ', { b: true }], [v]], { gap: true });
  let x = wPara([['ЕББҚ оқушысына арналған бейімделген тапсырма']], { head: true });
  x += wPara([[d.approved ? '✓ Мұғалім тексеріп, бекітті' : 'Жоба: мұғалім әлі бекітпеген', { color: d.approved ? '0F6B48' : '9A5B00', b: true }]], { gap: true });
  x += wPara([['Қолдау тәсілдері: ', { b: true }], [SUPPORTS.filter(([k]) => S[k]).map(([, t]) => t).join(', ') || '—']], { gap: true });
  items.forEach((it, i) => {
    x += wPara([[`${i + 1}) Бастапқы тапсырма (${TYPES[it.type]}): `, { b: true }], [it.label]], {});
    x += wPara([['      Бейімделген нұсқаулық: ', { b: true }], [it.instruction]], {});
    if (it.explain) x += wPara([['      ' + it.explain]], {});
    if (it.passage) x += wPara([['      Мәтін: ', { b: true }], [it.passage]], {});
    if (it.type === 'choice') x += wPara([['      Нұсқалар: ', { b: true }], [it.options.map((o, j) => `${j + 1}) ${o}`).join('   ')]], {});
    if (it.type === 'match') x += wPara([['      Жұптар: ', { b: true }], [it.left.map((l, j) => `${l} → ${it.rightAns[j]}`).join(';   ')]], {});
    it.hints.forEach((h, j) => { x += wPara([[`      ${j + 1}-қадам: `, { b: true }], [h]], {}); });
    if (it.visual && it.visual.kind === 'text') x += wPara([['      Көрнекі көмек: ', { b: true }], [it.visual.text.replace(/\n/g, '  ')]], {});
    x += wPara([['      Сұрақ: ', { b: true }], [it.question]], { gap: true });
  });
  x += L2('Орындау тәсілі:', draftMethod(d)); x += L2('Бағалау критерийі:', draftCriterion(d));
  x += wPara([['Ескерту: ұсыныс QolJetim AI ережеге негізделген алгоритмі арқылы жасалды (тілдік модель емес); соңғы шешімді мұғалім қабылдайды.', { color: '5A6E69' }]], {});
  return x;
}
function downloadBlob(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function exportWord(L, d) {
  const items = draftItems(L, d); const block = senBlockXml(d, items);
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  let blob;
  if (L.docxB64) {
    const entries = unzipEntries(b64ToBuf(L.docxB64)); const de = entries.find(e => e.name === 'word/document.xml');
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(await inflateEntry(de)), 'application/xml');
    const frag = new DOMParser().parseFromString(`<w:root xmlns:w="${W_NS}">${block}</w:root>`, 'application/xml').documentElement;
    const nodes = [...frag.childNodes].filter(n => n.nodeType === 1).map(n => doc.importNode(n, true));
    const ps = [...doc.getElementsByTagNameNS(W_NS, 'p')];
    let anchor = null; const mi = ps.findIndex(p => SEN_RX.test(pText(p)) && pText(p).length < 80);
    if (mi >= 0) { anchor = ps[mi]; let n = anchor.nextSibling; while (n) { if (n.nodeType === 1 && n.localName === 'p') { const t = pText(n).trim(); if (DIV_RX.test(t) || !t) { if (t) anchor = n; n = n.nextSibling; continue; } } break; } }
    else {
      // Белгі жоқ болса: таңдалған кезеңнің педагог ұяшығының соңына
      const idx = d.stageIdx ?? L.senStageIdx; const st = L.stages[idx];
      if (st) { const key = (st.teacher.split('\n').find(x => x.trim().length > 5) || '').trim().slice(0, 30); const hit = key && ps.find(p => pText(p).includes(key)); if (hit) { const tc = hit.parentNode; const lastP = [...tc.childNodes].filter(n => n.nodeType === 1 && n.localName === 'p').pop(); anchor = lastP; } }
    }
    if (anchor) { let ref = anchor; for (const n of nodes) { ref.parentNode.insertBefore(n, ref.nextSibling); ref = n; } }
    else { const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]; const sect = kids(body, 'sectPr')[0]; for (const n of nodes) body.insertBefore(n, sect || null); }
    let out = new XMLSerializer().serializeToString(doc); if (!out.startsWith('<?xml')) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + out;
    const data = new TextEncoder().encode(out);
    blob = zipBuild(entries.map(e => e.name === 'word/document.xml' ? { name: e.name, method: 0, crc: crc32(data), usize: data.length, data, time: e.time, date: e.date } : { name: e.name, method: e.method, crc: e.crc, usize: e.usize, data: e.raw, time: e.time, date: e.date }), DOCX);
  } else {
    const P = (t, o) => String(t || '').split('\n').map(line => wPara([[line]], { box: false, ...o })).join('') || wPara([['']], { box: false });
    const cell = (inner, w) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="pct"/></w:tcPr>${inner}</w:tc>`;
    const idx = d.stageIdx ?? L.senStageIdx ?? 0;
    const head = `<w:tr>${['Кезең / уақыт', 'Педагогтің әрекеті', 'Оқушының әрекеті', 'Бағалау', 'Ресурстар'].map((h, i) => cell(wPara([[h, { b: true }]], { box: false }), [700, 1800, 1000, 800, 700][i])).join('')}</w:tr>`;
    const rows = L.stages.map((s, i) => `<w:tr>${cell(P(s.name + '\n' + s.time), 700)}${cell(P(s.teacher) + (i === idx ? block : ''), 1800)}${cell(P(s.student), 1000)}${cell(P(s.assessment), 800)}${cell(P(s.resources), 700)}</w:tr>`).join('');
    const tbl = L.stages.length ? `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="999999"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${[1400, 3600, 2000, 1600, 1400].map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${head}${rows}</w:tbl>` : block;
    const body = wPara([[`Қысқа мерзімді жоспар: ${L.subject || ''} ${L.grade ? L.grade + '-сынып' : ''}`]], { box: false, size: 28 }) + wPara([['Тақырып: ', { b: true }], [L.topic]], { box: false }) + (L.objectives ? wPara([['Оқу мақсаты: ', { b: true }], [L.objectives]], { box: false, gap: true }) : '') + tbl + '<w:p/>';
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="${W_NS}"><w:body>${body}<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`;
    const enc = new TextEncoder(); const f = (name, s) => { const data = enc.encode(s); return { name, method: 0, crc: crc32(data), usize: data.length, data }; };
    blob = zipBuild([
      f('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),
      f('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),
      f('word/document.xml', docXml)
    ], DOCX);
  }
  downloadBlob(blob, 'QolJetim_KMZh_beiimdelgen.docx'); toast('Word файлы жүктелді', 'ok');
}

/* ---------------- Оқушылар ---------------- */
function tStudents() {
  const st = students(); const as = Store.get('assignments', {}); const res = Store.get('results', []);
  return `<h1>Оқушылар</h1><p class="muted">Оқушыны шартты белгісімен енгізіңіз (мысалы, «4А-7» немесе «Оқушы Б»). <b>Нақты аты-жөнін және диагнозын жазбаңыз.</b></p>
  <section class="card"><div class="scroll"><table class="tbl"><tr><th>Оқушы</th><th>Педагогикалық ескертпе</th><th>Тапсырма</th><th>Нәтиже</th><th></th></tr>
   ${st.map(s => { const a = as[s.id]; const r = res.filter(x => x.studentId === s.id).slice(-1)[0];
     return `<tr><td><b>${esc(s.name)}</b></td><td><input class="inp" data-note="${s.id}" value="${esc(s.note)}" placeholder="мысалы: нұсқаулықты қысқа берген тиімді"></td>
     <td>${a ? `<span class="tag g">жіберілді ${nowStr(a.sentAt)}</span>` : '<span class="muted small">жоқ</span>'}</td>
     <td>${r ? `${r.correct}/${r.total} дұрыс` : '<span class="muted small">—</span>'}</td>
     <td>${s.id !== 's1' ? `<button class="btn danger sm" data-del="${s.id}" aria-label="Өшіру">${icon('trash')}</button>` : ''}</td></tr>`; }).join('')}
  </table></div>
  <div class="row mt"><input class="inp" id="newStu" placeholder="Шартты белгі, мысалы: 4А-7" style="max-width:340px"><button class="btn" id="addStu">${icon('plus')}Қосу</button></div></section>`;
}
function bindStudents() {
  $('#addStu').onclick = () => { const v = $('#newStu').value.trim(); if (!v) { toast('Шартты белгіні енгізіңіз', 'err'); return; } const s = students(); s.push({ id: 's' + uid(), name: v, note: '' }); Store.set('students', s); toast('Оқушы қосылды', 'ok'); render(); };
  $$('[data-note]').forEach(i => i.onchange = () => { const s = students(); const o = s.find(x => x.id === i.dataset.note); o.note = i.value.trim(); Store.set('students', s); toast('Сақталды', 'ok'); });
  $$('[data-del]').forEach(b => b.onclick = () => { if (!confirm('Оқушы тізімнен өшірілсін бе?')) return; Store.set('students', students().filter(x => x.id !== b.dataset.del)); const a = Store.get('assignments', {}); delete a[b.dataset.del]; Store.set('assignments', a); render(); });
}

/* ---------------- Нәтижелер ---------------- */
function recount(r) { r.correct = r.items.filter(i => i.correct).length; r.done = r.items.filter(i => i.correct || i.pending || i.answered).length; r.pending = r.items.filter(i => i.pending).length; }
function tResults() {
  const res = Store.get('results', []).slice().reverse();
  return `<h1>Нәтижелер</h1><p class="muted">Оқушы тапсырманы аяқтағанда нәтиже осында пайда болады. Басқа құрылғыдағы оқушы нәтижені сілтеме арқылы жібереді.</p>
  <section class="card"><h3>Оқушыдан келген сілтеме</h3><div class="row"><input class="inp" id="impUrl" placeholder="Оқушы жіберген сілтемені осында қойыңыз" style="flex:1;min-width:220px"><button class="btn" id="impBtn">${icon('down')}Нәтижені қосу</button></div><p class="small muted">Сілтемені жай ашсаңыз да, нәтиже автоматты түрде қосылады.</p></section>
  ${res.length ? res.map(r => `<section class="card"><div class="row"><h3 style="margin:0">${esc(r.studentName)}</h3><span class="tag">${nowStr(r.finishedAt)}</span>${r.viaLink ? '<span class="tag w">сілтеме арқылы</span>' : ''}<span class="spacer"></span><span class="muted small">${esc(r.subject ? r.subject + ' · ' : '')}${esc(r.topic)}</span></div>
     <div class="stats six"><div class="stat"><b>${r.done}/${r.total}</b>орындалған тапсырма</div><div class="stat"><b>${r.correct}</b>дұрыс жауап</div><div class="stat"><b>${r.firstTry}</b>бірінші әрекеттен дұрыс</div><div class="stat"><b>${r.items.reduce((s, i) => s + (i.attempts || 0), 0)}</b>барлық әрекет</div><div class="stat"><b>${r.items.reduce((s, i) => s + (i.hints || 0), 0)}</b>ашылған көмек</div><div class="stat"><b>${r.items.filter(i => i.visual).length}</b>көрнекі көмек қолданылған тапсырма</div></div>
     <div class="scroll mt"><table class="tbl"><tr><th>Тапсырма</th><th>Нәтиже</th><th>Әрекет саны</th><th>Ашылған көмек</th><th>Көрнекі көмек</th></tr>
     ${r.items.map((i, j) => `<tr><td><b>${esc(i.original)}</b>${i.answer ? `<div class="small">Оқушының жауабы: «${esc(i.answer)}»</div>` : ''}</td><td>${i.pending ? `<span class="tag w">мұғалім тексереді</span><div class="row mt"><button class="btn sm" data-mark="${r.id}:${j}:1">Дұрыс</button><button class="btn ghost sm" data-mark="${r.id}:${j}:0">Қате</button></div>` : i.correct ? '<span class="tag g">✓ дұрыс</span>' : '<span class="tag w">көмек қажет</span>'}</td><td>${i.attempts}</td><td>${i.hints}</td><td>${i.visual ? 'қолданды' : '—'}</td></tr>`).join('')}</table></div>
     <p class="muted small mt">Қолдау: ${esc(Object.entries(r.supports || {}).filter(([, v]) => v).map(([k]) => SUP_LABEL[k]).join(', ') || '—')}${r.tools ? ' · Оқушы қолданған құралдар: ' + esc(r.tools.join(', ')) : ''}</p></section>`).join('')
    : `<section class="card"><p class="muted">Әзірге нәтиже жоқ. Тапсырманы оқушыға жіберіп, оқушы кабинетінде орындаңыз.</p><button class="btn blue" data-go="/s">${icon('student')}Оқушы кабинетін ашу</button></section>`}
  <div class="note mt">Бұл тек оқу тапсырмасын орындау туралы педагогикалық ақпарат. Ол медициналық немесе психологиялық диагностика емес.</div>
  ${res.length ? `<div class="row mt"><button class="btn danger sm" id="clrRes">${icon('trash')}Нәтижелерді тазалау</button></div>` : ''}`;
}
function bindResults() {
  $('#clrRes') && ($('#clrRes').onclick = () => { if (confirm('Барлық нәтижелер өшірілсін бе?')) { Store.set('results', []); render(); } });
  $('#impBtn').onclick = () => { const v = $('#impUrl').value.trim(); const m = v.match(/#\/t\/import\/([A-Za-z0-9_-]+)/); if (!m) { toast('Сілтеме танылмады. Оқушы жіберген толық сілтемені қойыңыз.', 'err'); return; } importResultLink(m[1]); };
  $$('[data-mark]').forEach(b => b.onclick = () => { const [rid, j, ok] = b.dataset.mark.split(':'); const all = Store.get('results', []); const r = all.find(x => x.id === rid); if (!r) return; const it = r.items[+j]; it.pending = false; it.correct = ok === '1'; it.teacherChecked = true; recount(r); Store.set('results', all); render(); });
}
async function importResultLink(data) {
  try {
    const r = await unpackData(data); if (!r || !r.items) throw new Error('bad');
    const all = Store.get('results', []);
    if (!all.find(x => x.id === r.id)) { r.viaLink = true; all.push(r); Store.set('results', all); toast('Оқушының нәтижесі қосылды', 'ok'); } else toast('Бұл нәтиже бұрын қосылған', '');
  } catch (e) { console.error(e); toast('Нәтиже сілтемесін оқу мүмкін болмады', 'err'); }
  location.replace(baseUrl() + '#/t/results');
}

/* =====================================================================
   ОҚУШЫ КАБИНЕТІ
   ===================================================================== */
function studentShell(body, back) {
  const pv = state.run && state.run.preview && location.hash.includes('/s/preview');
  return `<header class="top"><div class="wrap">
    ${back ? `<button class="btn ghost sm" data-go="${back}" aria-label="Артқа">${icon('left')}Артқа</button>` : ''}
    <button class="logo" data-go="/" aria-label="Басты бетке"><span class="logo-mark">QJ</span>QolJetim AI</button>
    <span class="tag">Оқушы</span><span class="spacer"></span>
    <button class="btn ghost sm" data-go="/">${icon('out')}Шығу</button>
  </div></header>${pv ? `<div class="pvbar"><div class="wrap row"><b>👁 Алдын ала қарау.</b><span>Оқушы тапсырманы осылай көреді. Нәтиже сақталмайды.</span><span class="spacer"></span><button class="btn sm" data-go="/t/adapt">${icon('left')}Мұғалім кабинетіне оралу</button></div></div>` : ''}<main class="wrap stu" style="margin:0 auto">${body}</main>`;
}
async function openAssignmentLink(data) {
  try {
    const asg = assignmentFromPayload(await unpackData(data)); if (!asg || !asg.items || !asg.items.length) throw new Error('bad');
    const all = Store.get('assignments', {}); if (!all.link || all.link.id !== asg.id) { all.link = { ...asg, studentId: 'link', viaLink: true }; Store.set('assignments', all); }
    try { sessionStorage.setItem('qj_sid', 'link'); } catch (e) { }
    location.replace(baseUrl() + '#/s/home');
  } catch (e) {
    console.error(e);
    $('#app').innerHTML = studentShell(`<section class="card mt2"><h2>Сілтеме ашылмады</h2><p>Сілтеме толық көшірілмеген болуы мүмкін. Мұғалімнен сілтемені қайта жіберуді сұра.</p><button class="btn" data-go="/">${icon('home')}Басты бетке</button></section>`, null);
  }
}
function studentRender(sec) {
  const app = $('#app'); const st = students();
  if (sec === 'preview') {
    const L = getLesson(); const d = getDraft();
    if (!L || !draftItems(L, d).length) { app.innerHTML = studentShell('<section class="card mt2"><p>Алдын ала қарау үшін алдымен сабақты таңдап, тапсырмаларды белгілеңіз.</p></section>', '/t/adapt'); return; }
    if (!state.run || !state.run.preview) startRun(buildAssignment(L, d, 'preview'), 'preview', true);
    return renderTask();
  }
  let sid = null; try { sid = sessionStorage.getItem('qj_sid'); } catch (e) { }
  const asAll = Store.get('assignments', {});
  if (sid && sid !== 'link' && !st.find(s => s.id === sid)) sid = null;
  if (sid === 'link' && !asAll.link) sid = null;
  const choices = st.filter(s => asAll[s.id]).concat(asAll.link ? [{ id: 'link', name: 'Сілтеме арқылы келген тапсырма' }] : []);
  if (sec === 'pick' || (!sid && choices.length > 1)) {
    app.innerHTML = studentShell(`<h1>Сен кімсің?</h1><div class="grid2">${(choices.length ? choices : st).map(s => `<button class="btn ghost lg" data-sid="${s.id}">${icon('student')}${esc(s.name)}</button>`).join('')}</div>`, '/');
    $$('[data-sid]').forEach(b => b.onclick = () => { try { sessionStorage.setItem('qj_sid', b.dataset.sid); } catch (e) { } go('/s/home'); });
    return;
  }
  if (!sid) { sid = (choices[0] || st[0]).id; try { sessionStorage.setItem('qj_sid', sid); } catch (e) { } }
  const asg = asAll[sid];
  if (sec === 'task' && asg) { if (!state.run || state.run.asgId !== asg.id || state.run.sid !== sid || state.run.preview) startRun(asg, sid); return renderTask(); }
  if (sec === 'done' && state.run && state.run.finished) return renderDone();
  markTour('student');
  app.innerHTML = studentShell(`<h1>Сәлем, оқушы!</h1>${choices.length > 1 ? `<p class="muted">${esc(studentName(sid))} · <a href="#/s/pick">басқа оқушы</a></p>` : ''}
    <section class="card mt"><h2>Бүгінгі тапсырма</h2>
     ${asg ? `<p style="font-size:19px;margin:4px 0"><b>${esc(asg.subject || 'Сабақ')}${asg.grade ? ' — ' + esc(asg.grade) + '-сынып' : ''}</b></p><p style="font-size:18px">${esc(asg.topic)}</p>
       <p class="muted">${asg.items.length} тапсырма${asg.supports.extraTime ? ' · Асықпа, уақыт жеткілікті' : ''}</p>
       <button class="btn lg" id="startBtn">${icon('right')}Тапсырманы бастау</button>`
      : `<p class="muted" style="font-size:18px">Әзірге тапсырма жоқ. Мұғалім тапсырма жібергенде, ол осында пайда болады.</p><button class="btn ghost" id="refresh">Жаңарту</button>`}
    </section>`, '/');
  $('#startBtn') && ($('#startBtn').onclick = () => { startRun(asg, sid); go('/s/task'); });
  $('#refresh') && ($('#refresh').onclick = () => render());
}
function startRun(asg, sid, preview = false) {
  asg.items.forEach(it => { if (!it.type) it.type = 'calc'; if (it.type === 'calc' && !it.expr) { it.op = ':'; it.expr = `${fmt(it.a)} : ${fmt(it.b)}`; } if (!it.label) it.label = it.original || (it.type === 'calc' ? it.expr + ' = ?' : it.question); if (!it.hints) it.hints = []; });
  state.run = { asgId: asg.id, sid, asg, idx: 0, preview, viaLink: !!asg.viaLink, scale: asg.supports.bigText ? 1.35 : 1, finished: false, tools: new Set(),
    per: asg.items.map(() => ({ attempts: 0, hints: 0, correct: false, firstTry: false, visual: false, solved: false, pending: false, answer: '', choice: null, match: [] })) };
}
function useTool(name) { if (state.run) state.run.tools.add(name); if (!(state.run && state.run.compare)) markTour('tools'); }

/* --- Дыбыстау: жазба → браузер дауысы → шынайы ескерту. Тоқтату және қайта тыңдау. --- */
function stopSpeech() {
  if (window.__qjAudio) { try { window.__qjAudio.pause(); } catch (e) { } window.__qjAudio = null; }
  if (TTS.api) { TTS.cur = null; speechSynthesis.cancel(); }
}
function playerHtml(kind, msg, playing) {
  return `<div class="player note ${kind}" role="status"><span class="pl-msg">${msg}</span><span class="spacer"></span>${playing ? '<button class="btn ghost sm" data-pl="stop">⏹ Тоқтату</button>' : ''}<button class="btn ghost sm" data-pl="again">↻ ${playing ? 'Басынан' : 'Қайта тыңдау'}</button></div>`;
}
function speakItem() {
  const R = state.run, it = R.asg.items[R.idx], P = R.per[R.idx], S = R.asg.supports;
  const box = $('#ttsMsg'); if (!box) return;
  stopSpeech(); useTool('Мәтінді тыңдау');
  const set = (kind, msg, playing) => { if (!document.body.contains(box)) return; box.innerHTML = playerHtml(kind, msg, playing); box.querySelector('[data-pl="stop"]') && (box.querySelector('[data-pl="stop"]').onclick = () => { stopSpeech(); set('', 'Дыбыс тоқтатылды.', false); }); box.querySelector('[data-pl="again"]').onclick = speakItem; };
  const hintsText = it.hints.slice(0, P.hints).map((h, i) => `${i + 1}-қадам. ${h}`).join(' ');
  const speakTTS = (text, after) => {
    const err = TTS.speak(text, (st, code) => {
      if (st === 'wait') set('', 'Дауыс қосылып жатыр…', true);
      else if (st === 'playing') set('g', `🔊 Оқылып жатыр (${esc(TTS.voice.name)}). Естілмесе, құрылғының дыбысын тексеріңіз.`, true);
      else if (st === 'end') { if (after) after(); else set('', '✓ Оқылып болды.', false); }
      else if (st === 'error') set('w', `Дыбыстау кезінде қате шықты (${esc(code || 'белгісіз')}). Интернетті тексеріп, қайта басыңыз.`, false);
      else set('w', 'Дыбыс басталмады. Құрылғының және браузер қойындысының дыбысы қосулы ма, интернет бар ма, тексеріңіз.', false);
    });
    if (err) set('w', esc(rec ? err : 'Бұл тапсырмаға жазылған дауыс жоқ, ал осы браузерде қазақ тілді дауыс табылмады, сондықтан мәтін дыбысталмайды. Басқа тілдегі дауысты қазақша деп ұсынбаймыз. Шешімі: платформаны Microsoft Edge-те (интернетпен) ашу немесе мұғалім «Дауыс жазу» арқылы өз дауысын жазып қою.'), false);
  };
  const rec = playableRec(it, S);
  if (rec) {
    const au = new Audio(rec); window.__qjAudio = au; let started = false;
    const t = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const msg = () => `🔊 Жазылған дауыс: ${t(au.currentTime)}${isFinite(au.duration) ? ' / ' + t(au.duration) : ''}. Естілмесе, құрылғының дыбысын тексеріңіз.`;
    au.ontimeupdate = () => { if (window.__qjAudio !== au) return; if (au.currentTime > 0.15) started = true; const m = box.querySelector('.pl-msg'); if (m && started) m.textContent = msg(); };
    au.onplaying = () => { if (window.__qjAudio === au) set('g', 'Жазба ойнатылуда…', true); };
    au.onended = () => { if (window.__qjAudio !== au) return; window.__qjAudio = null; if (P.hints && TTS.voice) speakTTS(hintsText); else set('', '✓ Тыңдап болдың.' + (P.hints && !TTS.voice ? ' (Көмек қадамдарын өзің оқы.)' : ''), false); };
    au.onerror = () => { if (window.__qjAudio === au) set('w', 'Жазылған дауысты ойнату мүмкін болмады. Браузерді жаңартып, қайта басыңыз.', false); };
    au.play().then(() => setTimeout(() => { if (window.__qjAudio === au && !started && !au.paused) set('w', 'Дыбыс ойнатылмады (жазба басталмады). Қайта басып көріңіз.', false); }, 3000))
      .catch(() => set('w', 'Браузер дыбысты ойнатуға рұқсат бермеді. Батырманы қайта басыңыз.', false));
    return;
  }
  speakTTS(speechCore(it) + (hintsText ? ' ' + hintsText : ''));
}
function answerArea(it, P) {
  const dis = P.solved ? 'disabled' : '';
  const check = `<button class="btn lg" type="submit" ${dis}>${icon('check')}Жауапты тексеру</button>`;
  if (it.type === 'calc') return `<form class="answer" id="ansForm" autocomplete="off"><label for="ans">Жауап:</label><input id="ans" inputmode="numeric" ${dis} aria-label="Жауап">${it.remainder ? `<label for="rem">қалдық:</label><input id="rem" inputmode="numeric" ${dis} aria-label="Қалдық">` : ''}${check}</form>`;
  if (it.type === 'choice') return `<form id="ansForm"><div class="choices" role="radiogroup" aria-label="Жауап нұсқалары">${it.options.map((o, j) => `<button type="button" class="choice ${P.choice === j ? 'on' : ''}" role="radio" aria-checked="${P.choice === j}" data-ch="${j}" ${dis}><span class="cl">${'АӘБВГҒ'[j]}</span><span>${esc(o)}</span></button>`).join('')}</div><div class="row mt" style="justify-content:center">${check}</div></form>`;
  if (it.type === 'match') return `<form id="ansForm"><div class="matchrows">${it.left.map((l, j) => `<div class="mrow" id="mr${j}"><span class="ml">${esc(l)}</span><span aria-hidden="true">→</span><select class="inp msel" data-m="${j}" ${dis} aria-label="${esc(l)} үшін сәйкесін таңда"><option value="">Таңда…</option>${it.rightOpts.map(r => `<option ${P.match[j] === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select><span class="mmark" id="mm${j}"></span></div>`).join('')}</div><div class="row mt" style="justify-content:center">${check}</div></form>`;
  return `<form class="answer txt" id="ansForm" autocomplete="off"><label for="ans">Жауап:</label><input id="ans" ${dis} value="${esc(P.answer)}" aria-label="Жауап">${check}</form>`;
}
function helpBtnHtml(it, P) {
  if (!it.hints.length) return '';
  const left = it.hints.length - P.hints;
  return `<button class="btn help lg" id="helpBtn" ${left <= 0 ? 'disabled' : ''}>${icon('bulb')}${left <= 0 ? 'Барлық көмек ашылды' : `Көмек алу <span class="hcnt">${P.hints + 1}/${it.hints.length}</span>`}</button>`;
}
function taskSectionHtml() {
  const R = state.run, asg = R.asg, it = asg.items[R.idx], P = R.per[R.idx], S = asg.supports, n = asg.items.length;
  const hc = R.compare ? !!R.hc : !!Store.get('contrast', false);
  return `${R.compare ? '' : `<div class="row stuhead"><b class="pcount">${R.idx + 1}/${n} тапсырма</b><span class="spacer"></span><span class="ptopic">${esc(asg.subject || '')}${asg.subject ? ' · ' : ''}${esc(asg.topic)}</span></div>
   <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${R.idx + (P.solved ? 1 : 0)}" aria-label="Прогресс"><i style="width:${((R.idx + (P.solved ? 1 : 0)) / n) * 100}%"></i></div>`}
   <section class="card ${R.compare ? '' : 'mt'} taskbox" style="--scale:${R.scale}">
     <div class="tools" role="toolbar" aria-label="Қолжетімділік құралдары">
       <div class="fontctl" role="group" aria-label="Әріп өлшемі"><button class="fbtn" id="aMinus" aria-label="Әріпті кішірейту" title="Әріпті кішірейту">А−</button><span class="flabel">Әріп өлшемі</span><button class="fbtn" id="aPlus" aria-label="Әріпті үлкейту" title="Әріпті үлкейту">А+</button></div>
       <button class="btn listen" id="hcBtn" aria-pressed="${hc}">${icon('contrast')}<span>Контраст${hc ? ': қосулы' : ''}</span></button>
       ${S.tts ? `<button class="btn listen" id="speak">${icon('speaker')}Мәтінді тыңдау</button>` : ''}
     </div>
     <div id="ttsMsg"></div>
     <div class="ttype">${TYPES[it.type]}</div>
     ${it.type === 'calc' ? `<div class="expr" aria-label="Тапсырма">${esc(it.expr)} = ?</div>` : ''}
     <div class="instr">${esc(it.instruction)}</div>
     ${it.explain ? `<div class="explain">${esc(it.explain)}</div>` : ''}
     ${it.passage ? `<div class="passage" aria-label="Мәтін">${esc(it.passage)}</div>` : ''}
     ${it.type !== 'calc' ? `<p class="qtext">${esc(it.question)}</p>` : `<p style="text-align:center;font-weight:700;margin-top:14px" class="instr">${esc(it.question)}</p>`}
     ${S.extraTime ? '<p class="muted small" style="text-align:center">⏳ Асықпа, уақыт шектелмейді.</p>' : ''}
     ${answerArea(it, P)}
     <div id="fb">${P.solved ? fbHtml(P.pending ? 'pending' : 'ok') : ''}</div>
     <div class="helprow">${helpBtnHtml(it, P)}${it.visual ? `<button class="btn soft lg" id="visBtn">${icon('grid')}Көрнекі көмек</button>` : ''}</div>
     <div id="hints" aria-live="polite">${it.hints.slice(0, P.hints).map((h, i) => `<div class="hint"><small>${i + 1}-көмек</small>${esc(h)}</div>`).join('')}</div>
     <div id="vis"></div>
     <div class="row mt" style="justify-content:center" id="navRow">${navButtons()}</div>
   </section>`;
}
function renderTask() {
  stopSpeech();
  const R = state.run;
  if (R.compare) { const host = $('#cmpRight'); if (!host) return; host.innerHTML = taskSectionHtml(); host.classList.toggle('hc', !!R.hc); bindTask(); if (R.visOpen) showVisual(true); return; }
  document.body.classList.toggle('hc', !!Store.get('contrast', false));
  $('#app').innerHTML = studentShell(taskSectionHtml(), R.preview ? null : '/s/home');
  bindTask();
  const it = R.asg.items[R.idx], P = R.per[R.idx];
  if (!P.solved && (it.type === 'calc' || it.type === 'short' || it.type === 'text')) setTimeout(() => $('#ans')?.focus({ preventScroll: true }), 50);
  if (R.visOpen) showVisual(true);
}
function fbHtml(kind, extra = '') {
  if (kind === 'ok') return '<div class="fb ok" role="status">🎉 Жарайсың! Дұрыс жауап!</div>';
  if (kind === 'pending') return '<div class="fb ok" role="status">✓ Жауабың сақталды. Оны мұғалім тексереді.</div>';
  if (kind === 'invalid') return `<div class="fb no" role="status">${extra || 'Алдымен жауабыңды енгіз.'}</div>`;
  return `<div class="fb no" role="status">Қайта байқап көр. Қажет болса, көмек ал.${extra ? `<div class="small" style="margin-top:6px">${extra}</div>` : ''}</div>`;
}
function navButtons() {
  const R = state.run, P = R.per[R.idx], n = R.asg.items.length;
  if (R.compare) return P.solved || P.attempts || P.hints ? `<button class="btn ghost" id="resetTask">↻ Тапсырманы қайта бастау</button>` : '';
  if (P.solved) return R.idx < n - 1 ? `<button class="btn lg blue" id="nextTask">Келесі тапсырма${icon('right')}</button>` : `<button class="btn lg blue" id="finish">${icon('star')}Аяқтау</button>`;
  if (P.attempts >= 3) return R.idx < n - 1 ? '<button class="btn ghost" id="skipTask">Бұл тапсырманы кейін мұғаліммен бірге орындау · келесіге өту</button>' : '<button class="btn ghost" id="finish">Аяқтау</button>';
  return '';
}
function bindTask() {
  const R = state.run, it = R.asg.items[R.idx], P = R.per[R.idx];
  const box = $('.taskbox');
  const setScale = v => { R.scale = Math.max(0.8, Math.min(2.2, Math.round(v * 100) / 100)); box.style.setProperty('--scale', R.scale); useTool('Әріп өлшемі'); };
  $('#aPlus').onclick = () => setScale(R.scale + 0.15);
  $('#aMinus').onclick = () => setScale(R.scale - 0.15);
  $('#hcBtn').onclick = () => {
    let v; if (R.compare) { R.hc = v = !R.hc; $('#cmpRight').classList.toggle('hc', v); } else { v = !Store.get('contrast', false); Store.set('contrast', v); document.body.classList.toggle('hc', v); }
    const b = $('#hcBtn'); b.setAttribute('aria-pressed', v); b.querySelector('span').textContent = 'Контраст' + (v ? ': қосулы' : ''); useTool('Контраст');
  };
  $('#speak') && ($('#speak').onclick = speakItem);
  const showHint = () => {
    if (P.hints >= it.hints.length) return; useTool('Көмек алу'); P.hints++; const i = P.hints - 1;
    $('#hints').insertAdjacentHTML('beforeend', `<div class="hint"><small>${i + 1}-көмек</small>${esc(it.hints[i])}</div>`);
    $('.helprow').innerHTML = helpBtnHtml(it, P) + (it.visual ? `<button class="btn soft lg" id="visBtn">${icon('grid')}Көрнекі көмек</button>` : '');
    bindHelpRow(); $('#hints .hint:last-child').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const bindHelpRow = () => { $('#helpBtn') && ($('#helpBtn').onclick = showHint); $('#visBtn') && ($('#visBtn').onclick = () => { useTool('Көрнекі көмек'); showVisual(!R.visOpen); }); };
  bindHelpRow();
  $$('[data-ch]').forEach(b => b.onclick = () => { if (P.solved) return; P.choice = +b.dataset.ch; $$('[data-ch]').forEach(x => { const on = +x.dataset.ch === P.choice; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); });
  $$('.msel').forEach(s => s.onchange = () => { P.match[+s.dataset.m] = s.value; $(`#mm${s.dataset.m}`).textContent = ''; $(`#mr${s.dataset.m}`).classList.remove('bad'); });
  $('#ansForm').onsubmit = e => {
    e.preventDefault(); if (P.solved) return;
    const ans = { value: $('#ans')?.value, rem: $('#rem')?.value, choice: P.choice, match: it.type === 'match' ? it.left.map((_, j) => P.match[j] || '') : [], text: $('#ans')?.value };
    const r = checkAnswer(it, ans);
    if (r.status === 'invalid') { $('#fb').innerHTML = fbHtml('invalid', it.type === 'calc' ? 'Жауапты цифрмен жаз.' : it.type === 'choice' ? 'Алдымен бір жауапты таңда.' : it.type === 'match' ? 'Әр сөзге сәйкесін таңда.' : 'Алдымен жауабыңды жаз.'); return; }
    P.attempts++;
    if (it.type === 'short' || it.type === 'text') P.answer = ans.text.trim();
    if (r.status === 'ok' || r.status === 'pending') {
      P.solved = true; P.correct = r.status === 'ok'; P.pending = r.status === 'pending'; P.firstTry = P.correct && P.attempts === 1;
      $$('#ansForm input, #ansForm button, #ansForm select').forEach(x => x.disabled = true);
      if (it.type === 'match') it.left.forEach((_, j) => { $(`#mm${j}`).textContent = '✓'; });
      const pb = $('.progress>i'); if (pb) pb.style.width = ((R.idx + 1) / R.asg.items.length * 100) + '%';
      $('#fb').innerHTML = fbHtml(r.status);
    } else {
      let extra = '';
      if (it.type === 'calc' && r.v > 0) {
        if (it.op === ':') { const prod = r.v * it.b; const big = prod > it.a, small = it.a - prod >= it.b; if (big || small) extra = `Тексеріп көр: ${fmt(r.v)} × ${fmt(it.b)} = ${fmt(prod)}. Бұл ${abl(it.a)} ${big ? 'көп, кішірек' : 'аз, үлкенірек'} сан керек.`; }
        else extra = `Жауабың дұрыс жауаптан ${r.v > it.answer ? 'үлкен' : 'кіші'}. Қайта есептеп көр.`;
      }
      if (it.type === 'match') { r.marks.forEach((ok, j) => { $(`#mm${j}`).textContent = ok ? '✓ дұрыс' : '✗ қайта таңда'; $(`#mr${j}`).classList.toggle('bad', !ok); }); extra = `${r.marks.length} жұптың ${r.right}-і дұрыс.`; }
      if (it.hints.length && P.hints < it.hints.length) extra += (extra ? ' ' : '') + 'Төмендегі «Көмек алу» батырмасы көмектеседі.';
      $('#fb').innerHTML = fbHtml('no', extra);
      $('#ans')?.select?.();
    }
    $('#navRow').innerHTML = navButtons(); bindNav();
  };
  bindNav();
}
function bindNav() {
  const R = state.run;
  const nextT = () => { R.idx++; R.visOpen = false; renderTask(); window.scrollTo(0, 0); };
  $('#nextTask') && ($('#nextTask').onclick = nextT);
  $('#skipTask') && ($('#skipTask').onclick = nextT);
  $('#finish') && ($('#finish').onclick = finishRun);
  $('#resetTask') && ($('#resetTask').onclick = () => { R.per[R.idx] = { attempts: 0, hints: 0, correct: false, firstTry: false, visual: false, solved: false, pending: false, answer: '', choice: null, match: [] }; R.visOpen = false; renderTask(); });
}

function showVisual(open) {
  const R = state.run, it = R.asg.items[R.idx]; R.visOpen = open; const box = $('#vis');
  if (!open) { box.innerHTML = ''; return; }
  R.per[R.idx].visual = true; const v = it.visual; if (!v) return;
  if (v.kind === 'text') { box.innerHTML = `<div class="vistext">${esc(v.text)}</div>`; return; }
  if (v.kind === 'dots') {
    const dot = c => `<i class="dot ${c}"></i>`;
    box.innerHTML = v.op === '+' ? `<p style="text-align:center" class="mt">${fmt(v.a)} көк нүкте және ${fmt(v.b)} жасыл нүкте. Барлығын санап көр.</p><div class="dots">${dot('a').repeat(v.a)}<span class="plus">+</span>${dot('b').repeat(v.b)}</div>`
      : `<p style="text-align:center" class="mt">${fmt(v.a)} нүкте бар. ${fmt(v.b)} нүктені басып, сызып таста. Қаншасы қалды?</p><div class="dots" id="dotsBox">${Array.from({ length: v.a }, (_, i) => `<button class="dot a" aria-label="${i + 1}-нүкте" data-dot></button>`).join('')}</div><p class="small muted" style="text-align:center" id="dotCnt"></p>`;
    $$('[data-dot]').forEach(d => d.onclick = () => { d.classList.toggle('x'); $('#dotCnt').textContent = `Сызылғаны: ${$$('[data-dot].x').length}`; });
    return;
  }
  const { groups, per } = v;
  box.innerHTML = `<p style="text-align:center" class="mt">Барлығы <b>${fmt(v.total || it.a)}</b> шеңбер. Әр топта <b>${per}</b> шеңбер. Неше топ бар? Санап көр.</p>
   <div class="vis" aria-label="Әр топта ${per} шеңбер">${Array.from({ length: groups }, () => `<div class="grp">${'<i></i>'.repeat(per)}</div>`).join('')}</div>
   <p class="small muted" style="text-align:center">Әр топты басып, өзің сана.</p><div class="row mt" style="justify-content:center"><button class="btn ghost sm" id="countBtn">Санауды қайта бастау</button></div>`;
  let cnt = 0;
  $$('.grp').forEach(g => { g.style.cursor = 'pointer'; g.setAttribute('role', 'button'); g.tabIndex = 0;
    const mark = () => { if (g.querySelector('em')) return; cnt++; g.insertAdjacentHTML('beforeend', `<em>${cnt}</em>`); };
    g.onclick = mark; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mark(); } }; });
  $('#countBtn').onclick = () => { cnt = 0; $$('.grp em').forEach(x => x.remove()); };
}
function finishRun() {
  const R = state.run, asg = R.asg; R.finished = true;
  const rec = { id: uid(), studentId: R.sid, studentName: studentName(R.sid), assignmentId: asg.id, subject: asg.subject, topic: asg.topic, finishedAt: Date.now(), supports: asg.supports, tools: [...R.tools], preview: R.preview,
    total: asg.items.length, firstTry: R.per.filter(p => p.firstTry).length, hints: R.per.reduce((s, p) => s + p.hints, 0),
    items: asg.items.map((it, i) => ({ original: it.label, type: it.type, correct: R.per[i].correct, pending: R.per[i].pending, answered: R.per[i].solved, attempts: R.per[i].attempts, hints: R.per[i].hints, visual: R.per[i].visual, answer: R.per[i].answer || '' })) };
  recount(rec);
  if (!R.preview) { const all = Store.get('results', []); all.push(rec); Store.set('results', all); }
  R.result = rec;
  if (R.preview) { renderDone(); return; }
  go('/s/done');
}
function renderDone() {
  const R = state.run, r = R.result;
  $('#app').innerHTML = studentShell(`<section class="card big-done mt"><div class="medal">${icon('star')}</div><h1>Тапсырмалар орындалды!</h1>
    <p class="muted" style="font-size:18px">${r.done === r.total ? 'Сен барлық тапсырманы орындадың. Жарайсың!' : 'Сен жақсы жұмыс істедің! Қалған тапсырманы мұғаліммен бірге орындаймыз.'}</p>
    <div class="stats"><div class="stat"><b>${r.done}/${r.total}</b>орындалған тапсырма</div><div class="stat"><b>${r.correct}</b>дұрыс жауап</div><div class="stat"><b>${r.hints}</b>қолданылған көмек</div></div>
    ${R.preview ? '<p class="muted small mt">Бұл алдын ала қарау еді, нәтиже сақталмады.</p><div class="row mt" style="justify-content:center"><button class="btn lg" data-go="/t/adapt">' + icon('left') + 'Мұғалім кабинетіне оралу</button></div>'
      : R.viaLink ? `<div class="note mt" style="text-align:left"><b>Нәтижені мұғалімге жібер.</b> Төмендегі сілтемені көшіріп, мұғаліміңе жібер.<div id="retBox" class="mt">Сілтеме жасалып жатыр…</div></div>`
      : '<p class="muted small mt">Нәтиже мұғалімге жіберілді.</p>'}
    ${!R.preview ? `<div class="row mt" style="justify-content:center"><button class="btn lg ${R.viaLink ? 'ghost' : ''}" data-go="/s/home">${icon('home')}Басты бетке</button></div>` : ''}
    ${FEEDBACK_URL && !R.viaLink ? `<p class="mt"><a class="btn soft" href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener" data-fb="1">${icon('star')}Мұғалім ретінде пікір қалдыру</a></p>` : ''}</section>`, null);
  if (R.viaLink) packData(r).then(p => { const url = baseUrl() + '#/t/import/' + p; $('#retBox').innerHTML = `<input class="inp" readonly value="${esc(url)}" aria-label="Нәтиже сілтемесі"><div class="row mt"><button class="btn" id="retCopy">${icon('check')}Сілтемені көшіру</button>${navigator.share ? `<button class="btn ghost" id="retShare">${icon('send')}Бөлісу</button>` : ''}</div>`;
    $('#retCopy').onclick = async () => toast(await copyText(url) ? 'Көшірілді. Енді мұғаліміңе жібер.' : 'Көшіру мүмкін болмады, сілтемені қолмен белгілеп ал', 'ok');
    $('#retShare') && ($('#retShare').onclick = () => navigator.share({ title: 'QolJetim AI нәтиже', url }).catch(() => { })); });
}

/* ---------------- Іске қосу ---------------- */
TTS.init();
render();
