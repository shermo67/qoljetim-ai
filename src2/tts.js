/* =====================================================================
   Дыбыстау (Web Speech API) — тек қазақ дауысы болса
   ===================================================================== */
const TTS = {
  voice: null, total: 0, api: 'speechSynthesis' in window,
  init() { if (!this.api) return; const pick = () => { const vs = speechSynthesis.getVoices(); this.total = vs.length;
    this.voice = vs.find(v => /^kk/i.test(v.lang)) || vs.find(v => /kazakh|қазақ/i.test(v.name)) || null; }; pick(); speechSynthesis.onvoiceschanged = pick; },
  sayable(t) { return String(t).replace(/\u00a0/g, '').replace(/(\d)\s*[:÷]\s*(?=\d)/g, '$1 бөлу ').replace(/(\d)\s*[×x*]\s*(?=\d)/g, '$1 көбейту ').replace(/(\d)\s*[−-]\s*(?=\d)/g, '$1 азайту ').replace(/(\d)\s*\+\s*(?=\d)/g, '$1 қосу ').replace(/=\s*\?/g, ' нешеге тең').replace(/=/g, ' тең ').replace(/\?/g, '?'); },
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
