'use strict';
/* =====================================================================
   QolJetim AI — демо-прототип (бір файл, сыртқы тәуелділіксіз)
   Деректер тек осы браузердің localStorage жадында сақталады.
   ===================================================================== */

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const nowStr = ts => { const d = new Date(ts); const p = x => String(x).padStart(2, '0'); return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`; };

/* ---------------- Сақтау (localStorage + жадқа резерв) ---------------- */
const mem = {};
const Store = {
  get(k, d) { try { const v = localStorage.getItem('qj_' + k); return v != null ? JSON.parse(v) : (k in mem ? mem[k] : d); } catch (e) { return k in mem ? mem[k] : d; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem('qj_' + k, JSON.stringify(v)); } catch (e) { toast('Браузер жадына сақтау мүмкін болмады (жад толы немесе бұғатталған). Деректер бетті жапқанға дейін ғана сақталады.', 'err'); } },
  del(k) { delete mem[k]; try { localStorage.removeItem('qj_' + k); } catch (e) { } },
  clearAll() { Object.keys(mem).forEach(k => delete mem[k]); try { Object.keys(localStorage).filter(k => k.startsWith('qj_')).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
};

function toast(msg, kind = '') {
  const box = $('#toasts'); const el = document.createElement('div');
  el.className = 'toast ' + kind; el.textContent = msg; el.setAttribute('role', 'status');
  box.appendChild(el); setTimeout(() => el.remove(), 4200);
}

/* ---------------- Белгішелер ---------------- */
const IC = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  upload: '<path d="M12 16V4m0 0l-5 5m5-5l5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  wand: '<path d="M4 20L16 8m-2-2l4 4M15 3v2m4 2h2m-3-3l1.5-1.5M9 4l.6 1.4L11 6l-1.4.6L9 8l-.6-1.4L7 6l1.4-.6z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.3 3.3 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.4 3.5 5.2"/>',
  chart: '<path d="M4 20V10m6 10V4m6 16v-7m4 7H2"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>',
  speaker: '<path d="M4 9h3l5-4v14l-5-4H4z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  file: '<path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M8.5 13h7M8.5 17h5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
  down: '<path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  teacher: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M7 9h6M7 12h4"/>',
  student: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  star: '<path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
};
const icon = (n, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${IC[n] || ''}</svg>`;

/* =====================================================================
   ZIP / DOCX оқу (DecompressionStream — браузердің кірістірілген құралы)
   ===================================================================== */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u8) { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function unzipEntries(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('NOT_ZIP');
  const n = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
  const td = new TextDecoder(); const out = [];
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) throw new Error('BAD_ZIP');
    const e = {
      method: dv.getUint16(off + 10, true), time: dv.getUint16(off + 12, true), date: dv.getUint16(off + 14, true),
      crc: dv.getUint32(off + 16, true), csize: dv.getUint32(off + 20, true), usize: dv.getUint32(off + 24, true)
    };
    const nl = dv.getUint16(off + 28, true), el = dv.getUint16(off + 30, true), cl = dv.getUint16(off + 32, true), lho = dv.getUint32(off + 42, true);
    e.name = td.decode(u8.subarray(off + 46, off + 46 + nl));
    const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true);
    e.raw = u8.subarray(start, start + e.csize);
    out.push(e); off += 46 + nl + el + cl;
  }
  return out;
}
async function inflateEntry(e) {
  if (e.method === 0) return e.raw;
  if (e.method !== 8) throw new Error('UNSUPPORTED_ZIP');
  if (typeof DecompressionStream === 'undefined') throw new Error('NO_DS');
  const ds = new DecompressionStream('deflate-raw');
  const ab = await new Response(new Blob([e.raw]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(ab);
}
function zipBuild(files, mime) {
  const enc = new TextEncoder(); const parts = [], central = []; let offset = 0;
  for (const f of files) {
    const nm = enc.encode(f.name);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, f.method, true);
    lh.setUint16(10, f.time || 0, true); lh.setUint16(12, f.date || 0x5A21, true); lh.setUint32(14, f.crc, true);
    lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.usize, true); lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(new Uint8Array(lh.buffer), nm, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, f.method, true); ch.setUint16(12, f.time || 0, true); ch.setUint16(14, f.date || 0x5A21, true);
    ch.setUint32(16, f.crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.usize, true);
    ch.setUint16(28, nm.length, true); ch.setUint32(42, offset, true);
    central.push(new Uint8Array(ch.buffer), nm);
    offset += 30 + nm.length + f.data.length;
  }
  const cdSize = central.reduce((s, a) => s + a.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mime });
}
const b64ToBuf = b64 => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; };
const bufToB64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };

/* --- document.xml → блоктар (абзацтар мен кестелер) --- */
const kids = (el, ln) => [...el.childNodes].filter(c => c.nodeType === 1 && (!ln || c.localName === ln));
function pText(p) {
  let s = '';
  const walk = n => { for (const c of n.childNodes) { if (c.nodeType !== 1) continue; const ln = c.localName;
    if (ln === 't') s += c.textContent; else if (ln === 'tab') s += ' '; else if (ln === 'br' || ln === 'cr') s += '\n';
    else if (ln === 'noBreakHyphen') s += '-'; else if (ln === 'del' || ln === 'instrText' || ln === 'rPr' || ln === 'pPr') { } else walk(c); } };
  walk(p); return s;
}
function cellText(tc) {
  const lines = [];
  for (const c of kids(tc)) { if (c.localName === 'p') lines.push(pText(c)); else if (c.localName === 'tbl') for (const tr of kids(c, 'tr')) for (const tc2 of kids(tr, 'tc')) lines.push(cellText(tc2)); else if (c.localName === 'sdt') { const sc = kids(c, 'sdtContent')[0]; if (sc) lines.push(cellText(sc)); } }
  return lines.join('\n');
}
function parseDocXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('BAD_XML');
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]; if (!body) throw new Error('NO_BODY');
  const blocks = [];
  const addFrom = parent => { for (const c of kids(parent)) {
    if (c.localName === 'p') blocks.push({ type: 'p', text: pText(c) });
    else if (c.localName === 'sdt') { const sc = kids(c, 'sdtContent')[0]; if (sc) addFrom(sc); }
    else if (c.localName === 'tbl') {
      const rows = [];
      for (const tr of kids(c, 'tr')) {
        let col = 0; const cells = [];
        const trPr = kids(tr, 'trPr')[0]; const gb = trPr && kids(trPr, 'gridBefore')[0]; if (gb) col += +gb.getAttributeNS(W_NS, 'val') || 0;
        for (const tc of kids(tr, 'tc')) {
          const pr = kids(tc, 'tcPr')[0]; let span = 1, cont = false;
          if (pr) { const gs = kids(pr, 'gridSpan')[0]; if (gs) span = +gs.getAttributeNS(W_NS, 'val') || 1;
            const vm = kids(pr, 'vMerge')[0]; if (vm) { const v = vm.getAttributeNS(W_NS, 'val'); cont = !v || v === 'continue'; } }
          cells.push({ text: cont ? '' : cellText(tc), col, span, cont }); col += span;
        }
        rows.push(cells);
      }
      blocks.push({ type: 'table', rows });
    } } };
  addFrom(body);
  return blocks;
}

/* --- ҚМЖ мазмұнын анықтау --- */
const NUM = '(\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})+|\\d+)';
const DIV_RX = new RegExp('^\\s*(?:\\d+\\s*[\\).]\\s*)?' + NUM + '\\s*[:÷]\\s*' + NUM + '\\s*=\\s*(.*)$');
const ANY_EXPR_RX = /\d\s*[:÷×x*+−\-]\s*\d.*=/;
const SEN_RX = /(ЕББҚ|ЕБҚЕО|ЕБҚ|ЕББ|ерекше\s+білім)/i;
const TASK_HEAD_RX = /^\s*(\d+\s*[А-ЯӘІҢҒҮҰҚӨҺа-яәіңғүұқөһ]?\s*[-–]\s*есеп|саралау\s+тапсырма)/i;
const toInt = s => parseInt(String(s).replace(/[\s\u00a0\u202f]/g, ''), 10);

