"""QolJetim AI 2.0: src2/*.js + styles.css + samples + src/audio -> v2/index.html (бір файл, интернетсіз)."""
import base64, json, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
s2 = root/'src2'
css = (s2/'styles.css').read_text(encoding='utf-8')
js = '\n'.join((s2/f).read_text(encoding='utf-8') for f in ['core.js','tasks.js','tts.js','qr.js','ui.js'])
b64 = base64.b64encode((root/'samples/KMZh_51_matematika_4_synyp.docx').read_bytes()).decode()
mime = {'.mp3':'audio/mpeg','.m4a':'audio/mp4','.ogg':'audio/ogg','.wav':'audio/wav','.webm':'audio/webm'}
adir = root/'src/audio'
audio = {f.stem: f"data:{mime[f.suffix.lower()]};base64," + base64.b64encode(f.read_bytes()).decode() for f in sorted(adir.iterdir()) if f.suffix.lower() in mime} if adir.exists() else {}
fbf = s2/'feedback_url.txt'
fb = fbf.read_text(encoding='utf-8').strip() if fbf.exists() else ''
html = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QolJetim AI — Бір сабақ — әр балаға тең мүмкіндік</title>
<meta name="description" content="QolJetim AI — ЕББҚ оқушысының тапсырмасын бейімдеуге және ортақ ҚМЖ-ға кіріктіруге арналған тегін веб-платформа">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
<script>window.QJ_SAMPLE_B64="{b64}";window.QJ_AUDIO={json.dumps(audio)};window.QJ_FEEDBACK_URL={json.dumps(fb)};</script>
<script>
{js}
</script>
</body>
</html>
'''
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root/'v2'/'index.html'
out.parent.mkdir(parents=True, exist_ok=True); out.write_text(html, encoding='utf-8')
print(out, len(html), 'audio:', list(audio), 'feedback:', bool(fb))
