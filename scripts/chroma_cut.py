"""Chroma-key Recraft mascots onto a clean transparent PNG."""
from PIL import Image, ImageFilter
import numpy as np
import sys


def cut(src, dst, max_side=1400):
    im = Image.open(src).convert('RGBA')
    arr = np.array(im).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    h, w = r.shape
    samples = np.stack([
        arr[6, 6, :3],
        arr[6, w - 7, :3],
        arr[h - 7, 6, :3],
        arr[h - 7, w - 7, :3],
        arr[8, w // 2, :3],
    ])
    kr, kg, kb = samples.mean(axis=0)
    ge = g - np.maximum(r, b)
    dist = np.sqrt((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2)
    t = np.maximum(np.clip((ge - 16) / 42, 0, 1), np.clip((88 - dist) / 46, 0, 1))
    alpha = np.where(
        (ge > 58) | (dist < 42),
        0.0,
        np.where((ge > 16) | (dist < 88), 255.0 * (1.0 - t), 255.0),
    )
    spill = (g > r + 8) & (g > b + 8) & (alpha > 0)
    g2 = np.where(spill, np.minimum(g, (r + b) * 0.48 + 6), g)
    fringe = spill & (alpha < 220) & (ge > 18)
    alpha = np.where(fringe, alpha * np.clip(1.0 - (ge - 18) / 36, 0, 1), alpha)
    alpha = np.where(spill & (ge > 40) & (alpha < 160), 0.0, alpha)
    out = np.dstack([r, g2, b, alpha]).clip(0, 255).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    bbox = img.getbbox()
    if bbox:
        pad = 28
        box = (
            max(0, bbox[0] - pad),
            max(0, bbox[1] - pad),
            min(w, bbox[2] + pad),
            min(h, bbox[3] + pad),
        )
        img = img.crop(box)
    img.putalpha(img.split()[3].filter(ImageFilter.GaussianBlur(0.65)))
    if max(img.size) > max_side:
        img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    img.save(dst, 'PNG', optimize=True)
    a2 = np.array(img.split()[-1])
    print(
        dst,
        img.size,
        'zero_pct',
        round(float((a2 == 0).mean()) * 100, 1),
        'key',
        int(kr),
        int(kg),
        int(kb),
    )


if __name__ == '__main__':
    cut(sys.argv[1], sys.argv[2])