function parseLesson(blocks, fileName) {
  const L = { fileName, source: 'docx', section: '', topic: '', objectives: '', lessonGoal: '', grade: '', gradeNote: '', subject: '', subjectNote: '',
    stages: [], mainTasks: [], senTasks: [], senFound: false, senLabel: '', senStage: '', rawText: '' };
  const lines = [];
  for (const b of blocks) { if (b.type === 'p') lines.push(b.text); else for (const r of b.rows) for (const c of r) if (!c.cont && c.text.trim()) lines.push(c.text); }
  L.rawText = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  const rules = [['topic', /тақырыб/i], ['objectives', /(оқыту|оқу)\s+мақсат/i], ['lessonGoal', /сабақтың\s+мақсат/i], ['section', /^\s*бөлім/i], ['grade', /^\s*сынып/i], ['subject', /^\s*пән\b/i]];
  let stageTable = null, headerIdx = -1;
  for (const b of blocks) {
    if (b.type === 'p') {
      const m = b.text.match(/^\s*(сынып|пән|сабақтың тақырыбы|тақырыбы)\s*[:：]\s*(.+)$/i);
      if (m) { const k = /сынып/i.test(m[1]) ? 'grade' : /пән/i.test(m[1]) ? 'subject' : 'topic'; if (!L[k]) L[k] = m[2].trim(); }
      continue;
    }
    b.rows.forEach((r, ri) => {
      const cells = r.filter(c => !c.cont && c.text.trim());
      const t = cells.map(c => c.text);
      if (headerIdx < 0 && t.some(x => /(педагог|мұғалім)/i.test(x)) && t.some(x => /оқушы/i.test(x)) && cells.length >= 3) { stageTable = b; headerIdx = ri; return; }
      if (stageTable === b && headerIdx >= 0) return;
      if (cells.length >= 2) {
        const label = cells[0].text.trim();
        if (label.length > 80) return;
        for (const [k, rx] of rules) if (!L[k] && rx.test(label)) { L[k] = cells.slice(1).map(c => c.text.trim()).join('\n').trim(); break; }
      } else if (cells.length === 1) {
        const m = cells[0].text.match(/^\s*(сынып|пән)\s*[:：]\s*(.+)$/i);
        if (m) { const k = /сынып/i.test(m[1]) ? 'grade' : 'subject'; if (!L[k]) L[k] = m[2].trim(); }
      }
    });
  }

  // Сабақ кезеңдері
  if (stageTable) {
    const hdr = stageTable.rows[headerIdx].filter(c => !c.cont);
    const colOf = rx => { const c = hdr.find(c => rx.test(c.text)); return c ? c.col : -1; };
    const cols = { stage: hdr[0].col, teacher: colOf(/(педагог|мұғалім)/i), student: colOf(/оқушы/i), assess: colOf(/бағала/i), res: colOf(/ресурс/i) };
    const at = (row, x) => { if (x < 0) return ''; const c = row.find(c => x >= c.col && x < c.col + c.span); return c && !c.cont ? c.text.trim() : ''; };
    let prev = '';
    for (const row of stageTable.rows.slice(headerIdx + 1)) {
      const s0 = at(row, cols.stage); const ls = s0.split('\n').map(x => x.trim()).filter(Boolean);
      const timeLine = ls.find(x => /\d+\s*мин/i.test(x)) || '';
      let name = ls.filter(x => x !== timeLine).join(' ').trim();
      if (!name) name = prev ? prev : 'Кезең'; else prev = name;
      const st = { name, time: (timeLine.match(/\d+\s*мин/i) || [''])[0].replace(/\s+/, ' '), teacher: at(row, cols.teacher), student: at(row, cols.student), assessment: at(row, cols.assess), resources: at(row, cols.res) };
      if (cols.stage === cols.teacher) st.teacher = row.filter(c => !c.cont).slice(1).map(c => c.text).join('\n');
      if (st.teacher || st.student || st.assessment) L.stages.push(st);
    }
  }

  // Тапсырмаларды табу
  const scan = (text, stageName, stageIdx) => {
    let cur = null, senMode = false;
    for (const raw of text.split('\n')) {
      const line = raw.trim();
      if (SEN_RX.test(line) && line.length < 80) { senMode = true; L.senFound = true; L.senLabel = line.replace(/\s+/g, ' '); L.senStage = stageName; L.senStageIdx = stageIdx; continue; }
      const m = line.match(DIV_RX);
      if (senMode) {
        if (m) { const a = toInt(m[1]), b = toInt(m[2]); if (b > 0) L.senTasks.push({ a, b, given: m[3].trim(), raw: line }); continue; }
        if (!line && !L.senTasks.length) continue;
        senMode = false;
      }
      if (TASK_HEAD_RX.test(line)) { cur = { title: line.replace(/\s+/g, ' '), stage: stageName, examples: [] }; L.mainTasks.push(cur); continue; }
      if (cur && (m || ANY_EXPR_RX.test(line)) && cur.examples.length < 6) cur.examples.push(line);
    }
  };
  if (L.stages.length) L.stages.forEach((s, i) => scan(s.teacher + '\n' + s.student, s.name, i)); else scan(L.rawText, '', -1);

  // Сынып пен пән
  const gNum = String(L.grade).match(/\d{1,2}/);
  if (gNum) { L.grade = gNum[0]; L.gradeNote = 'Құжатта көрсетілген'; }
  else {
    const m1 = L.rawText.match(/(\d{1,2})\s*[-–]?\s*сынып/i);
    const m2 = (L.objectives || L.rawText).match(/(?:^|\s)(\d{1,2})\.\d+\.\d+\.\d+/);
    if (m1 && +m1[1] >= 1 && +m1[1] <= 11) { L.grade = m1[1]; L.gradeNote = 'Мәтіннен табылды'; }
    else if (m2 && +m2[1] >= 1 && +m2[1] <= 11) { L.grade = m2[1]; L.gradeNote = `Оқу мақсатының кодынан анықталды (${(L.objectives.match(/\d+\.\d+\.\d+\.\d+/) || [''])[0]}) — тексеріңіз`; }
    else L.grade = '';
  }
  if (L.subject) L.subjectNote = 'Құжатта көрсетілген';
  else if (/математика/i.test(L.rawText)) { L.subject = 'Математика'; L.subjectNote = 'Мәтінде аталған'; }
  else {
    const kw = (L.topic + ' ' + L.objectives + ' ' + L.rawText.slice(0, 4000)).match(/бөлу|көбейт|қосу|азайт|сандар|бөлінді|бөлгіш|теңдеу|өрнек/gi) || [];
    if (kw.length >= 3) { L.subject = 'Математика'; L.subjectNote = 'Тақырып мазмұны бойынша болжам — тексеріңіз'; }
  }
  L.ok = !!(L.topic || L.stages.length || L.senTasks.length);
  return L;
}

async function readDocx(buf, fileName) {
  const entries = unzipEntries(buf);
  const de = entries.find(e => e.name === 'word/document.xml');
  if (!de) throw new Error('NOT_DOCX');
  const xml = new TextDecoder('utf-8').decode(await inflateEntry(de));
  const lesson = parseLesson(parseDocXml(xml), fileName);
  return lesson;
}
const ERR_TXT = {
  NOT_ZIP: 'Бұл файл DOCX пішімінде емес. Ескі .doc файлын Word-та «Басқаша сақтау → .docx» арқылы сақтап, қайта жүктеңіз.',
  BAD_ZIP: 'Файл зақымдалған сияқты: оны ашу мүмкін болмады.',
  NOT_DOCX: 'Файлдан Word құжатының мәтіні табылмады.',
  NO_DS: 'Бұл браузер DOCX файлын ашуды қолдамайды. Chrome, Edge немесе Firefox-тың жаңа нұсқасын қолданыңыз.',
  UNSUPPORTED_ZIP: 'Файлдың сығу тәсілі қолдау таппайды.',
  BAD_XML: 'Құжат мәтінін оқу кезінде қате шықты.', NO_BODY: 'Құжат бос сияқты.'
};

/* =====================================================================
   Бейімдеу механизмі — ЕРЕЖЕГЕ НЕГІЗДЕЛГЕН (тілдік модель емес)
   ===================================================================== */
const SUPPORTS = [
  ['simple', 'Қарапайым тілмен түсіндіру'], ['steps', 'Қадамдап орындау'], ['bigText', 'Әріпті үлкейту'],
  ['tts', 'Мәтінді дыбыстау'], ['visual', 'Көрнекі мысалдар'], ['extraTime', 'Қосымша уақыт'], ['short', 'Қысқа нұсқаулық']
];
const SUP_LABEL = Object.fromEntries(SUPPORTS);
const KZ_U = ['', 'бір', 'екі', 'үш', 'төрт', 'бес', 'алты', 'жеті', 'сегіз', 'тоғыз'];
const KZ_T = ['', 'он', 'жиырма', 'отыз', 'қырық', 'елу', 'алпыс', 'жетпіс', 'сексен', 'тоқсан'];
const DAT = { 'бір': 'ге', 'екі': 'ге', 'үш': 'ке', 'төрт': 'ке', 'бес': 'ке', 'алты': 'ға', 'жеті': 'ге', 'сегіз': 'ге', 'тоғыз': 'ға', 'он': 'ға', 'жиырма': 'ға', 'отыз': 'ға', 'қырық': 'қа', 'елу': 'ге', 'алпыс': 'қа', 'жетпіс': 'ке', 'сексен': 'ге', 'тоқсан': 'ға', 'жүз': 'ге', 'мың': 'ға', 'миллион': 'ға', 'нөл': 'ге' };
const ABL = { 'бір': 'ден', 'екі': 'ден', 'үш': 'тен', 'төрт': 'тен', 'бес': 'тен', 'алты': 'дан', 'жеті': 'ден', 'сегіз': 'ден', 'тоғыз': 'дан', 'он': 'нан', 'жиырма': 'дан', 'отыз': 'дан', 'қырық': 'тан', 'елу': 'ден', 'алпыс': 'тан', 'жетпіс': 'тен', 'сексен': 'нен', 'тоқсан': 'нан', 'жүз': 'ден', 'мың': 'нан', 'миллион': 'нан', 'нөл': 'ден' };
function lastWord(n) { n = Math.abs(n); if (n === 0) return 'нөл'; if (n % 10) return KZ_U[n % 10]; if (n % 100) return KZ_T[(n % 100) / 10]; if (n % 1000) return 'жүз'; if (n % 1e6) return 'мың'; return 'миллион'; }
const ACC = { 'бір': 'ді', 'екі': 'ні', 'үш': 'ті', 'төрт': 'ті', 'бес': 'ті', 'алты': 'ны', 'жеті': 'ні', 'сегіз': 'ді', 'тоғыз': 'ды', 'он': 'ды', 'жиырма': 'ны', 'отыз': 'ды', 'қырық': 'ты', 'елу': 'ді', 'алпыс': 'ты', 'жетпіс': 'ті', 'сексен': 'ді', 'тоқсан': 'ды', 'жүз': 'ді', 'мың': 'ды', 'миллион': 'ды', 'нөл': 'ді' };
const acc = n => fmt(n) + '-' + ACC[lastWord(n)];
const dat = n => fmt(n) + '-' + DAT[lastWord(n)];
const abl = n => fmt(n) + '-' + ABL[lastWord(n)];

function buildItem(t, S) {
  const a = t.a, b = t.b, q = Math.floor(a / b), r = a % b;
  const it = { id: `${a}_${b}`, a, b, answer: q, remainder: r, original: `${fmt(a)} : ${fmt(b)} = ?` };
  it.instruction = S.short ? `${fmt(a)} санын ${dat(b)} бөл.` : `${fmt(a)} санын ${dat(b)} бөліп, бөліндіні тап. Жауабыңды көбейту арқылы тексер.`;
  it.explain = S.simple ? `Бөлу дегеніміз — барлығын тең топтарға бөлу. ${fmt(a)} затты ${abl(b)} топқа саламыз. Неше топ шығатынын табамыз.` : '';
  it.hints = [];
  if (S.steps) {
    // Қадамдар жауапты ашпайды: ойлану → сынап көру → өзін-өзі тексеру
    it.hints.push(`Ойлан: ${acc(b)} нешеге көбейтсек, ${fmt(a)} шығады?`);
    const p = q >= 2 ? Math.floor(q / 2) : 0;
    if (p) it.hints.push(`Байқап көр: ${fmt(b)} × ${fmt(p)} = ${fmt(b * p)}. Бұл ${abl(a)} аз — үлкенірек санды көбейтіп көр.`);
    it.hints.push(`Тексеру тәсілі: өз жауабыңды ${dat(b)} көбейт. ${r ? 'Шыққан санға қалдықты қосқанда' : 'Нәтижесінде'} ${fmt(a)} шықса — жауабың дұрыс.`);
    if (r) it.hints.push(`Есіңде болсын: қалдық ${abl(b)} кіші болуы керек.`);
  }
  it.question = r ? `${fmt(a)} : ${fmt(b)} — бөлінді мен қалдықты тап.` : `${fmt(a)} : ${fmt(b)} нешеге тең?`;
  it.visual = S.visual ? (r === 0 && q <= 12 && b <= 40 ? { groups: q, per: b } : { groups: 0 }) : null;
  return it;
}
function methodText(S) {
  const parts = [];
  if (S.short) parts.push('қысқа нұсқаулықпен жұмыс істейді');
  if (S.simple) parts.push('қарапайым тілдегі түсіндірмені оқиды');
  if (S.tts) parts.push('нұсқаулықты дыбыстап тыңдайды');
  if (S.bigText) parts.push('үлкейтілген әріппен жұмыс істейді');
  if (S.steps) parts.push('қадамдық көмекті ретімен ашады');
  if (S.visual) parts.push('көрнекі сызба (тең топтар) арқылы санайды');
  if (S.extraTime) parts.push('орындауға қосымша уақыт беріледі');
  return 'Оқушы тапсырманы QolJetim оқушы кабинетінде орындайды' + (parts.length ? ': ' + parts.join(', ') : '') + '. Жауабын цифрмен енгізіп, бірден қолдаушы кері байланыс алады.';
}
const CRITERION_DEFAULT = 'Бөліндіні дұрыс табады — әр тапсырмаға 1 ұпай. Бөлуді көбейту арқылы тексереді. Қолдаумен орындау да жетістік ретінде есептеледі.';

