/* =====================================================================
   Тапсырма модельдері мен бейімдеу — ЕРЕЖЕГЕ НЕГІЗДЕЛГЕН (тілдік модель емес)
   ===================================================================== */
const TYPES = {
  calc: 'Есептеу',
  choice: 'Дұрыс жауапты таңдау',
  match: 'Сәйкестендіру',
  short: 'Қысқа жауап',
  text: 'Мәтінмен жұмыс'
};
const SUPPORTS = [
  ['simple', 'Қарапайым тілмен түсіндіру'], ['steps', 'Қадамдап орындау'], ['bigText', 'Әріпті үлкейту'],
  ['tts', 'Мәтінді дыбыстау'], ['visual', 'Көрнекі көмек'], ['extraTime', 'Қосымша уақыт'], ['short', 'Қысқа нұсқаулық'],
  ['fewer', 'Жауап нұсқаларын азайту']
];
const SUP_LABEL = Object.fromEntries(SUPPORTS);

/* --- Қазақ тіліндегі сан жалғаулары --- */
const KZ_U = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'];
const KZ_T = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];
const DAT = { 'бір': 'ге', 'екі': 'ге', 'үш': 'ке', 'төрт': 'ке', 'бес': 'ке', 'алты': 'ға', 'жеті': 'ге', 'сегіз': 'ге', 'тоғыз': 'ға', 'он': 'ға', 'жиырма': 'ға', 'отыз': 'ға', 'қырық': 'қа', 'елу': 'ге', 'алпыс': 'қа', 'жетпіс': 'ке', 'сексен': 'ге', 'тоқсан': 'ға', 'жүз': 'ге', 'мың': 'ға', 'миллион': 'ға', 'нөл': 'ге' };
const ABL = { 'бір': 'ден', 'екі': 'ден', 'үш': 'тен', 'төрт': 'тен', 'бес': 'тен', 'алты': 'дан', 'жеті': 'ден', 'сегіз': 'ден', 'тоғыз': 'дан', 'он': 'нан', 'жиырма': 'дан', 'отыз': 'дан', 'қырық': 'тан', 'елу': 'ден', 'алпыс': 'тан', 'жетпіс': 'тен', 'сексен': 'нен', 'тоқсан': 'нан', 'жүз': 'ден', 'мың': 'нан', 'миллион': 'нан', 'нөл': 'ден' };
const ACC = { 'бір': 'ді', 'екі': 'ні', 'үш': 'ті', 'төрт': 'ті', 'бес': 'ті', 'алты': 'ны', 'жеті': 'ні', 'сегіз': 'ді', 'тоғыз': 'ды', 'он': 'ды', 'жиырма': 'ны', 'отыз': 'ды', 'қырық': 'ты', 'елу': 'ді', 'алпыс': 'ты', 'жетпіс': 'ті', 'сексен': 'ді', 'тоқсан': 'ды', 'жүз': 'ді', 'мың': 'ды', 'миллион': 'ды', 'нөл': 'ді' };
function lastWord(n) { n = Math.abs(n); if (n === 0) return 'нөл'; if (n % 10) return KZ_U[n % 10]; if (n % 100) return KZ_T[(n % 100) / 10]; if (n % 1000) return 'жүз'; if (n % 1e6) return 'мың'; return 'миллион'; }
const dat = n => fmt(n) + '-' + DAT[lastWord(n)];
const abl = n => fmt(n) + '-' + ABL[lastWord(n)];
const acc = n => fmt(n) + '-' + ACC[lastWord(n)];

/* --- Өрнекті талдау: 120 : 12, 25 + 17, 300 − 45, 12 × 4 --- */
const EXPR_RX = new RegExp('^\\s*(?:\\d+\\s*[\\).]\\s*)?' + NUM + '\\s*([:÷/×xх*·+−\\-])\\s*' + NUM + '\\s*(?:=.*)?$', 'i');
function parseExpr(s) {
  const m = String(s || '').match(EXPR_RX); if (!m) return null;
  const a = toInt(m[1]), b = toInt(m[3]); let op = m[2];
  op = /[:÷/]/.test(op) ? ':' : /[×xх*·]/i.test(op) ? '×' : op === '+' ? '+' : '−';
  if (isNaN(a) || isNaN(b)) return null;
  if (op === ':' && b === 0) return null;
  if (op === '−' && b > a) return null;
  const answer = op === ':' ? Math.floor(a / b) : op === '×' ? a * b : op === '+' ? a + b : a - b;
  return { a, b, op, answer, remainder: op === ':' ? a % b : 0, expr: `${fmt(a)} ${op} ${fmt(b)}` };
}
const isDivisionLine = s => !!(parseExpr(s) && parseExpr(s).op === ':');

