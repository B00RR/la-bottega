"""Compose out/tavola_stile.png (1600x1000) from the Blender previews. PIL only."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
O = "/workspace/bottega3d/out/"
W, H = 1600, 1000
F = "/usr/share/fonts/truetype/dejavu/"
f = lambda n, s: ImageFont.truetype(F + n, s)
T, B, R, S = f("DejaVuSans-Bold.ttf", 30), f("DejaVuSans-Bold.ttf", 17), f("DejaVuSans.ttf", 14), f("DejaVuSans.ttf", 12)
INK, SOFT = "#3C291C", "#7A5A48"
im = Image.new("RGB", (W, H), "#FBEFE6")
d = ImageDraw.Draw(im)

def card(x, y, w, h, path, label):
    sh = Image.new("RGBA", (w + 24, h + 24), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((12, 14, w + 12, h + 14), 18, fill=(122, 74, 58, 60))
    im.paste(sh.filter(ImageFilter.GaussianBlur(7)), (x - 12, y - 12), sh.filter(ImageFilter.GaussianBlur(7)))
    src = Image.open(path).convert("RGB")
    sw, shh = src.size
    sc = max(w / sw, h / shh)
    src = src.resize((int(sw * sc), int(shh * sc)), Image.LANCZOS)
    l, t = (src.width - w) // 2, (src.height - h) // 2
    src = src.crop((l, t, l + w, t + h))
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w, h), 16, fill=255)
    im.paste(src, (x, y), m)
    d.rounded_rectangle((x + 10, y + h - 34, x + 10 + d.textlength(label, font=S) + 18, y + h - 10), 10, fill="#FFF6EA")
    d.text((x + 19, y + h - 29), label, font=S, fill=INK)

d.text((40, 28), "La Bottega · Tavola di stile v1", font=T, fill=INK)
d.text((40, 66), "Proposta da approvare · campione: torcia (torcia.glb, 2368 tris) · render Blender 4.2 Cycles · nessun asset di terzi né IA",
       font=R, fill=SOFT)
card(40, 100, 380, 380, O + "preview_torcia_montata.png", "montata · 3/4")
card(436, 100, 380, 380, O + "preview_torcia_fondo_vite.png", "fondo + vite (pivot sull'asse)")
card(40, 500, 776, 470, O + "preview_torcia_esplosa.png", "esplosa lungo l'asse: tappo · vite · pile · contatto · corpo")

X = 850
d.text((X, 100), "Palette (sRGB)", font=B, fill=INK)
pal = [("pesca", "#F4D2C0"), ("terracotta", "#E8977C"), ("salvia", "#8FBFA8"), ("miele", "#F0B86E"),
       ("oro", "#FFE7B0"), ("crema", "#FFF6EA"), ("legno", "#C4844E"), ("acciaio", "#A99E94"),
       ("argento", "#D9DDE2"), ("oliva", "#8A9A5B"), ("ossido", "#6E8B4E"), ("cacao", "#3C291C")]
sw, shh, gap = 166, 62, 12
for i, (n, hx) in enumerate(pal):
    cx, cy = X + (i % 4) * (sw + gap), 130 + (i // 4) * (shh + 30)
    d.rounded_rectangle((cx, cy, cx + sw, cy + shh), 12, fill=hx, outline="#E7CBB8")
    d.text((cx + 2, cy + shh + 4), f"{n}  {hx}", font=S, fill=INK)

def section(y, title, lines):
    d.text((X, y), title, font=B, fill=INK)
    y += 26
    for ln in lines:
        d.text((X + 4, y), "• " + ln, font=R, fill=INK if not ln.startswith(" ") else SOFT)
        y += 20
    return y + 10

y = 420
y = section(y, "Materiali", [
    "MeshStandard / Principled, un colore piatto per materiale, niente texture",
    "roughness: plastica 0.45–0.6 · legno/stoffa 0.75–0.9 · lente 0.2",
    "metalli: metalness 0.55–0.75, roughness 0.3–0.4 (tutto il resto 0)",
    "smussi nel profilo, 1 segmento da 1–3 mm · niente subdivision",
    "smooth by angle 30–40° · nessun contorno · emissive solo dal codice",
])
y = section(y, "Luce (quella di scena.js, three r186)", [
    "Hemisphere #fff6ea / #c4844e 0.62 + Directional #ffd59a 2.45",
    "ombre PCF 1024 · RoomEnvironment PMREM · ACES, exposure 1.08",
    "sfondo #F4D2C0 · anteprime: chiave calda, riempimento pesca, taglio crema",
])
y = section(y, "Budget triangoli", [
    "attrezzo 300–1200 · oggetto da riparare 1500–3500",
    "personaggio 3000–6000 · banco/arredo 1500–4000 · decoro 100–600",
    "scena sul telefono < 60k tris e < 40 draw call",
])
section(y, "glTF", [
    "GLB, Y in alto, metri, niente Draco · radice vuota 'torcia'",
    "nodi = id di registra(): tappo, vite, contatto, pila_a/b, vetro, macchia",
])
im.save(O + "tavola_stile.png")
print("ok", im.size)