/* --- Жоба (draft): мұғалімнің таңдауы мен түзетулері --- */
const RULES_VER = 2;
function getDraft() {
  const d0 = Store.get('draft', null);
  if (d0 && d0.rulesVer !== RULES_VER) { d0.rulesVer = RULES_VER; if (d0.approved) { d0.approved = false; d0.approvedAt = 0; d0.needReapprove = true; } Store.set('draft', d0); }
  return d0 || { supports: {}, custom: {}, criterion: '', method: '', studentId: 's1', approved: false, approvedAt: 0, stageIdx: null, rulesVer: RULES_VER };
}
function saveDraft(d, keepApproval = false) { if (!keepApproval) { d.approved = false; d.approvedAt = 0; } d.rulesVer = RULES_VER; Store.set('draft', d); }
function draftItems(lesson, d) {
  return (lesson?.senTasks || []).map(t => {
    const base = buildItem(t, d.supports || {});
    const c = (d.custom || {})[base.id] || {};
    return { ...base, ...(c.instruction != null ? { instruction: c.instruction } : {}), ...(c.question != null ? { question: c.question } : {}),
      ...(c.explain != null ? { explain: c.explain } : {}), ...(c.hints != null ? { hints: c.hints } : {}), edited: !!Object.keys(c).length };
  });
}
const draftCriterion = d => d.criterion || CRITERION_DEFAULT;
const draftMethod = d => d.method || methodText(d.supports || {});

/* =====================================================================
   Дыбыстау (Web Speech API) — тек қазақ дауысы болса
   ===================================================================== */
const TTS = {
  voice: null, total: 0, api: 'speechSynthesis' in window,
  init() { if (!this.api) return; const pick = () => { const vs = speechSynthesis.getVoices(); this.total = vs.length;
    this.voice = vs.find(v => /^kk/i.test(v.lang)) || vs.find(v => /kazakh|қазақ/i.test(v.name)) || null; }; pick(); speechSynthesis.onvoiceschanged = pick; },
  sayable(t) { return String(t).replace(/\u00a0/g, '').replace(/:/g, ' бөлу ').replace(/×/g, ' көбейту ').replace(/−/g, ' азайту ').replace(/=/g, ' тең ').replace(/\?/g, ''); },
  speak(text, onStatus) {
    if (!this.api) return 'Бұл браузерде дыбыстау функциясы жоқ.';
    if (!this.voice) { const vs = speechSynthesis.getVoices(); this.voice = vs.find(v => /^kk/i.test(v.lang)) || vs.find(v => /kazakh|қазақ/i.test(v.name)) || null; }
    if (!this.voice) return 'Бұл құрылғыда қазақ тілді дауыс табылмады, сондықтан мәтін дыбысталмайды. Басқа тілдегі дауысты қазақша дыбыстау ретінде ұсынбаймыз. Қазақ дауысы бар браузерді (мысалы, интернетке қосылған Microsoft Edge) қолданыңыз немесе мұғалім оқып берсін.';
    // Chromium/Edge: cancel() мен speak() бірден қатар шақырылса, сөйлеу кейде үнсіз жоғалады — сондықтан аз кідіріс.
    // Utterance жаһандық айнымалыда сақталады, әйтпесе браузер оны ортасында тоқтатып тастауы мүмкін.
    const say = () => {
      const u = new SpeechSynthesisUtterance(this.sayable(text)); this.cur = u; let started = false;
      u.voice = this.voice; u.lang = this.voice.lang; u.rate = 0.9;
      u.onstart = () => { started = true; onStatus && onStatus('playing'); };
      u.onend = () => { if (this.cur === u) onStatus && onStatus('end'); };
      u.onerror = e => { if (e.error === 'interrupted' || e.error === 'canceled') return; onStatus && onStatus('error', e.error); };
      if (speechSynthesis.paused) speechSynthesis.resume();
      speechSynthesis.speak(u);
      setTimeout(() => { if (!started && this.cur === u) onStatus && onStatus('nostart'); }, 5000);
    };
    if (speechSynthesis.speaking || speechSynthesis.pending) { speechSynthesis.cancel(); setTimeout(say, 200); } else say();
    onStatus && onStatus('wait');
    return '';
  },
  status() { if (!this.api) return { ok: false, text: 'Браузерде дыбыстау API жоқ' }; return this.voice ? { ok: true, text: `Қазақ дауысы бар: ${this.voice.name}` } : { ok: false, text: 'Осы браузерде қазақ дауысы табылмады — оқушыға шынайы ескерту көрсетіледі. Microsoft Edge-ті интернетпен ашып көріңіз.' }; }
};

/* =====================================================================
   Маршрутизация
   ===================================================================== */
const state = { lessonPreview: null, editMode: false, run: null };
function go(path) { if (location.hash !== '#' + path) location.hash = path; else render(); }
window.addEventListener('hashchange', () => render());
window.addEventListener('storage', e => { if (e.key && e.key.startsWith('qj_')) { const p = location.hash.slice(1); if (p.startsWith('/t/')) { render(); if (e.key === 'qj_results') toast('Оқушыдан жаңа нәтиже келді', 'ok'); } else if (p === '/s' || p === '/s/home') render(); } });

function render() {
  const p = location.hash.slice(1) || '/';
  window.scrollTo(0, 0);
  if (TTS.api) speechSynthesis.cancel();
  const app = $('#app');
  if (p === '/') return app.innerHTML = viewLanding();
  if (p.startsWith('/t')) { const sec = p.split('/')[2] || 'dash'; app.innerHTML = teacherShell(sec, teacherView(sec)); bindTeacher(sec); return; }
  if (p.startsWith('/s')) { const sec = p.split('/')[2] || 'home'; studentRender(sec); return; }
  app.innerHTML = viewLanding();
}
document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); } });

/* ---------------- Басты бет ---------------- */
function viewLanding() {
  return `<main class="hero"><div class="hero-in">
    <div class="logo-mark" aria-hidden="true">QJ</div>
    <h1>QolJetim AI</h1>
    <div class="slogan">«Бір сабақ — әр балаға тең мүмкіндік»</div>
    <div class="roles">
      <button class="role t" data-go="/t/dash">${icon('teacher')}<b>Мұғалім ретінде кіру</b><span>ҚМЖ жүктеу, тапсырманы бейімдеу, нәтижелер</span></button>
      <button class="role s" data-go="/s">${icon('student')}<b>Оқушы ретінде кіру</b><span>Бүгінгі тапсырманы орындау</span></button>
    </div>
    <div class="flow" aria-label="Жұмыс тізбегі">
      <span>Мұғалімнің ҚМЖ-сы</span><i>→</i><span>Тапсырманы бейімдеу</span><i>→</i><span>Мұғалім тексереді</span><i>→</i><span>Жалпы жоспарға кіріктіру</span><i>→</i><span>Оқушы кабинеті</span><i>→</i><span>Орындау</span><i>→</i><span>Нәтиже мұғалімге</span>
    </div>
    <p class="foot">Тапсырмаларды бейімдеу қазір <b>ережеге негізделген демо-механизм</b> арқылы жүреді — тілдік модель қолданылмайды. Әр ұсынысты мұғалім тексеріп, бекітеді.<br>Демо-нұсқа. Тіркелу қажет емес. Барлық деректер тек осы құрылғыдағы браузерде сақталады және ешқандай сыртқы серверге жіберілмейді.</p>
  </div></main>`;
}

/* =====================================================================
   МҰҒАЛІМ КАБИНЕТІ
   ===================================================================== */
const T_NAV = [['dash', 'Басты бет', 'home'], ['upload', 'ҚМЖ жүктеу', 'upload'], ['adapt', 'Тапсырманы бейімдеу', 'wand'], ['students', 'Оқушылар', 'users'], ['results', 'Нәтижелер', 'chart']];
function teacherShell(sec, body) {
  return `<header class="top"><div class="wrap">
    <button class="logo" data-go="/" aria-label="Басты бетке"><span class="logo-mark">QJ</span>QolJetim AI</button>
    <span class="tag g">Мұғалім</span>
    <nav class="nav" aria-label="Мұғалім мәзірі">${T_NAV.map(([k, t, i]) => `<button data-go="/t/${k}" class="${k === sec ? 'on' : ''}" ${k === sec ? 'aria-current="page"' : ''}>${icon(i)}${t}</button>`).join('')}</nav>
    <span class="spacer"></span>
    <button class="btn ghost sm" data-go="/">${icon('out')}Шығу</button>
  </div></header><main class="wrap" id="tmain">${body}</main>`;
}
function teacherView(sec) {
  return ({ dash: tDash, upload: tUpload, adapt: tAdapt, students: tStudents, results: tResults }[sec] || tDash)();
}
function bindTeacher(sec) { ({ upload: bindUpload, adapt: bindAdapt, students: bindStudents, results: bindResults, dash: bindDash }[sec] || (() => { }))(); }

const students = () => { let s = Store.get('students', null); if (!s) { s = [{ id: 's1', name: 'Оқушы', note: '' }]; Store.set('students', s); } return s; };
const studentName = id => (students().find(s => s.id === id) || { name: 'Оқушы' }).name;

