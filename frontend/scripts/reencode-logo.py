from pathlib import Path
from PIL import Image

public = Path(__file__).resolve().parents[1] / "public"
candidates = [public / "ics-logo.backup.png", public / "ics-logo.opt.png", public / "ics-logo.png"]
src = next(p for p in candidates if p.exists())

im = Image.open(src).convert("RGBA")
clean = Image.new("RGBA", im.size)
clean.paste(im, (0, 0))

web = clean.copy()
web.thumbnail((640, 240), Image.Resampling.LANCZOS)

out_png = public / "ics-logo.png"
out_webp = public / "ics-logo.webp"
web.save(out_png, format="PNG", optimize=True, compress_level=9)
web.save(out_webp, format="WEBP", quality=90, method=6)
print("png", out_png.stat().st_size, web.size)
print("webp", out_webp.stat().st_size)

backend = Path(__file__).resolve().parents[2] / "backend" / "ECMS.API" / "Assets" / "ics-logo.png"
backend.write_bytes(out_png.read_bytes())
print("backend", backend.stat().st_size)

for name in ("ics-logo.opt.png", "ics-logo.backup.png", "ics-logo.jpg", "ics-logo.reencoded.png"):
    p = public / name
    if p.exists():
        p.unlink()
        print("removed", name)
