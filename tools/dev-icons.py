"""
Writes the dev app's icons (Jonas, 2026-11-18: "dev" on the dev icon): each
icon in public/icons with a red band and the word DEV across its lower part,
inside the safe zone of the maskable icon. Run it again whenever the icons
change; tests/devIcons.test.ts fails until it has been run.

    python3 tools/dev-icons.py
"""
import hashlib, json, pathlib
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'icons'
OUT = SRC / 'dev'
FONT = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'
NAMES = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png']

OUT.mkdir(exist_ok=True)
hashes = {}
for name in NAMES:
    data = (SRC / name).read_bytes()
    hashes[name] = hashlib.sha256(data).hexdigest()
    im = Image.open(SRC / name).convert('RGBA')
    w, h = im.size
    S = 4
    band = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(band)
    top, bottom = int(h * 0.60) * S, int(h * 0.80) * S
    d.rectangle((0, top, w * S, bottom), fill=(200, 30, 30, 240))
    d.line((0, top, w * S, top), fill=(255, 255, 255, 255), width=max(2, w // 64) * S)
    d.line((0, bottom, w * S, bottom), fill=(255, 255, 255, 255), width=max(2, w // 64) * S)
    font = ImageFont.truetype(FONT, int((bottom - top) * 0.78))
    d.text((w * S / 2, (top + bottom) / 2), 'DEV', font=font, fill=(255, 255, 255, 255), anchor='mm')
    band = band.resize((w, h), Image.LANCZOS)
    Image.alpha_composite(im, band).save(OUT / name)
(OUT / 'source.json').write_text(json.dumps(hashes, indent=1) + '\n')
print('wrote', len(NAMES), 'dev icons')