function flowStatus() {
  const lesson = Store.get('lesson', null), d = getDraft(), as = Store.get('assignments', {}), res = Store.get('results', []);
  const sent = Object.values(as).length > 0;
  return [
    ['ҚМЖ жүктелді', !!lesson],
    ['ЕББҚ тапсырмалары табылды', !!(lesson && lesson.senTasks.length)],
    ['Қолдау таңдалды', Object.values(d.supports || {}).some(Boolean)],
    ['Мұғалім бекітті', !!d.approved],
    ['ҚМЖ-ға кіріктірілді', !!d.approved],
    ['Оқушыға жіберілді', sent],
    ['Нәтиже келді', res.length > 0]
  ];
}
function tDash() {
  const lesson = Store.get('lesson', null); const fs = flowStatus(); const curI = fs.findIndex(x => !x[1]);
  const res = Store.get('results', []);
  const next = !lesson ? ['/t/upload', 'ҚМЖ жүктеуден бастаңыз', 'upload'] : !getDraft().approved ? ['/t/adapt', 'Тапсырманы бейімдеп, бекітіңіз', 'wand'] : !fs[5][1] ? ['/t/adapt', 'Тапсырманы оқушыға жіберіңіз', 'send'] : ['/t/results', 'Нәтижелерді қарау', 'chart'];
  return `<h1>Қайырлы күн!</h1><p class="muted">QolJetim AI бір сабақтың ішінде ЕББҚ оқушысының тапсырмасын бейімдеуге және нәтижесін көруге көмектеседі. Бөлек жоспар жасалмайды — тапсырма жалпы ҚМЖ-ға кіріктіріледі.</p>
  <section class="card"><h2>Жұмыс барысы</h2>
    <div class="steps">${fs.map(([t, ok], i) => `<div class="step ${ok ? 'done' : i === curI ? 'cur' : ''}"><b>${ok ? '✓ ' : ''}${i + 1}-қадам</b>${t}</div>`).join('')}</div>
    <div class="row mt"><button class="btn" data-go="${next[0]}">${icon(next[2])}${next[1]}</button></div>
  </section>
  <div class="grid3 mt">
    <section class="card"><h3>Ағымдағы сабақ</h3>${lesson ? `<p><b>${esc(lesson.topic || '—')}</b></p><p class="muted small">${esc(lesson.subject || 'Пән көрсетілмеген')}${lesson.grade ? ' · ' + esc(lesson.grade) + '-сынып' : ''}<br>Файл: ${esc(lesson.fileName || 'қолмен енгізілді')}</p>` : '<p class="muted">Әзірге ҚМЖ жүктелмеген.</p>'}</section>
    <section class="card"><h3>Оқушылар</h3><p><b style="font-size:28px">${students().length}</b></p><p class="muted small">Демо-оқушылар. Диагноз емес, тек оқу қажеттіліктері белгіленеді.</p></section>
    <section class="card"><h3>Нәтижелер</h3><p><b style="font-size:28px">${res.length}</b></p><p class="muted small">Аяқталған орындау саны</p></section>
  </div>
  <section class="card mt2 no-print"><h3>Демонстрацияны қайта бастау</h3><p class="muted small">Жүктелген ҚМЖ, бейімдеу, жіберілген тапсырмалар мен нәтижелерді осы браузерден өшіреді.</p><button class="btn danger sm" id="resetAll">${icon('trash')}Барлық демо-деректерді тазалау</button></section>`;
}
function bindDash() { $('#resetAll')?.addEventListener('click', () => { if (confirm('Барлық демо-деректер өшірілсін бе?')) { Store.clearAll(); toast('Деректер тазаланды', 'ok'); render(); } }); }

