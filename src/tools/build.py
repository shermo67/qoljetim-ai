"""Builds the single-file app: src/ + samples/ -> index.html (no internet needed)."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parents[2]
css = (root/'src/styles.css').read_text(encoding='utf-8')
js = (root/'src/app.js').read_text(encoding='utf-8')
b64 = base64.b64encode((root/'samples/KMZh_51_matematika_4_synyp.docx').read_bytes()).decode()
html = f'''<!DOCTYPE html>
<html lang="kk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QolJetim AI — Бір сабақ — әр балаға тең мүмкіндік</title>
<meta name="description" content="QolJetim AI — инклюзивті білім беруге арналған платформа (демо-прототип)">
<style>
{css}
</style>
</head>
<body>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
<script>window.QJ_SAMPLE_B64="{b64}";</script>
<script>
{js}
</script>
</body>
</html>
'''
(root/'index.html').write_text(html, encoding='utf-8')
print('index.html', len(html))
