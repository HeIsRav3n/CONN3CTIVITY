#!/usr/bin/env python3
"""Remove a white studio background from a mascot PNG to true transparency.

Method (no ML, no network):
  1. Flood fill from the image border through near-white pixels only
     (min channel >= 246). Interior whites that are NOT connected to the
     border, such as eye highlights and the cream hoodie, are preserved,
     because the fill only follows border-connected pixels.
  2. Grow the transparent region 2 px into pixels with min channel >= 238.
     This cleans faint near-white specks and the anti-aliased halo without
     eating the character: the artwork is outlined in dark strokes, so the
     character edge is dark, not near-white.
  2b. Enclosed background pockets: near-white components that are NOT
     connected to the border, lie below 65% height and are larger than 50 px
     (for example the white gap enclosed between the eagle's legs). Eye
     highlights and chain glints sit above 65% height, so they survive.
  3. Remove the grey ground shadow: in the bottom band (below 75% height)
     delete large wide connected components of neutral-grey pixels
     (channel spread < 15, value 130..252). Paws are warm tan (spread far
     above 15) and claws are near black (below 130), so they survive.
     The silver chain is above the bottom band, so it survives too.
  4. Feather the alpha channel 1 px (Gaussian) for a clean edge.

Usage: python3 white_to_alpha.py INPUT.png OUTPUT.png [--crop-right N]
--crop-right drops N columns from the right edge first; used for the CM
eagle source, which has a 1 px grey edge artefact strip at x=706 while the
character itself ends well left of it.
"""
import argparse
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def remove_white_background(path, crop_right=0):
    img = Image.open(path).convert("RGB")
    if crop_right:
        img = img.crop((0, 0, img.width - crop_right, img.height))
    a = np.array(img).astype(np.int16)
    h, w, _ = a.shape
    mn = a.min(axis=2)
    spread = a.max(axis=2) - mn

    # 1. Flood fill: near-white pixels connected to the border.
    near_white = (mn >= 246) & (spread < 60)
    labels, count = ndimage.label(near_white)
    border_labels = set(np.unique(np.concatenate([
        labels[0, :], labels[-1, :], labels[:, 0], labels[:, -1],
    ]))) - {0}
    transparent = np.isin(labels, list(border_labels))

    # 2. Grow 2 px into faint near-white (>= 238) neighbours.
    growable = (mn >= 238) & (spread < 40)
    for _ in range(2):
        grown = ndimage.binary_dilation(transparent) & growable
        transparent = transparent | grown

    # 2b. Enclosed background pockets below 65% height.
    white_opaque = (mn >= 248) & (~transparent)
    comp_w, n_w = ndimage.label(white_opaque)
    for i in range(1, n_w + 1):
        ys, xs = np.where(comp_w == i)
        if len(ys) > 50 and ys.min() > int(h * 0.65):
            transparent[comp_w == i] = True

    # 3. Grey ground shadow: large wide neutral-grey components, bottom band.
    y0 = int(h * 0.75)
    grey = (spread < 15) & (mn >= 130) & (mn <= 252)
    band = np.zeros_like(grey)
    band[y0:, :] = grey[y0:, :]
    comp, n = ndimage.label(band)
    shadow = np.zeros_like(grey)
    for i in range(1, n + 1):
        ys, xs = np.where(comp == i)
        if len(ys) > 500 and (xs.max() - xs.min()) > w * 0.25:
            shadow[comp == i] = True
    transparent = transparent | shadow

    alpha = np.where(transparent, 0, 255).astype(np.uint8)
    out = np.dstack([a.astype(np.uint8), alpha])
    out_img = Image.fromarray(out, "RGBA")
    # 4. Feather the alpha edge by 1 px.
    r, g, b, al = out_img.split()
    al = al.filter(ImageFilter.GaussianBlur(radius=1))
    out_img = Image.merge("RGBA", (r, g, b, al))
    return out_img


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("input")
    ap.add_argument("output")
    ap.add_argument("--crop-right", type=int, default=0)
    args = ap.parse_args()

    out = remove_white_background(args.input, args.crop_right)
    out.save(args.output, optimize=True)

    arr = np.array(out)
    alpha = arr[:, :, 3]
    print(f"{args.output}: {out.width}x{out.height}")
    print(f"  corners alpha: TL={alpha[0,0]} TR={alpha[0,-1]} "
          f"BL={alpha[-1,0]} BR={alpha[-1,-1]}")
    print(f"  fully transparent: {100 * (alpha == 0).mean():.1f}%  "
          f"fully opaque: {100 * (alpha == 255).mean():.1f}%")
    print(f"  edge alpha (top row mean): {alpha[0, :].mean():.1f}  "
          f"(bottom row mean): {alpha[-1, :].mean():.1f}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