/* ---------------- ҚМЖ жүктеу ---------------- */
function tUpload() {
  const L = state.lessonPreview || Store.get('lesson', null);
  return `<h1>ҚМЖ жүктеу</h1><p class="muted">Дайын қысқа мерзімді жоспарыңызды (.docx) таңдаңыз. Файл осы браузердің ішінде оқылады, ешқайда жіберілмейді.</p>
  <section class="card">
    <label class="drop" id="drop" for="file" tabindex="0">${icon('upload')}<h3 class="mt">ҚМЖ жүктеу</h3><div class="muted">DOCX файлын таңдаңыз немесе осында сүйреп әкеліңіз</div></label>
    <input type="file" id="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="sr">
    <div class="row mt">
      ${window.QJ_SAMPLE_B64 ? `<button class="btn ghost" id="sample">${icon('file')}Мысал файлды ашу: №51 ҚМЖ, математика, 4-сынып</button>` : ''}
      <button class="btn ghost" id="manual">${icon('edit')}Қолмен енгізу</button>
    </div>
    ${window.QJ_SAMPLE_B64 ? '<p class="muted small mt">Мысал файл — бағдарламаға кірістірілген нақты .docx құжаты. Ол да дәл осы оқу механизмі арқылы талданады.</p>' : ''}
    <div id="upmsg"></div>
  </section>
  <div id="parsed">${L ? parsedView(L) : ''}</div>`;
}
function parsedView(L) {
  const fld = (id, lab, val, note, multi) => `<label class="f" for="${id}">${lab} ${note ? `<span class="tag ${/тексер|болжам/.test(note) ? 'w' : 'g'}">${esc(note)}</span>` : (val ? '' : '<span class="tag e">Анықталмады — қолмен толтырыңыз</span>')}</label>${multi ? `<textarea class="inp" id="${id}">${esc(val)}</textarea>` : `<input class="inp" id="${id}" value="${esc(val)}">`}`;
  return `<section class="card mt2"><div class="row"><h2 style="margin:0">Құжаттан алынған мәлімет</h2><span class="spacer"></span>${L.source === 'docx' ? `<span class="tag">${icon('file', 'width="14" height="14"')} ${esc(L.fileName)}</span>` : '<span class="tag w">Қолмен енгізілді</span>'}</div>
   ${L.source === 'docx' && !L.ok ? '<div class="note e mt">Құжаттан ҚМЖ құрылымы анықталмады. Төмендегі өрістерді қолмен толтырыңыз.</div>' : ''}
   <div class="grid2">
     <div>${fld('f_grade', 'Сынып', L.grade, L.grade ? L.gradeNote : '')}</div>
     <div>${fld('f_subject', 'Пән', L.subject, L.subject ? L.subjectNote : '')}</div>
   </div>
   ${fld('f_topic', 'Сабақтың тақырыбы', L.topic, '')}
   ${fld('f_obj', 'Оқу мақсаты', L.objectives, '', true)}
   ${fld('f_goal', 'Сабақтың мақсаты', L.lessonGoal, '', true)}
  </section>
  <section class="card"><h2>Сабақ кезеңдері (${L.stages.length})</h2>
   ${L.stages.length ? `<div class="scroll"><table class="tbl"><tr><th>Кезең</th><th>Уақыт</th><th>Педагогтің әрекеті (басы)</th></tr>${L.stages.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.time)}</td><td class="small">${esc(s.teacher.split('\n').filter(Boolean).slice(0, 3).join(' · ').slice(0, 160))}…</td></tr>`).join('')}</table></div>` : '<p class="muted">Кезеңдер кестесі табылмады.</p>'}
  </section>
  <section class="card"><h2>Негізгі тапсырмалар (${L.mainTasks.length})</h2>
   ${L.mainTasks.length ? `<div class="grid2">${L.mainTasks.map(t => `<div class="note" style="background:#f7f9f8;color:inherit"><b>${esc(t.title)}</b><div class="small muted">${esc(t.stage)}</div>${t.examples.length ? `<div class="small pre mt" style="margin-top:6px">${esc(t.examples.slice(0, 3).join('\n'))}</div>` : ''}</div>`).join('')}</div>` : '<p class="muted">Нөмірленген есептер табылмады.</p>'}
  </section>
  <section class="card" style="border:2px solid ${L.senTasks.length ? 'var(--green)' : 'var(--line)'}"><h2>ЕББҚ оқушысына арналған тапсырмалар</h2>
   ${L.senTasks.length ? `<div class="note g">${icon('check', 'width="16" height="16"')} <b>Бұл тапсырмалар мұғалімнің өз ҚМЖ-сында бұрыннан қарастырылған.</b> QolJetim оларды жаңадан ойлап таппайды — тауып, қолжетімді етуге көмектеседі.<br>Белгі: «${esc(L.senLabel)}» · Кезең: ${esc(L.senStage || '—')}</div>` : (L.source === 'docx' ? '<div class="note w">Құжатта ЕББҚ оқушысына арналған бөлу тапсырмасы табылмады. Төменде тапсырмаларды қолмен енгізіңіз.</div>' : '')}
   <label class="f" for="f_sen">Тапсырмалар (әр жолға біреу, мысалы: 120 : 12)</label>
   <textarea class="inp" id="f_sen" style="min-height:110px;font-size:18px;font-weight:600">${esc(L.senTasks.map(t => `${t.a} : ${t.b}`).join('\n'))}</textarea>
   <p class="muted small">Демо-механизм қазір бөлу тапсырмаларын бейімдейді (математика). Басқа пәндер — келесі кезеңде.</p>
   ${L.stages.length ? `<label class="f" for="f_stage">Қай кезеңге кіріктіріледі</label><select class="inp" id="f_stage">${L.stages.map((s, i) => `<option value="${i}" ${i === (L.senStageIdx ?? 1) ? 'selected' : ''}>${esc(s.name)}${s.time ? ' · ' + esc(s.time) : ''}</option>`).join('')}</select>` : ''}
   <div class="row mt"><button class="btn lg" id="saveLesson">${icon('check')}Сақтау және бейімдеуге өту</button></div>
  </section>
  ${L.rawText ? `<section class="card"><details><summary>Құжаттан оқылған толық мәтін (${fmt(L.rawText.length)} таңба)</summary><div class="raw">${esc(L.rawText)}</div></details></section>` : ''}`;
}
async function handleBuffer(buf, name) {
  const msg = $('#upmsg');
  msg.innerHTML = '<div class="note mt">Файл оқылып жатыр…</div>';
  try {
    const L = await readDocx(buf, name);
    L.docxB64 = bufToB64(buf);
    state.lessonPreview = L;
    msg.innerHTML = L.ok ? `<div class="note g mt">Файл оқылды: ${L.stages.length} кезең, ${L.mainTasks.length} есеп, ЕББҚ тапсырмасы: ${L.senTasks.length}. Мәліметтерді тексеріп, «Сақтау» батырмасын басыңыз.</div>`
      : '<div class="note e mt">Файл ашылды, бірақ ҚМЖ құрылымы анықталмады. Мәліметтерді қолмен енгізіңіз.</div>';
    $('#parsed').innerHTML = parsedView(L); bindParsed();
    $('#parsed').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    console.error(err);
    state.lessonPreview = null; $('#parsed').innerHTML = '';
    msg.innerHTML = `<div class="note e mt"><b>Файлды оқу мүмкін болмады.</b> ${esc(ERR_TXT[err.message] || 'Белгісіз қате.')}<div class="row mt"><button class="btn sm" id="manual2">${icon('edit')}Қолмен енгізу</button></div></div>`;
    $('#manual2').onclick = startManual;
  }
}
function startManual() {
  state.lessonPreview = { source: 'manual', fileName: '', section: '', topic: '', objectives: '', lessonGoal: '', grade: '', gradeNote: '', subject: '', subjectNote: '', stages: [], mainTasks: [], senTasks: [], senFound: false, senLabel: '', senStage: '', rawText: '', ok: true };
  $('#upmsg').innerHTML = ''; $('#parsed').innerHTML = parsedView(state.lessonPreview); bindParsed();
}
function bindUpload() {
  const inp = $('#file'), drop = $('#drop');
  inp.onchange = async () => { const f = inp.files[0]; if (!f) return; await handleBuffer(await f.arrayBuffer(), f.name); inp.value = ''; };
  drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', async e => { const f = e.dataTransfer.files[0]; if (f) await handleBuffer(await f.arrayBuffer(), f.name); });
  $('#sample') && ($('#sample').onclick = () => handleBuffer(b64ToBuf(window.QJ_SAMPLE_B64), 'ҚМЖ №51 — Математика 4-сынып.docx'));
  $('#manual').onclick = startManual;
  if ($('#saveLesson')) bindParsed();
}
function bindParsed() {
  $('#saveLesson').onclick = () => {
    const L = state.lessonPreview || Store.get('lesson', null); if (!L) return;
    L.grade = $('#f_grade').value.trim(); L.subject = $('#f_subject').value.trim(); L.topic = $('#f_topic').value.trim();
    L.objectives = $('#f_obj').value.trim(); L.lessonGoal = $('#f_goal').value.trim();
    const tasks = [];
    for (const line of $('#f_sen').value.split('\n')) { const m = line.match(new RegExp(NUM + '\\s*[:÷/]\\s*' + NUM)); if (m) { const a = toInt(m[1]), b = toInt(m[2]); if (b > 0 && a > 0) tasks.push({ a, b, raw: line.trim() }); } }
    const prevKeys = (L.senTasks || []).map(t => t.a + ':' + t.b).join(',');
    L.senTasks = tasks;
    if ($('#f_stage')) { L.senStageIdx = +$('#f_stage').value; L.senStage = L.stages[L.senStageIdx]?.name || ''; }
    if (!L.topic) { toast('Сабақтың тақырыбын енгізіңіз', 'err'); $('#f_topic').focus(); return; }
    if (!tasks.length) { toast('Кемінде бір бөлу тапсырмасын енгізіңіз (мысалы: 120 : 12)', 'err'); $('#f_sen').focus(); return; }
    const old = Store.get('lesson', null);
    Store.set('lesson', L); state.lessonPreview = null;
    const d = getDraft(); d.stageIdx = L.senStageIdx ?? null;
    if (!old || old.fileName !== L.fileName || prevKeys !== tasks.map(t => t.a + ':' + t.b).join(',')) d.custom = {};
    saveDraft(d);
    toast('ҚМЖ сақталды', 'ok'); go('/t/adapt');
  };
}

/* ---------------- Тапсырманы бейімдеу ---------------- */
function tAdapt() {
  const L = Store.get('lesson', null);
  if (!L) return `<h1>Тапсырманы бейімдеу</h1><section class="card"><p>Алдымен ҚМЖ жүктеңіз немесе мәліметтерді қолмен енгізіңіз.</p><button class="btn" data-go="/t/upload">${icon('upload')}ҚМЖ жүктеу</button></section>`;
  const d = getDraft(); const S = d.supports || {}; const items = draftItems(L, d); const st = students();
  const as = Store.get('assignments', {})[d.studentId];
  const ed = state.editMode; const tts = TTS.status();
  return `<h1>Тапсырманы бейімдеу</h1>
  <p class="muted">${esc(L.subject || '')}${L.grade ? ' · ' + esc(L.grade) + '-сынып' : ''} · <b>${esc(L.topic)}</b></p>
  <section class="card"><h2>Оқушыға қандай қолдау қажет?</h2>
    <p class="muted small">Мұғалім педагогикалық қажеттілікті таңдайды. Жүйе диагноз қоймайды және бір қиындығы бар барлық балаға бірдей бейімдеу ұсынбайды — әр оқушыға жеке таңдалады.</p>
    <div class="row" style="margin-bottom:12px"><label class="f" for="stuSel" style="margin:0">Оқушы:</label><select class="inp" id="stuSel" style="max-width:280px">${st.map(s => `<option value="${s.id}" ${s.id === d.studentId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="chips">${SUPPORTS.map(([k, t]) => `<label class="chip ${S[k] ? 'on' : ''}"><input type="checkbox" data-sup="${k}" ${S[k] ? 'checked' : ''}>${t}</label>`).join('')}</div>
    ${d.needReapprove ? '<div class="note w mt small">Қадамдық көмек жаңартылды: енді ол дайын жауапты ашпайды. Тапсырманы қарап шығып, қайта <b>бекітіп</b>, оқушыға қайта жіберіңіз.</div>' : ''}
    ${S.tts ? `<div class="note ${tts.ok ? 'g' : 'w'} mt small">${icon('speaker', 'width="16" height="16"')} ${esc(tts.text)}</div>` : ''}
    <div class="note w mt small">${icon('bulb', 'width="16" height="16"')} Бейімдеу <b>ережеге негізделген демо-механизм</b> арқылы жасалады (тілдік модель емес). Оқу мақсаты өзгермейді — тек тапсырманың берілу және орындалу тәсілі өзгереді. Кез келген мәтінді мұғалім өзгерте алады.</div>
  </section>
  <section class="card"><div class="row"><h2 style="margin:0">Алдын ала қарау</h2><span class="spacer"></span>
    <button class="btn ${ed ? '' : 'ghost'} sm" id="editBtn">${icon('edit')}${ed ? 'Өңдеуді сақтау' : 'Өңдеу'}</button></div>
    ${items.map((it, i) => `<div class="cmp mt">
      <div class="src"><h4>Бастапқы тапсырма ${i + 1}</h4><div class="big">${esc(it.original)}</div><div class="small muted mt">ҚМЖ-дан: «${esc(L.senLabel || 'ЕББҚ тапсырмасы')}»</div></div>
      <div class="ad"><h4>Бейімделген тапсырма <span class="tag">ережеге негізделген ұсыныс</span> ${it.edited ? '<span class="tag w">мұғалім өзгертті</span>' : ''}</h4>
        ${ed ? `<label class="f">Нұсқаулық</label><textarea class="inp" data-ed="instruction" data-id="${it.id}">${esc(it.instruction)}</textarea>
          ${S.simple ? `<label class="f">Қарапайым түсіндірме</label><textarea class="inp" data-ed="explain" data-id="${it.id}">${esc(it.explain)}</textarea>` : ''}
          ${S.steps ? `<label class="f">Қадамдар (әр жолға бір қадам)</label><textarea class="inp" data-ed="hints" data-id="${it.id}">${esc(it.hints.join('\n'))}</textarea>` : ''}
          <label class="f">Сұрақ</label><input class="inp" data-ed="question" data-id="${it.id}" value="${esc(it.question)}">`
        : `<div style="font-size:18px;font-weight:700">${esc(it.instruction)}</div>
          ${it.explain ? `<div class="small mt" style="margin-top:6px">${esc(it.explain)}</div>` : ''}
          ${it.hints.length ? `<ol class="small">${it.hints.map(h => `<li>${esc(h)}</li>`).join('')}</ol>` : ''}
          <div class="mt" style="margin-top:8px"><b>Сұрақ:</b> ${esc(it.question)} · <b>Дұрыс жауап:</b> ${fmt(it.answer)}${it.remainder ? ` (қалд. ${it.remainder})` : ''}</div>
          <div class="row small mt" style="margin-top:8px">${SUPPORTS.filter(([k]) => S[k]).map(([k, t]) => `<span class="tag g">${t}</span>`).join('') || '<span class="muted">Қолдау түрі әлі таңдалмаған</span>'}</div>
          ${it.visual && it.visual.groups ? `<div class="small muted mt" style="margin-top:6px">Көрнекі сызба: ${it.visual.groups} топ × ${it.visual.per}</div>` : ''}`}
      </div></div>`).join('')}
    ${ed ? `<label class="f">Орындау тәсілі</label><textarea class="inp" id="edMethod">${esc(draftMethod(d))}</textarea><label class="f">Бағалау критерийі</label><textarea class="inp" id="edCrit">${esc(draftCriterion(d))}</textarea>
      <div class="row mt"><button class="btn ghost sm" id="resetEdits">Бастапқы ұсынысқа қайтару</button></div>` : ''}
    <div class="row mt2">
      <button class="btn blue" id="approveBtn" ${d.approved ? 'disabled' : ''}>${icon('check')}${d.approved ? 'Бекітілді' : 'Бекіту'}</button>
      <button class="btn" id="sendBtn" ${d.approved ? '' : 'disabled'}>${icon('send')}Оқушыға жіберу</button>
      <span class="small ${d.approved ? '' : 'muted'}">${d.approved ? `✓ Мұғалім бекітті: ${nowStr(d.approvedAt)}` : 'Жіберу үшін алдымен бекітіңіз'}</span>
    </div>
    ${as ? `<div class="note g mt small">✓ «${esc(studentName(d.studentId))}» оқушысына жіберілді: ${nowStr(as.sentAt)}${as.version !== d.approvedAt ? ' <b>(жіберілгеннен кейін өзгерістер болды — қайта жіберіңіз)</b>' : ''}</div>` : ''}
  </section>
  <section class="card" id="planCard"><div class="row"><h2 style="margin:0">Жалпы ҚМЖ ішіндегі көрінісі</h2><span class="spacer"></span>
    <button class="btn ghost sm" id="wordBtn" ${L.docxB64 ? '' : 'disabled title="Word экспорты жүктелген DOCX үшін ғана қолжетімді"'}>${icon('down')}Word жүктеу</button></div>
    <p class="muted small">Бөлек жоспар жасалмайды: бейімделген тапсырма жалпы сабақ жоспарының тиісті кезеңіне кіріктіріледі.${L.docxB64 ? ' Word файлында бастапқы құжат сақталып, тек осы блок қосылады.' : ' Word экспорты тек DOCX жүктелгенде қолжетімді.'}</p>
    ${planView(L, d, items)}
  </section>`;
}
function senBlockHtml(L, d, items) {
  const S = d.supports || {};
  return `<div class="sen"><h5>ЕББҚ оқушысына арналған бейімделген тапсырма ${d.approved ? '<span class="tag g">мұғалім бекітті</span>' : '<span class="tag w">жоба — бекітілмеген</span>'}</h5><dl>
    <dt>Бастапқы тапсырма:</dt><dd>${items.map(i => esc(i.original)).join('; ')}</dd>
    <dt>Қолдау тәсілдері:</dt><dd>${SUPPORTS.filter(([k]) => S[k]).map(([, t]) => t).join(', ') || '—'}</dd>
    <dt>Бейімделген нұсқаулық:</dt><dd>${items.map(i => esc(i.instruction)).join(' ')}</dd>
    <dt>Орындау тәсілі:</dt><dd>${esc(draftMethod(d))}</dd>
    <dt>Бағалау критерийі:</dt><dd>${esc(draftCriterion(d))}</dd></dl></div>`;
}
function planView(L, d, items) {
  const idx = d.stageIdx ?? L.senStageIdx ?? 0;
  if (!L.stages.length) return `<div><p><b>Тақырып:</b> ${esc(L.topic)}</p>${L.objectives ? `<p><b>Оқу мақсаты:</b> ${esc(L.objectives)}</p>` : ''}${senBlockHtml(L, d, items)}</div>`;
  return `<div class="scroll"><p><b>Тақырып:</b> ${esc(L.topic)}<br><b>Оқу мақсаты:</b> <span class="pre">${esc(L.objectives)}</span></p>
   <table class="plan"><tr><th>Кезең / уақыт</th><th>Педагогтің әрекеті</th><th>Оқушының әрекеті</th><th>Бағалау</th><th>Ресурстар</th></tr>
   ${L.stages.map((s, i) => `<tr><td class="st">${esc(s.name)}<div class="muted small">${esc(s.time)}</div></td>
     <td><div class="pre">${esc(s.teacher.length > 600 && i !== idx ? s.teacher.slice(0, 600) + '…' : s.teacher)}</div>${i === idx ? senBlockHtml(L, d, items) : ''}</td>
     <td class="pre">${esc(s.student)}</td><td class="pre">${esc(s.assessment)}</td><td class="pre">${esc(s.resources)}</td></tr>`).join('')}</table></div>`;
}
function bindAdapt() {
  const L = Store.get('lesson', null); if (!L) return;
  $('#stuSel').onchange = e => { const d = getDraft(); d.studentId = e.target.value; saveDraft(d, true); render(); };
  $$('[data-sup]').forEach(cb => cb.onchange = () => { const d = getDraft(); d.supports = { ...d.supports, [cb.dataset.sup]: cb.checked }; if (!d.method) d.method = ''; saveDraft(d); render(); });
  $('#editBtn').onclick = () => {
    if (state.editMode) {
      const d = getDraft(); const items = draftItems(L, d); d.custom = d.custom || {};
      $$('[data-ed]').forEach(el => {
        const id = el.dataset.id, f = el.dataset.ed, base = buildItem(L.senTasks.find(t => `${t.a}_${t.b}` === id), d.supports);
        let v = el.value.trim(); if (f === 'hints') v = v.split('\n').map(x => x.trim()).filter(Boolean);
        const same = f === 'hints' ? JSON.stringify(v) === JSON.stringify(base.hints) : v === base[f];
        d.custom[id] = d.custom[id] || {}; if (same) delete d.custom[id][f]; else d.custom[id][f] = v;
        if (!Object.keys(d.custom[id]).length) delete d.custom[id];
      });
      const m = $('#edMethod').value.trim(), c = $('#edCrit').value.trim();
      d.method = m === methodText(d.supports) ? '' : m; d.criterion = c === CRITERION_DEFAULT ? '' : c;
      const changed = JSON.stringify(getDraft()) !== JSON.stringify(d);
      saveDraft(d, !changed && getDraft().approved); state.editMode = false; toast(changed ? 'Өзгерістер сақталды. Қайта бекітіңіз.' : 'Өзгеріс жоқ', 'ok'); render();
    } else { state.editMode = true; render(); }
  };
  $('#resetEdits') && ($('#resetEdits').onclick = () => { const d = getDraft(); d.custom = {}; d.method = ''; d.criterion = ''; saveDraft(d); state.editMode = false; toast('Бастапқы ұсыныс қайтарылды'); render(); });
  $('#approveBtn').onclick = () => {
    if (state.editMode) { toast('Алдымен «Өңдеуді сақтау» батырмасын басыңыз', 'err'); return; }
    const d = getDraft(); if (!Object.values(d.supports || {}).some(Boolean)) { toast('Кемінде бір қолдау түрін таңдаңыз', 'err'); return; }
    d.approved = true; d.approvedAt = Date.now(); d.needReapprove = false; Store.set('draft', d); toast('Тапсырма бекітілді және ҚМЖ-ға кіріктірілді', 'ok'); render();
  };
  $('#sendBtn').onclick = () => {
    const d = getDraft(); if (!d.approved) return;
    const items = draftItems(L, d);
    const asg = { id: uid(), version: d.approvedAt, studentId: d.studentId, sentAt: Date.now(), subject: L.subject || 'Математика', grade: L.grade, topic: L.topic,
      stage: L.stages[d.stageIdx ?? L.senStageIdx ?? 0]?.name || '', supports: { ...d.supports }, items: items.map(({ edited, ...x }) => x), method: draftMethod(d), criterion: draftCriterion(d) };
    const all = Store.get('assignments', {}); all[d.studentId] = asg; Store.set('assignments', all);
    toast(`Тапсырма «${studentName(d.studentId)}» оқушысына жіберілді`, 'ok'); render();
  };
  $('#wordBtn').onclick = () => exportWord(L, getDraft()).catch(e => { console.error(e); toast('Word файлын жасау мүмкін болмады', 'err'); });
}

/* ---------------- Word экспорты: бастапқы DOCX + кіріктірілген блок ---------------- */
async function exportWord(L, d) {
  const items = draftItems(L, d); const S = d.supports || {};
  const entries = unzipEntries(b64ToBuf(L.docxB64));
  const de = entries.find(e => e.name === 'word/document.xml');
  const xml = new TextDecoder().decode(await inflateEntry(de));
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const mk = (tag) => doc.createElementNS(W_NS, 'w:' + tag);
  // Оқуға ыңғайлы блок: жиектеме (рамка), ақшыл фон, жуан белгілер, әр тапсырма мен қадам — жеке жолда.
  // Бастапқы кесте мен кезеңдер өзгермейді: блок тек ЕББҚ тапсырмасынан кейінгі абзацтар ретінде қосылады.
  const attr = (el, k, v) => { el.setAttributeNS(W_NS, 'w:' + k, v); return el; };
  const border = side => { const e = mk(side); attr(e, 'val', 'single'); attr(e, 'sz', '12'); attr(e, 'space', '4'); attr(e, 'color', '178A5E'); return e; };
  const para = (runs, o = {}) => {
    const p = mk('p'); const pPr = mk('pPr');
    const bdr = mk('pBdr'); ['top', 'left', 'bottom', 'right'].forEach(sd => bdr.appendChild(border(sd))); pPr.appendChild(bdr);
    const shd = mk('shd'); attr(shd, 'val', 'clear'); attr(shd, 'color', 'auto'); attr(shd, 'fill', o.head ? 'CDEBDD' : 'EEF8F3'); pPr.appendChild(shd);
    const sp = mk('spacing'); attr(sp, 'before', o.head ? '160' : '0'); attr(sp, 'after', o.gap ? '80' : '20'); attr(sp, 'line', '264'); attr(sp, 'lineRule', 'auto'); pPr.appendChild(sp);
    p.appendChild(pPr);
    for (const [text, st = {}] of runs) {
      const r = mk('r'); const rPr = mk('rPr');
      if (st.b || o.head) rPr.appendChild(mk('b'));
      if (o.head || st.color) { const c = mk('color'); attr(c, 'val', o.head ? '0F6B48' : st.color); rPr.appendChild(c); }
      if (o.head) { const sz = mk('sz'); attr(sz, 'val', '26'); rPr.appendChild(sz); }
      if (rPr.childNodes.length) r.appendChild(rPr);
      const t = mk('t'); t.setAttribute('xml:space', 'preserve'); t.textContent = String(text).replace(/ /g, ' '); r.appendChild(t); p.appendChild(r);
    }
    return p;
  };
  const L2 = (label, value) => [[[label + ' ', { b: true }], [value]], { gap: true }];
  const lines = [
    [[['ЕББҚ оқушысына арналған бейімделген тапсырма']], { head: true }],
    [[[d.approved ? '✓ Мұғалім тексеріп, бекітті' : 'Жоба — мұғалім әлі бекітпеген', { color: d.approved ? '0F6B48' : '9A5B00', b: true }]], { gap: true }],
    L2('Бастапқы тапсырма (ҚМЖ-дан):', items.map(i => i.original).join(';   ')),
    L2('Қолдау тәсілдері:', SUPPORTS.filter(([k]) => S[k]).map(([, t]) => t).join(', ') || '—'),
    [[['Бейімделген нұсқаулық:', { b: true }]], {}]
  ];
  items.forEach((it, i) => {
    lines.push([[[`${i + 1}) ${it.original}   `, { b: true }], [it.instruction]], {}]);
    if (it.explain) lines.push([[['      ' + it.explain]], {}]);
    it.hints.forEach((h, j) => lines.push([[[`      ${j + 1}-қадам: `, { b: true }], [h]], {}]));
    lines.push([[['      Сұрақ: ', { b: true }], [it.question]], { gap: true }]);
  });
  lines.push(L2('Орындау тәсілі:', draftMethod(d)));
  lines.push(L2('Бағалау критерийі:', draftCriterion(d)));
  lines.push([[['Ескерту: ұсыныс QolJetim AI ережеге негізделген демо-механизмі арқылы жасалды (тілдік модель емес); соңғы шешімді мұғалім қабылдайды.', { color: '5A6E69' }]], {}]);
  // ЕББҚ белгісі бар абзацты тауып, оның тапсырмаларынан кейін блокты қосамыз
  const ps = [...doc.getElementsByTagNameNS(W_NS, 'p')];
  let anchor = null;
  const mi = ps.findIndex(p => SEN_RX.test(pText(p)) && pText(p).length < 80);
  if (mi >= 0) { anchor = ps[mi]; let n = anchor.nextSibling; while (n) { if (n.nodeType === 1 && n.localName === 'p') { const t = pText(n).trim(); if (DIV_RX.test(t) || !t) { if (t) anchor = n; n = n.nextSibling; continue; } } break; } }
  if (anchor) { let ref = anchor; for (const [runs, o] of lines) { const p = para(runs, o); ref.parentNode.insertBefore(p, ref.nextSibling); ref = p; } }
  else { const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]; const sect = kids(body, 'sectPr')[0]; for (const [runs, o] of lines) body.insertBefore(para(runs, o), sect || null); }
  let out = new XMLSerializer().serializeToString(doc);
  if (!out.startsWith('<?xml')) out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n' + out;
  const data = new TextEncoder().encode(out);
  const files = entries.map(e => e.name === 'word/document.xml' ? { name: e.name, method: 0, crc: crc32(data), usize: data.length, data, time: e.time, date: e.date } : { name: e.name, method: e.method, crc: e.crc, usize: e.usize, data: e.raw, time: e.time, date: e.date });
  const blob = zipBuild(files, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const a = document.createElement('a');
  // file:// беттерінде Chrome blob сілтемесінің атын елемейді, сондықтан data: URL қолданамыз
  a.href = location.protocol === 'file:' ? 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,' + bufToB64(await blob.arrayBuffer()) : URL.createObjectURL(blob);
  a.download = 'QolJetim_KMZh_beiimdelgen.docx';
  document.body.appendChild(a); a.click(); setTimeout(() => { if (a.href.startsWith('blob:')) URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  toast('Word файлы жүктелді', 'ok');
}

/* ---------------- Оқушылар ---------------- */
function tStudents() {
  const st = students(); const as = Store.get('assignments', {}); const res = Store.get('results', []);
  return `<h1>Оқушылар</h1><p class="muted">Демо-тізім. Оқушыны аты немесе шартты белгісімен енгізіңіз. <b>Диагнозды жазбаңыз</b> — тек оқу барысында көмектесетін педагогикалық ескертпе.</p>
  <section class="card"><div class="scroll"><table class="tbl"><tr><th>Оқушы</th><th>Педагогикалық ескертпе</th><th>Тапсырма</th><th>Нәтиже</th><th></th></tr>
   ${st.map(s => { const a = as[s.id]; const r = res.filter(x => x.studentId === s.id).slice(-1)[0];
     return `<tr><td><b>${esc(s.name)}</b></td><td><input class="inp" data-note="${s.id}" value="${esc(s.note)}" placeholder="мысалы: нұсқаулықты қысқа берген тиімді"></td>
     <td>${a ? `<span class="tag g">жіберілді ${nowStr(a.sentAt)}</span>` : '<span class="muted small">жоқ</span>'}</td>
     <td>${r ? `${r.correct}/${r.total} дұрыс` : '<span class="muted small">—</span>'}</td>
     <td>${s.id !== 's1' ? `<button class="btn danger sm" data-del="${s.id}" aria-label="Өшіру">${icon('trash')}</button>` : ''}</td></tr>`; }).join('')}
  </table></div>
  <div class="row mt"><input class="inp" id="newStu" placeholder="Жаңа оқушының аты немесе шартты белгісі" style="max-width:340px"><button class="btn" id="addStu">${icon('plus')}Қосу</button></div></section>`;
}
function bindStudents() {
  $('#addStu').onclick = () => { const v = $('#newStu').value.trim(); if (!v) { toast('Атын енгізіңіз', 'err'); return; } const s = students(); s.push({ id: 's' + uid(), name: v, note: '' }); Store.set('students', s); toast('Оқушы қосылды', 'ok'); render(); };
  $$('[data-note]').forEach(i => i.onchange = () => { const s = students(); const o = s.find(x => x.id === i.dataset.note); o.note = i.value.trim(); Store.set('students', s); toast('Сақталды', 'ok'); });
  $$('[data-del]').forEach(b => b.onclick = () => { if (!confirm('Оқушы тізімнен өшірілсін бе?')) return; Store.set('students', students().filter(x => x.id !== b.dataset.del)); const a = Store.get('assignments', {}); delete a[b.dataset.del]; Store.set('assignments', a); render(); });
}

/* ---------------- Нәтижелер ---------------- */
function tResults() {
  const res = Store.get('results', []).slice().reverse();
  return `<h1>Нәтижелер</h1><p class="muted">Оқушы тапсырманы аяқтағанда нәтиже осында автоматты түрде пайда болады (басқа қойындыда ашылған оқушы кабинетінен де).</p>
  ${res.length ? res.map(r => `<section class="card"><div class="row"><h3 style="margin:0">${esc(r.studentName)}</h3><span class="tag">${nowStr(r.finishedAt)}</span><span class="spacer"></span><span class="muted small">${esc(r.topic)}</span></div>
     <div class="stats"><div class="stat"><b>${r.done}/${r.total}</b>орындалған тапсырма</div><div class="stat"><b>${r.correct}</b>дұрыс жауап</div><div class="stat"><b>${r.firstTry}</b>бірінші әрекеттен дұрыс</div></div>
     <div class="scroll mt"><table class="tbl"><tr><th>Тапсырма</th><th>Нәтиже</th><th>Әрекет саны</th><th>Ашылған қадамдар</th><th>Көрнекі сызба</th></tr>
     ${r.items.map(i => `<tr><td><b>${esc(i.original)}</b></td><td>${i.correct ? '<span class="tag g">дұрыс</span>' : '<span class="tag w">көмек қажет</span>'}</td><td>${i.attempts}</td><td>${i.hints}</td><td>${i.visual ? 'қолданды' : '—'}</td></tr>`).join('')}</table></div>
     <p class="muted small mt">Қолдау: ${esc(Object.entries(r.supports || {}).filter(([, v]) => v).map(([k]) => SUP_LABEL[k]).join(', ') || '—')}</p></section>`).join('')
    : `<section class="card"><p class="muted">Әзірге нәтиже жоқ. Тапсырманы оқушыға жіберіп, оқушы кабинетінде орындаңыз.</p><button class="btn blue" data-go="/s">${icon('student')}Оқушы кабинетін ашу</button></section>`}
  <div class="note mt">Бұл — оқу тапсырмасын орындау туралы педагогикалық ақпарат қана. Ол медициналық немесе психологиялық диагностика емес.</div>
  ${res.length ? `<div class="row mt"><button class="btn danger sm" id="clrRes">${icon('trash')}Нәтижелерді тазалау</button></div>` : ''}`;
}
function bindResults() { $('#clrRes') && ($('#clrRes').onclick = () => { if (confirm('Барлық нәтижелер өшірілсін бе?')) { Store.set('results', []); render(); } }); }

/* =====================================================================
   ОҚУШЫ КАБИНЕТІ
   ===================================================================== */
function studentShell(body, back) {
  return `<header class="top"><div class="wrap">
    ${back ? `<button class="btn ghost sm" data-go="${back}" aria-label="Артқа">${icon('left')}Артқа</button>` : ''}
    <button class="logo" data-go="/" aria-label="Басты бетке"><span class="logo-mark">QJ</span>QolJetim AI</button>
    <span class="tag">Оқушы</span><span class="spacer"></span>
    <button class="btn ghost sm" data-go="/">${icon('out')}Шығу</button>
  </div></header><main class="wrap stu" style="margin:0 auto">${body}</main>`;
}
function studentRender(sec) {
  const app = $('#app'); const st = students();
  let sid = sessionStorage.getItem('qj_sid'); if (!st.find(s => s.id === sid)) sid = null;
  if (sec === 'pick' || (!sid && st.length > 1 && sec !== 'pick')) {
    if (!sid && st.length > 1 && sec !== 'pick') return go('/s/pick');
    app.innerHTML = studentShell(`<h1>Сен кімсің?</h1><div class="grid2">${st.map(s => `<button class="btn ghost lg" data-sid="${s.id}">${icon('student')}${esc(s.name)}</button>`).join('')}</div>`, '/');
    $$('[data-sid]').forEach(b => b.onclick = () => { sessionStorage.setItem('qj_sid', b.dataset.sid); go('/s/home'); });
    return;
  }
  if (!sid) { sid = st[0].id; sessionStorage.setItem('qj_sid', sid); }
  const asg = Store.get('assignments', {})[sid];
  if (sec === 'task' && asg) { if (!state.run || state.run.asgId !== asg.id || state.run.sid !== sid) startRun(asg, sid); return renderTask(); }
  if (sec === 'done' && state.run && state.run.finished) return renderDone();
  // басты бет
  app.innerHTML = studentShell(`<h1>Сәлем, оқушы!</h1>${st.length > 1 ? `<p class="muted">${esc(studentName(sid))} · <a href="#/s/pick">басқа оқушы</a></p>` : ''}
    <section class="card mt"><h2>Бүгінгі тапсырма</h2>
     ${asg ? `<p style="font-size:19px;margin:4px 0"><b>${esc(asg.subject)}${asg.grade ? ' — ' + esc(asg.grade) + '-сынып' : ''}</b></p><p style="font-size:18px">${esc(asg.topic)}</p>
       <p class="muted">${asg.items.length} тапсырма${asg.supports.extraTime ? ' · Асықпа, уақыт жеткілікті' : ''}</p>
       <button class="btn lg" id="startBtn">${icon('right')}Тапсырманы бастау</button>`
      : `<p class="muted" style="font-size:18px">Әзірге тапсырма жоқ. Мұғалім тапсырма жібергенде, ол осында пайда болады.</p><button class="btn ghost" id="refresh">Жаңарту</button>`}
    </section>`, '/');
  $('#startBtn') && ($('#startBtn').onclick = () => { startRun(asg, sid); go('/s/task'); });
  $('#refresh') && ($('#refresh').onclick = () => render());
}
function startRun(asg, sid) {
  state.run = { asgId: asg.id, sid, asg, idx: 0, scale: asg.supports.bigText ? 1.35 : 1, finished: false,
    per: asg.items.map(() => ({ attempts: 0, hints: 0, correct: false, firstTry: false, visual: false, solved: false })) };
}
function renderTask() {
  const R = state.run, asg = R.asg, it = asg.items[R.idx], P = R.per[R.idx], S = asg.supports, n = asg.items.length;
  const app = $('#app');
  app.innerHTML = studentShell(`
   <div class="row stuhead"><b class="pcount">${R.idx + 1}/${n} тапсырма</b><span class="spacer"></span><span class="ptopic">${esc(asg.subject)} · ${esc(asg.topic)}</span></div>
   <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${R.idx + (P.solved ? 1 : 0)}" aria-label="Прогресс"><i style="width:${((R.idx + (P.solved ? 1 : 0)) / n) * 100}%"></i></div>
   <section class="card mt taskbox" style="--scale:${R.scale}">
     <div class="tools" role="toolbar" aria-label="Қолжетімділік">
       <div class="fontctl" role="group" aria-label="Әріп өлшемі">
         <button class="fbtn" id="aMinus" aria-label="Әріпті кішірейту" title="Әріпті кішірейту">А−</button>
         <span class="flabel">Әріп өлшемі</span>
         <button class="fbtn" id="aPlus" aria-label="Әріпті үлкейту" title="Әріпті үлкейту">А+</button>
       </div>
       ${S.tts ? `<button class="btn listen" id="speak">${icon('speaker')}Мәтінді тыңдау</button>` : ''}
     </div>
     <div id="ttsMsg"></div>
     <div class="expr" aria-label="Тапсырма">${esc(it.original)}</div>
     <div class="instr">${esc(it.instruction)}</div>
     ${it.explain ? `<div class="explain">${esc(it.explain)}</div>` : ''}
     ${S.extraTime ? '<p class="muted small" style="text-align:center">⏳ Асықпа — уақыт шектелмейді.</p>' : ''}
     <div id="hints">${it.hints.slice(0, P.hints).map((h, i) => `<div class="hint"><small>${i + 1}-қадам</small>${esc(h)}</div>`).join('')}</div>
     <div class="row mt" style="justify-content:center">
       ${it.hints.length ? `<button class="btn soft" id="nextHint" ${P.hints >= it.hints.length ? 'disabled' : ''}>${icon('bulb')}${P.hints ? 'Келесі қадам' : 'Қадамдап түсіндіру'}</button>` : ''}
       ${it.visual ? `<button class="btn soft" id="visBtn">${icon('grid')}Көрнекі түсіндіру</button>` : ''}
     </div>
     <div id="vis"></div>
     <p style="text-align:center;font-weight:700;margin-top:18px" class="instr">${esc(it.question)}</p>
     <form class="answer" id="ansForm" autocomplete="off">
       <label for="ans">Жауап:</label><input id="ans" inputmode="numeric" pattern="[0-9 ]*" ${P.solved ? 'disabled' : ''} aria-label="Жауап">
       ${it.remainder ? `<label for="rem">қалдық:</label><input id="rem" inputmode="numeric" ${P.solved ? 'disabled' : ''} aria-label="Қалдық">` : ''}
       <button class="btn lg" type="submit" ${P.solved ? 'disabled' : ''}>${icon('check')}Жауапты тексеру</button>
     </form>
     <div id="fb">${P.solved ? fbHtml(true) : ''}</div>
     <div class="row mt" style="justify-content:center" id="navRow">${navButtons()}</div>
   </section>`, '/s/home');
  bindTask();
  if (!P.solved) setTimeout(() => $('#ans')?.focus(), 50);
  if (R.visOpen) showVisual(true);
}
function fbHtml(ok) { return ok ? '<div class="fb ok" role="status">🎉 Жарайсың! Дұрыс жауап!</div>' : '<div class="fb no" role="status">Қайта байқап көр. Қажет болса, көмек ал.</div>'; }
function navButtons() {
  const R = state.run, P = R.per[R.idx], n = R.asg.items.length;
  if (P.solved) return R.idx < n - 1 ? `<button class="btn lg blue" id="nextTask">Келесі тапсырма${icon('right')}</button>` : `<button class="btn lg blue" id="finish">${icon('star')}Аяқтау</button>`;
  if (P.attempts >= 3) return R.idx < n - 1 ? `<button class="btn ghost" id="skipTask">Бұл тапсырманы кейін мұғаліммен бірге орындау · келесіге өту</button>` : `<button class="btn ghost" id="finish">Аяқтау</button>`;
  return '';
}
function bindTask() {
  const R = state.run, it = R.asg.items[R.idx], P = R.per[R.idx];
  const setScale = v => { R.scale = Math.max(0.8, Math.min(2.2, Math.round(v * 100) / 100)); $('.taskbox').style.setProperty('--scale', R.scale); };
  $('#aPlus').onclick = () => setScale(R.scale + 0.15);
  $('#aMinus').onclick = () => setScale(R.scale - 0.15);
  $('#speak') && ($('#speak').onclick = () => { const txt = [it.instruction, it.explain, ...it.hints.slice(0, P.hints), it.question].filter(Boolean).map(x => String(x).replace(/[.!?\s]+$/, '')).join('. ') + '.'; const box = $('#ttsMsg');
    const err = TTS.speak(txt, (st, code) => { if (!document.body.contains(box)) return;
      box.innerHTML = st === 'wait' ? '<div class="note small">Дауыс қосылып жатыр…</div>'
        : st === 'playing' ? `<div class="note g small">🔊 Оқылып жатыр (${esc(TTS.voice.name)})</div>`
        : st === 'end' ? ''
        : st === 'error' ? `<div class="note w small">Дыбыстау кезінде қате шықты (${esc(code || 'белгісіз')}). Интернетті тексеріп, батырманы қайта басыңыз.</div>`
        : '<div class="note w small">Дыбыс басталмады. Тексеріңіз: компьютердің және Edge қойындысының дыбысы қосулы ма, интернет бар ма. Содан кейін батырманы қайта басыңыз.</div>'; });
    if (err) box.innerHTML = `<div class="note w small">${esc(err)}</div>`; });
  $('#nextHint') && ($('#nextHint').onclick = () => { if (P.hints < it.hints.length) { P.hints++; const i = P.hints - 1;
    $('#hints').insertAdjacentHTML('beforeend', `<div class="hint"><small>${i + 1}-қадам</small>${esc(it.hints[i])}</div>`);
    const b = $('#nextHint'); b.innerHTML = icon('bulb') + 'Келесі қадам'; if (P.hints >= it.hints.length) b.disabled = true; } });
  $('#visBtn') && ($('#visBtn').onclick = () => showVisual(!R.visOpen));
  $('#ansForm').onsubmit = e => {
    e.preventDefault(); if (P.solved) return;
    const v = toInt($('#ans').value); const rv = it.remainder ? toInt($('#rem').value) : 0;
    if (isNaN(v) || (it.remainder && isNaN(rv))) { $('#fb').innerHTML = '<div class="fb no">Жауапты цифрмен жаз.</div>'; return; }
    P.attempts++;
    const ok = v === it.answer && rv === it.remainder;
    if (ok) { P.solved = true; P.correct = true; P.firstTry = P.attempts === 1; $('#ans').disabled = true; if ($('#rem')) $('#rem').disabled = true; $('#ansForm button').disabled = true;
      $('.progress>i').style.width = ((R.idx + 1) / R.asg.items.length * 100) + '%'; }
    $('#fb').innerHTML = fbHtml(ok);
    if (!ok && v > 0) { const prod = v * it.b; const big = prod > it.a, small = it.a - prod >= it.b;
      if (big || small) $('#fb').insertAdjacentHTML('beforeend', `<p class="small" style="text-align:center;font-size:calc(17px * var(--scale))">Тексеріп көр: ${fmt(v)} × ${fmt(it.b)} = ${fmt(prod)}. Бұл ${abl(it.a)} ${big ? 'көп — кішірек' : 'аз — үлкенірек'} сан керек.</p>`); }
    if (!ok) { $('#ans').select(); if (it.hints.length && P.hints < it.hints.length) $('#fb').insertAdjacentHTML('beforeend', `<div class="row mt" style="justify-content:center"><button class="btn soft sm" id="helpBtn">${icon('bulb')}Көмек алу</button></div>`); }
    $('#helpBtn') && ($('#helpBtn').onclick = () => $('#nextHint').click());
    $('#navRow').innerHTML = navButtons(); bindNav();
  };
  bindNav();
}
function bindNav() {
  const R = state.run;
  const nextT = () => { R.idx++; R.visOpen = false; renderTask(); };
  $('#nextTask') && ($('#nextTask').onclick = nextT);
  $('#skipTask') && ($('#skipTask').onclick = () => { R.per[R.idx].solved = false; nextT(); });
  $('#finish') && ($('#finish').onclick = finishRun);
}
function showVisual(open) {
  const R = state.run, it = R.asg.items[R.idx]; R.visOpen = open; const box = $('#vis');
  if (!open) { box.innerHTML = ''; return; }
  R.per[R.idx].visual = true;
  if (!it.visual || !it.visual.groups) { box.innerHTML = '<div class="note small mt">Бұл тапсырма үшін сызба тым үлкен. Қадамдап түсіндіруді қолдан.</div>'; return; }
  const { groups, per } = it.visual;
  box.innerHTML = `<p style="text-align:center" class="mt">Барлығы <b>${fmt(it.a)}</b> шеңбер. Әр топта <b>${per}</b> шеңбер. Неше топ бар? Санап көр.</p>
   <div class="vis" aria-label="${groups} топ, әр топта ${per}">${Array.from({ length: groups }, () => `<div class="grp">${'<i></i>'.repeat(per)}</div>`).join('')}</div>
   <p class="small muted" style="text-align:center">Әр топты басып, өзің сана.</p><div class="row mt" style="justify-content:center"><button class="btn ghost sm" id="countBtn">Санауды қайта бастау</button></div>`;
  let cnt = 0;
  $$('.grp').forEach(g => { g.style.cursor = 'pointer'; g.setAttribute('role', 'button'); g.tabIndex = 0;
    const mark = () => { if (g.querySelector('em')) return; cnt++; g.insertAdjacentHTML('beforeend', `<em>${cnt}</em>`); };
    g.onclick = mark; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mark(); } }; });
  $('#countBtn').onclick = () => { cnt = 0; $$('.grp em').forEach(x => x.remove()); };
}
function finishRun() {
  const R = state.run, asg = R.asg; R.finished = true;
  const total = asg.items.length, done = R.per.filter(p => p.solved).length;
  const rec = { id: uid(), studentId: R.sid, studentName: studentName(R.sid), assignmentId: asg.id, topic: asg.topic, finishedAt: Date.now(), supports: asg.supports,
    total, done, correct: R.per.filter(p => p.correct).length, firstTry: R.per.filter(p => p.firstTry).length, hints: R.per.reduce((s, p) => s + p.hints, 0),
    items: asg.items.map((it, i) => ({ original: it.original, correct: R.per[i].correct, attempts: R.per[i].attempts, hints: R.per[i].hints, visual: R.per[i].visual })) };
  const all = Store.get('results', []); all.push(rec); Store.set('results', all); R.result = rec;
  go('/s/done');
}
function renderDone() {
  const r = state.run.result;
  $('#app').innerHTML = studentShell(`<section class="card big-done mt"><div class="medal">${icon('star')}</div><h1>Тапсырмалар орындалды!</h1>
    <p class="muted" style="font-size:18px">${r.done === r.total ? 'Сен барлық тапсырманы орындадың. Жарайсың!' : 'Сен жақсы жұмыс істедің! Қалған тапсырманы мұғаліммен бірге орындаймыз.'}</p>
    <div class="stats"><div class="stat"><b>${r.done}/${r.total}</b>орындалған тапсырма</div><div class="stat"><b>${r.correct}</b>дұрыс жауап</div><div class="stat"><b>${r.hints}</b>қолданылған көмек</div></div>
    <p class="muted small mt">Нәтиже мұғалімге жіберілді.</p>
    <div class="row mt" style="justify-content:center"><button class="btn lg" data-go="/s/home">${icon('home')}Басты бетке</button></div></section>`, null);
}

/* ---------------- Іске қосу ---------------- */
TTS.init();
render();