/* --- Тапсырма идентификаторы (бөлу үшін 120_12 — жазылған дауыстармен үйлесімді) --- */
function taskId(t) { if (t.type === 'calc') { const p = parseExpr(t.expr); if (p && p.op === ':') return `${p.a}_${p.b}`; } return t.id || ('t' + uid()); }
function newTask(type, extra = {}) {
  const base = { id: 't' + uid(), type, selected: true, origin: 'manual', question: '', steps: [], simple: '', visual: '' };
  if (type === 'calc') base.expr = '';
  if (type === 'choice') { base.options = ['', '', '']; base.correct = 0; }
  if (type === 'match') base.pairs = [['', ''], ['', ''], ['', '']];
  if (type === 'short') { base.answers = []; base.keywords = []; }
  if (type === 'text') { base.passage = ''; base.answers = []; base.keywords = []; }
  return { ...base, ...extra };
}
function taskFromLine(text, stageIdx) {
  const p = parseExpr(text);
  if (p) return newTask('calc', { expr: p.expr, origin: 'doc', stageIdx });
  return newTask('short', { question: text.replace(/\s+/g, ' ').trim(), origin: 'doc', stageIdx });
}
/* Тапсырманың тексерілуі (мұғалім сақтамас бұрын) */
function validateTask(t) {
  if (t.type === 'calc') return parseExpr(t.expr) ? '' : 'Өрнекті «120 : 12» немесе «25 + 17» түрінде жазыңыз (екі сан және бір амал).';
  if (t.type === 'choice') {
    if (!t.question.trim()) return 'Сұрақты жазыңыз.';
    const opts = t.options.map(x => x.trim());
    if (opts.filter(Boolean).length < 2) return 'Кемінде екі жауап нұсқасын жазыңыз.';
    if (!opts[t.correct]) return 'Дұрыс жауапты белгілеңіз.';
    return '';
  }
  if (t.type === 'match') {
    const ps = t.pairs.filter(p => p[0].trim() && p[1].trim());
    if (ps.length < 2) return 'Кемінде екі толық жұп жазыңыз.';
    const rights = ps.map(p => norm(p[1]));
    if (new Set(rights).size !== rights.length) return 'Оң жақтағы мәндер қайталанбауы керек.';
    return '';
  }
  if (t.type === 'short') return t.question.trim() ? '' : 'Сұрақты жазыңыз.';
  if (t.type === 'text') return !t.passage.trim() ? 'Мәтінді енгізіңіз.' : !t.question.trim() ? 'Мәтінге сұрақ жазыңыз.' : '';
  return 'Белгісіз тапсырма түрі.';
}
/* Мәтінді салыстыру үшін қалыпқа келтіру */
function norm(s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[.,!?;:«»"'()\-–—…]/g, ' ').replace(/\s+/g, ' ').trim(); }

/* Бастапқы тапсырманың мәтіні (салыстыру мен Word үшін) */
function originalText(t) {
  if (t.type === 'calc') { const p = parseExpr(t.expr); return p ? `${p.expr} = ?` : t.expr; }
  if (t.type === 'choice') return `${t.question} ${t.options.filter(x => x.trim()).map((o, i) => `${'АӘБВГ'[i] || i + 1}) ${o}`).join('; ')}`;
  if (t.type === 'match') return `${t.question || 'Сәйкестендір.'} ${t.pairs.filter(p => p[0] && p[1]).map(p => `${p[0]} → ${p[1]}`).join('; ')}`;
  if (t.type === 'text') return `${t.passage} Сұрақ: ${t.question}`;
  return t.question;
}
function shortLabel(t) {
  if (t.type === 'calc') { const p = parseExpr(t.expr); return p ? `${p.expr} = ?` : t.expr; }
  const q = t.type === 'match' ? (t.question || 'Сәйкестендіру') : t.question;
  return q.length > 70 ? q.slice(0, 68) + '…' : q;
}

/* Детерминирленген араластыру (сәйкестендіру үшін) */
function seededShuffle(arr, seed) {
  let h = 2166136261; for (const ch of String(seed)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  if (a.length > 1 && a.every((x, i) => x === arr[i])) a.push(a.shift());
  return a;
}

/* --- Бейімдеу: бір тапсырма + таңдалған қолдау → оқушыға арналған нұсқа --- */
function adaptTask(t, S) {
  const id = taskId(t);
  const it = { id, type: t.type, original: originalText(t), label: shortLabel(t), instruction: '', explain: '', hints: [], question: '', visual: null };
  const own = (t.steps || []).filter(Boolean);
  if (t.type === 'calc') {
    const p = parseExpr(t.expr); const { a, b, op } = p;
    Object.assign(it, { a, b, op, answer: p.answer, remainder: p.remainder, expr: p.expr });
    if (op === ':') {
      const q = p.answer, r = p.remainder;
      it.instruction = S.short ? `${fmt(a)} санын ${dat(b)} бөл.` : `${fmt(a)} санын ${dat(b)} бөліп, бөліндіні тап. Жауабыңды көбейту арқылы тексер.`;
      it.explain = S.simple ? `Бөлу дегеніміз — барлығын тең топтарға бөлу. ${fmt(a)} затты ${abl(b)} топқа саламыз. Неше топ шығатынын табамыз.` : '';
      {
        it.hints.push(`Ойлан: ${acc(b)} нешеге көбейтсек, ${fmt(a)} шығады?`);
        const pr = q >= 2 ? Math.floor(q / 2) : 0;
        if (pr) it.hints.push(`Байқап көр: ${fmt(b)} × ${fmt(pr)} = ${fmt(b * pr)}. Бұл ${abl(a)} аз — үлкенірек санды көбейтіп көр.`);
        it.hints.push(`Тексеру тәсілі: өз жауабыңды ${dat(b)} көбейт. ${r ? 'Шыққан санға қалдықты қосқанда' : 'Нәтижесінде'} ${fmt(a)} шықса — жауабың дұрыс.`);
        if (r) it.hints.push(`Есіңде болсын: қалдық ${abl(b)} кіші болуы керек.`);
        if (own.length) it.hints = own.slice();
      }
      it.question = r ? `${fmt(a)} : ${fmt(b)} — бөлінді мен қалдықты тап.` : `${fmt(a)} : ${fmt(b)} нешеге тең?`;
      if (S.visual) it.visual = r === 0 && q <= 12 && b <= 40 ? { kind: 'groups', groups: q, per: b, total: a } : (t.visual ? { kind: 'text', text: t.visual } : null);
    } else {
      it.instruction = S.short ? `Есепте: ${p.expr}.` : `${p.expr} өрнегінің мәнін тап. Жауабыңды кері амалмен тексер.`;
      const name = { '+': 'Қосу', '−': 'Азайту', '×': 'Көбейту' }[op];
      it.explain = S.simple ? ({ '+': 'Қосу дегеніміз — екі санды біріктіру. Нәтиже әр саннан үлкен болады.', '−': 'Азайту дегеніміз — бір саннан екіншісін алып тастау. Нәтиже азайғыштан кіші болады.', '×': `Көбейту дегеніміз — бірдей сандарды бірнеше рет қосу: ${fmt(a)} санын ${fmt(b)} рет қосамыз.` }[op]) : '';
      it.hints = own.length ? own.slice() : ({
        '+': ['Сандарды разрядтары бойынша астын-астына жаз.', 'Бірліктерден бастап қос. 10-нан асса, ондықты келесі разрядқа көшір.', 'Тексер: жауабыңнан бір қосылғышты азайтсаң, екінші қосылғыш шығуы керек.'],
        '−': ['Сандарды разрядтары бойынша астын-астына жаз.', 'Бірліктерден бастап азайт. Жетпесе, көрші разрядтан бір ондық ал.', 'Тексер: жауабыңа азайтқышты қоссаң, азайғыш шығуы керек.'],
        '×': ['Көбейту кестесін еске түсір.', 'Сан үлкен болса, разряд бойынша көбейт: алдымен бірліктерді, сосын ондықтарды.', 'Тексер: жауабыңды бір көбейткішке бөлсең, екінші көбейткіш шығуы керек.']
      }[op]);
      it.question = `${p.expr} нешеге тең?`;
      if (S.visual) it.visual = (op === '+' || op === '−') && a <= 20 && b <= 20 ? { kind: 'dots', a, b, op } : (t.visual ? { kind: 'text', text: t.visual } : null);
      it.calcName = name;
    }
    return it;
  }
  // Мәтіндік тапсырмалар
  it.question = t.question;
  if (t.type === 'choice') {
    let opts = t.options.map((text, i) => ({ text: text.trim(), ok: i === t.correct })).filter(o => o.text);
    if (S.fewer && opts.length > 2) { const target = opts.length > 3 ? 3 : 2; const right = opts.find(o => o.ok); const wrong = opts.filter(o => !o.ok).slice(0, target - 1); opts = opts.filter(o => o === right || wrong.includes(o)); }
    it.options = opts.map(o => o.text); it.correctIdx = opts.findIndex(o => o.ok);
    it.instruction = S.short ? 'Дұрыс жауапты таңда.' : 'Сұрақты мұқият оқы да, дұрыс жауапты таңда. Бір ғана жауап дұрыс.';
    it.explain = S.simple ? (t.simple || 'Әр жауапты сұрақпен салыстыр. Сәйкес келмейтінін алып таста.') : '';
    it.hints = own.length ? own.slice() : ['Сұрақты қайта оқы. Не сұралып тұр?', 'Әр жауап нұсқасын кезекпен оқы.', 'Сұраққа сәйкес келмейтін нұсқаларды алып таста.', 'Қалған нұсқаны сұрақпен тағы бір рет тексер.'];
  }
  if (t.type === 'match') {
    let pairs = t.pairs.map(p => [p[0].trim(), p[1].trim()]).filter(p => p[0] && p[1]);
    if (S.fewer && pairs.length > 3) pairs = pairs.slice(0, 3);
    it.left = pairs.map(p => p[0]); it.rightAns = pairs.map(p => p[1]); it.rightOpts = seededShuffle(it.rightAns, id);
    it.question = t.question || 'Сәйкестендір.';
    it.instruction = S.short ? 'Әр сөзге сәйкесін таңда.' : 'Сол жақтағы әр сөзге оң жақтағы тізімнен сәйкес мәнді таңда.';
    it.explain = S.simple ? (t.simple || 'Алдымен өзің жақсы білетін жұпты тап. Қалғандарын кейін толтыр.') : '';
    it.hints = own.length ? own.slice() : ['Сол жақтағы бірінші сөзді оқы.', 'Оң жақтағы тізімнен оған ең жақын мағынаны ізде.', 'Сенімді жұптардан баста, қалғанын соңында толтыр.'];
  }
  if (t.type === 'short' || t.type === 'text') {
    it.answers = (t.answers || []).filter(Boolean); it.keywords = (t.keywords || []).filter(Boolean);
    it.autoCheck = !!(it.answers.length || it.keywords.length);
    if (t.type === 'text') {
      it.passage = t.passage;
      it.instruction = S.short ? 'Мәтінді оқы. Сұраққа жауап бер.' : 'Мәтінді асықпай оқы. Содан кейін сұраққа жауап бер. Қажет болса, мәтінді қайта оқы.';
      it.explain = S.simple ? (t.simple || 'Жауап мәтіннің ішінде бар. Сұрақтағы сөзді мәтіннен ізде.') : '';
      it.hints = own.length ? own.slice() : ['Мәтінді бір рет толық оқы.', 'Сұрақтағы негізгі сөзді мәтіннен ізде.', 'Сол сөз тұрған сөйлемді қайта оқы.', 'Жауабыңды сол сөйлеммен салыстыр.'];
    } else {
      it.instruction = S.short ? 'Жауабыңды жаз.' : 'Сұрақты оқып, жауабыңды бір-екі сөзбен жаз.';
      it.explain = S.simple ? (t.simple || 'Толық сөйлем жазудың қажеті жоқ. Бір-екі сөз жеткілікті.') : '';
      it.hints = own.length ? own.slice() : ['Сұрақтағы негізгі сөзді тап.', 'Жауабыңды ойлан, оны дауыстап айтып көр.', 'Жазғаныңды қайта оқып, тексер.'];
    }
  }
  if (S.visual && t.visual) it.visual = { kind: 'text', text: t.visual };
  return it;
}

/* --- Жауапты тексеру --- */
function checkAnswer(it, ans) {
  const type = it.type || 'calc';
  if (type === 'calc') {
    const v = toInt(ans.value), rv = it.remainder ? toInt(ans.rem) : 0;
    if (isNaN(v) || (it.remainder && isNaN(rv))) return { status: 'invalid' };
    return { status: v === it.answer && rv === (it.remainder || 0) ? 'ok' : 'no', v };
  }
  if (type === 'choice') { if (ans.choice == null) return { status: 'invalid' }; return { status: ans.choice === it.correctIdx ? 'ok' : 'no' }; }
  if (type === 'match') {
    if (ans.match.some(x => !x)) return { status: 'invalid' };
    const marks = ans.match.map((x, i) => x === it.rightAns[i]);
    return { status: marks.every(Boolean) ? 'ok' : 'no', marks, right: marks.filter(Boolean).length };
  }
  const txt = norm(ans.text); if (!txt) return { status: 'invalid' };
  if (!it.autoCheck) return { status: 'pending' };
  const ok = it.answers.some(a => norm(a) === txt) || (it.keywords.length && it.keywords.every(k => txt.includes(norm(k))));
  return { status: ok ? 'ok' : 'no' };
}

/* --- Әдістеме мәтіндері --- */
function methodText(S) {
  const parts = [];
  if (S.short) parts.push('қысқа нұсқаулықпен жұмыс істейді');
  if (S.simple) parts.push('қарапайым тілдегі түсіндірмені оқиды');
  if (S.tts) parts.push('нұсқаулықты дыбыстап тыңдайды');
  if (S.bigText) parts.push('үлкейтілген әріппен жұмыс істейді');
  if (S.steps) parts.push('қадамдық көмекті ретімен ашады');
  if (S.visual) parts.push('көрнекі көмекті пайдаланады');
  if (S.fewer) parts.push('азайтылған жауап нұсқаларынан таңдайды');
  if (S.extraTime) parts.push('орындауға қосымша уақыт беріледі');
  return 'Оқушы тапсырманы QolJetim оқушы кабинетінде орындайды' + (parts.length ? ': ' + parts.join(', ') : '') + '. Жауабын енгізіп, бірден қолдаушы кері байланыс алады.';
}
const CRITERION_DEFAULT = 'Тапсырманы дұрыс орындайды — әр тапсырмаға 1 ұпай. Қолдаумен орындау да жетістік ретінде есептеледі.';

/* =====================================================================
   Дайын демо-сабақтар (оқушылардың нақты деректерінсіз)
   ===================================================================== */
const DEMO_LESSONS = [
  { key: 'math', subject: 'Математика', grade: '4', title: 'Көптаңбалы сандарды екі таңбалы санға жазбаша бөлу', note: 'Нақты мектеп ҚМЖ-сы (№51, Word құжаты)', icon: '➗', fromDocx: true },
  {
    key: 'kaz', subject: 'Қазақ тілі', grade: '3', title: 'Зат есім', icon: '📘',
    note: 'Таңдау, сәйкестендіру, мәтінмен жұмыс, қысқа жауап',
    lesson: {
      section: 'Зат есім', topic: 'Зат есім. Кім? не? сұрақтары',
      objectives: 'Зат есімнің кім? не? сұрақтарына жауап беретінін біледі және оны мәтіннен таба алады.',
      lessonGoal: 'Барлық оқушылар зат есімді табады; көпшілігі кім? не? сұрағын дұрыс қояды; кейбірі өз мысалын құрастырады.',
      stages: [
        { name: 'Сабақтың басы', time: '5 мин', teacher: 'Ұйымдастыру кезеңі. Оқушылармен амандасу.\nОй қозғау: «Сыныпта қандай заттарды көріп тұрсыңдар?» Оқушылар заттарды атайды.', student: 'Сыныптағы заттарды атайды.', assessment: 'Ауызша мадақтау', resources: 'Сынып заттары' },
        { name: 'Сабақтың ортасы', time: '28 мин', teacher: 'Жаңа тақырып: зат есім кім? не? сұрақтарына жауап береді.\n1-тапсырма. Мәтіннен зат есімдерді тауып, астын сыз.\n2-тапсырма. Жұппен жұмыс: сөздерді «кім?» және «не?» деп топтастыр.\nЕББҚ оқушысына арналған тапсырма: зат есімді таңдау, сөзді суретпен сәйкестендіру, шағын мәтінмен жұмыс.', student: 'Зат есімді табады, сұрақ қояды, жұппен жұмыс істейді.', assessment: 'Дескриптор: зат есімді табады; кім? не? сұрағын дұрыс қояды.', resources: 'Оқулық, сөз карточкалары, суреттер' },
        { name: 'Сабақтың соңы', time: '7 мин', teacher: 'Кері байланыс: «Бүгін не білдім? Не қиын болды?»', student: 'Өз ойын айтады.', assessment: 'Бағдаршам', resources: 'Түсті стикерлер' }
      ],
      senStageIdx: 1,
      tasks: [
        { type: 'choice', question: 'Қай сөз зат есім?', options: ['жүгірді', 'кітап', 'әдемі', 'тез'], correct: 1, visual: '👤 кім? → адам\n📦 не? → зат, жануар, өсімдік\nЗат есім осы сұрақтарға жауап береді.', steps: ['Әр сөзге «кім?» немесе «не?» деп сұрақ қойып көр.', 'Осы сұраққа жауап беретін сөзді тап.', 'Ол сөз затты немесе адамды білдіре ме? Тексер.'] },
        { type: 'match', question: 'Сөзді суретпен сәйкестендір.', pairs: [['алма', '🍎'], ['мысық', '🐱'], ['кітап', '📘'], ['күн', '☀️']] },
        { type: 'text', passage: 'Айгүл мектепке барды. Ол сөмкесіне кітап пен дәптер салды. Жолда досы Ерланды кездестірді.', question: 'Айгүл сөмкесіне не салды?', answers: ['кітап пен дәптер', 'кітап және дәптер', 'кітап пен дәптерді'], keywords: ['кітап', 'дәптер'], visual: '🎒 → ❓ + ❓\nСөмкеге салынған екі затты мәтіннен тап.' },
        { type: 'short', question: 'Суретке қарап, затты атап жаз: 🍎', answers: ['алма'], visual: '🍎' }
      ]
    }
  },
  {
    key: 'nature', subject: 'Жаратылыстану', grade: '3', title: 'Өсімдіктің бөліктері', icon: '🌱',
    note: 'Сәйкестендіру, таңдау, мәтінмен жұмыс, қысқа жауап',
    lesson: {
      section: 'Өсімдіктер', topic: 'Өсімдіктің бөліктері және олардың қызметі',
      objectives: 'Өсімдіктің негізгі бөліктерін (тамыр, сабақ, жапырақ, гүл) атайды және олардың қызметін сипаттайды.',
      lessonGoal: 'Барлық оқушылар өсімдік бөліктерін атайды; көпшілігі әр бөліктің қызметін түсіндіреді.',
      stages: [
        { name: 'Сабақтың басы', time: '5 мин', teacher: 'Ұйымдастыру кезеңі.\nОй қозғау: бөлме өсімдігін көрсету. «Өсімдіктің қандай бөліктерін көріп тұрсыңдар?»', student: 'Өсімдікті бақылап, бөліктерін атайды.', assessment: 'Ауызша мадақтау', resources: 'Бөлме өсімдігі' },
        { name: 'Сабақтың ортасы', time: '28 мин', teacher: 'Жаңа тақырып: тамыр, сабақ, жапырақ, гүл және олардың қызметі.\n1-тапсырма. Суреттегі өсімдіктің бөліктерін белгіле.\n2-тапсырма. Топпен жұмыс: «Өсімдікке не қажет?» кестесін толтыр.\nЕББҚ оқушысына арналған тапсырма: бөлікті қызметімен сәйкестендіру, дұрыс жауапты таңдау, шағын мәтінмен жұмыс.', student: 'Өсімдік бөліктерін белгілейді, топта кесте толтырады.', assessment: 'Дескриптор: өсімдіктің 4 бөлігін атайды; әр бөліктің қызметін айтады.', resources: 'Оқулық, өсімдік суреті, кесте' },
        { name: 'Сабақтың соңы', time: '7 мин', teacher: 'Рефлексия: «Өсімдіктің қай бөлігі ең маңызды деп ойлайсың? Неге?»', student: 'Пікірін айтады.', assessment: 'Екі жұлдыз, бір тілек', resources: 'Стикерлер' }
      ],
      senStageIdx: 1,
      tasks: [
        { type: 'match', question: 'Өсімдіктің бөлігін оның қызметімен сәйкестендір.', pairs: [['Тамыр', 'топырақтан су сіңіреді'], ['Сабақ', 'суды жапыраққа жеткізеді'], ['Жапырақ', 'күн сәулесінен қорек түзеді'], ['Гүл', 'жеміс пен тұқым береді']], visual: '🌱 тамыр · 🌿 сабақ · 🍃 жапырақ · 🌸 гүл' },
        { type: 'choice', question: 'Өсімдік суды топырақтан қай бөлігі арқылы алады?', options: ['Жапырақ', 'Тамыр', 'Гүл'], correct: 1, visual: '🌸 гүл\n🍃 жапырақ\n🌿 сабақ\n🟫 топырақ: оның ішінде қай бөлік бар?' },
        { type: 'text', passage: 'Өсімдікке өсу үшін жарық, су, ауа және жылу қажет. Жарық жетпесе, өсімдік әлсірейді, жапырағы сарғаяды.', question: 'Жарық жетпесе, өсімдіктің жапырағы қандай болады?', answers: ['сарғаяды', 'сары', 'сарғайып кетеді'], keywords: ['сарғ'], visual: '☀️ жарық бар → 🌿 жапырақ жасыл\n🌑 жарық жоқ → 🍂 жапырақ … ?\nЖауапты мәтіннің екінші сөйлемінен ізде.' },
        { type: 'short', question: 'Өсімдікке өсу үшін не қажет? Бір жауап жаз.', answers: ['су', 'жарық', 'ауа', 'жылу', 'күн', 'күн сәулесі', 'топырақ'] }
      ]
    }
  }
];
async function loadDemoLesson(key) {
  const d = DEMO_LESSONS.find(x => x.key === key); if (!d) throw new Error('NO_DEMO');
  if (d.fromDocx) {
    const buf = b64ToBuf(window.QJ_SAMPLE_B64);
    const L = await readDocx(buf, 'ҚМЖ №51 — Математика 4-сынып.docx');
    L.docxB64 = window.QJ_SAMPLE_B64; L.source = 'demo'; L.demoKey = key;
    return finalizeLesson(L);
  }
  const L = JSON.parse(JSON.stringify(d.lesson));
  Object.assign(L, { source: 'demo', demoKey: key, fileName: '', subject: d.subject, grade: d.grade, gradeNote: '', subjectNote: '', mainTasks: [], senTasks: [], candidates: [], senLines: [], senFound: true, senLabel: 'ЕББҚ оқушысына арналған тапсырма', senStage: L.stages[L.senStageIdx].name, rawText: '', ok: true });
  L.stages.forEach((s, i) => (s.teacher + '\n' + s.student).split('\n').filter(x => x.trim().length > 2).forEach(text => L.candidates.push({ text: text.trim(), stage: s.name, stageIdx: i })));
  L.tasks = L.tasks.map(t => newTask(t.type, { ...t, origin: 'demo', stageIdx: L.senStageIdx }));
  return L;
}
/* Құжаттан табылған ЕББҚ тапсырмаларын тапсырма тізіміне айналдыру */
function finalizeLesson(L) {
  if (!L.tasks) {
    L.tasks = (L.senTasks || []).map(t => newTask('calc', { expr: `${t.a} : ${t.b}`, origin: 'doc', stageIdx: L.senStageIdx }));
    // Бөлу емес, бірақ ЕББҚ белгісінен кейін тұрған жолдарды да ұсынамыз (таңдалмаған күйде)
    (L.senLines || []).forEach(x => L.tasks.push({ ...taskFromLine(x.text, x.stageIdx), selected: false }));
  }
  L.tasks.forEach(t => { if (t.type === 'calc') t.id = taskId(t); });
  return L;
}
/* Ескі нұсқадағы деректерді жаңа модельге көшіру */
function migrateLesson(L) {
  if (!L) return L;
  if (!L.candidates) L.candidates = [];
  if (!L.tasks) finalizeLesson(L);
  return L;
}

/* Оқушыға оқылатын негізгі мәтін (жазба мен дыбыстау үшін; көмек қадамдарынсыз) */
function speechCore(it) {
  const parts = [it.instruction, it.explain, it.passage, it.type === 'calc' ? it.question : it.question];
  if (it.type === 'choice') parts.push(it.options.map((o, j) => `${j + 1}) ${o}`).join('. '));
  if (it.type === 'match') parts.push(it.left.join(', '));
  return parts.filter(Boolean).map(x => String(x).replace(/[.!?\s]+$/, '')).join('. ') + '.';
}
