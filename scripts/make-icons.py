"""PWA 아이콘(PNG) 생성. 실행: python3 scripts/make-icons.py  (Pillow 필요)
favicon.svg와 같은 그림을 192/512(일반)와 512(maskable, 여백 넉넉)로 만든다."""
from PIL import Image, ImageDraw
import os

BG, LINE = (14, 17, 23), (70, 83, 111)
DOTS = [((14, 44), (79, 177, 132)), ((26, 34), (232, 101, 79)), ((38, 24), (214, 166, 75)), ((50, 36), (99, 150, 232))]

def bezier(p0, p1, p2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1-t)**3*p0[0] + 3*(1-t)**2*t*p1[0] + 3*(1-t)*t**2*p2[0] + t**3*p3[0]
        y = (1-t)**3*p0[1] + 3*(1-t)**2*t*p1[1] + 3*(1-t)*t**2*p2[1] + t**3*p3[1]
        pts.append((x, y))
    return pts

def render(size, safe=1.0, rounded=True):
    S = 4  # 안티앨리어싱용 확대
    img = Image.new("RGBA", (size * S, size * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    full = size * S
    if rounded:
        d.rounded_rectangle([0, 0, full, full], radius=int(full * 14 / 64), fill=BG)
    else:
        d.rectangle([0, 0, full, full], fill=BG)
    k = full / 64 * safe
    off = (full - 64 * k) / 2
    P = lambda x, y: (off + x * k, off + y * k)
    path = bezier(P(6, 44), P(20, 44), P(22, 22), P(36, 22)) + bezier(P(36, 22), P(50, 22), P(52, 40), P(58, 40))
    d.line(path, fill=LINE, width=int(3 * k), joint="curve")
    for (x, y), c in DOTS:
        cx, cy = P(x, y); r = 5 * k
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    return img.resize((size, size), Image.LANCZOS)

os.makedirs("public/icons", exist_ok=True)
render(192).save("public/icons/icon-192.png")
render(512).save("public/icons/icon-512.png")
render(512, safe=0.72, rounded=False).save("public/icons/icon-maskable-512.png")
print("icons written")
