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
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
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
    stages: [], mainTasks: [], senTasks: [], candidates: [], senLines: [], senFound: false, senLabel: '', senStage: '', rawText: '' };
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
      // Мұғалім қолмен таңдай алатын барлық жолдар
      if (line.length >= 3 && line.length <= 400 && /[0-9A-Za-zА-Яа-яӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(line)) L.candidates.push({ text: line, stage: stageName, stageIdx });
      if (SEN_RX.test(line) && line.length < 80) { senMode = true; L.senFound = true; L.senLabel = line.replace(/\s+/g, ' '); L.senStage = stageName; L.senStageIdx = stageIdx; continue; }
      const m = line.match(DIV_RX);
      if (senMode) {
        if (m) { const a = toInt(m[1]), b = toInt(m[2]); if (b > 0) L.senTasks.push({ a, b, given: m[3].trim(), raw: line }); continue; }
        if (!line && !L.senTasks.length) continue;
        if (line && L.senLines.length < 12) { L.senLines.push({ text: line, stage: stageName, stageIdx }); continue; }
        senMode = false;
      }
      if (TASK_HEAD_RX.test(line)) { cur = { title: line.replace(/\s+/g, ' '), stage: stageName, examples: [] }; L.mainTasks.push(cur); continue; }
      if (cur && (m || ANY_EXPR_RX.test(line)) && cur.examples.length < 6) cur.examples.push(line);
    }
  };
  if (L.stages.length) L.stages.forEach((s, i) => scan(s.teacher + '\n' + s.student, s.name, i)); else scan(L.rawText, '', -1);
  if (!L.stages.length && !L.candidates.length) L.rawText.split('\n').map(x => x.trim()).filter(x => x.length >= 3 && x.length <= 400).slice(0, 300).forEach(text => L.candidates.push({ text, stage: '', stageIdx: -1 }));

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
  L.ok = !!(L.topic || L.stages.length || L.senTasks.length || L.candidates.length);
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
