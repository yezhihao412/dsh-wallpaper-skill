#!/usr/bin/env python
"""把一张图处理成 DSH 界面壁纸。

输出两种尺寸：
  <out>/<name>-2880x1800.jpg   全尺寸（给桌面/手动设置用）
  <out>/embed-<name>.jpg       2000x1250，压缩到适合内嵌成 data URI

用法示例：
  python make_wallpaper.py --src 输入.jpg --out D:\\...\\wallpapers --mode dark \
      --brightness 1.0 --vignette 0.18 --crop-bottom 0
"""
from __future__ import annotations

import argparse
import os

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

W, H = 2880, 1800
EMBED = (2000, 1250)


def cover(img: Image.Image, w: int, h: int) -> Image.Image:
    ratio = max(w / img.width, h / img.height)
    nw, nh = int(round(img.width * ratio)), int(round(img.height * ratio))
    img = img.resize((nw, nh), Image.LANCZOS)
    left, top = (nw - w) // 2, (nh - h) // 2
    return img.crop((left, top, left + w, top + h))


def radial(w: int, h: int, inner: float, power: float = 1.6) -> np.ndarray:
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w / 2.0) / (w / 2.0)) ** 2 + ((yy - h / 2.0) / (h / 2.0)) ** 2)
    d = np.clip((d - inner) / max(1e-6, 1.0 - inner), 0.0, 1.0)
    return np.power(d, power)


def vignette(img: Image.Image, color: tuple[int, int, int], strength: float, inner: float) -> Image.Image:
    if strength <= 0:
        return img
    arr = np.asarray(img).astype(np.float32)
    mask = radial(img.width, img.height, inner)[..., None] * strength
    tint = np.array(color, dtype=np.float32)[None, None, :]
    return Image.fromarray(np.clip(arr * (1.0 - mask) + tint * mask, 0, 255).astype(np.uint8))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--mode', choices=['dark', 'light'], default='dark')
    ap.add_argument('--name', default=None, help='输出文件名前缀，默认 dark-starry / light-sunrise')
    ap.add_argument('--brightness', type=float, default=1.0)
    ap.add_argument('--contrast', type=float, default=1.02)
    ap.add_argument('--color', type=float, default=1.2)
    ap.add_argument('--warmth', type=float, default=0.0, help='0.10 左右会明显偏暖')
    ap.add_argument('--vignette', type=float, default=0.20)
    ap.add_argument('--vignette-inner', type=float, default=0.48)
    ap.add_argument('--blur', type=float, default=0.4)
    ap.add_argument('--crop-bottom', type=float, default=0.0, help='裁掉底部比例，用来去水印')
    ap.add_argument('--quality', type=int, default=78, help='内嵌图质量')
    args = ap.parse_args()

    name = args.name or ('dark-starry' if args.mode == 'dark' else 'light-sunrise')
    os.makedirs(args.out, exist_ok=True)

    img = Image.open(args.src).convert('RGB')
    if args.crop_bottom > 0:
        img = img.crop((0, 0, img.width, int(img.height * (1 - args.crop_bottom))))

    img = cover(img, W, H)
    img = ImageEnhance.Color(img).enhance(args.color)
    img = ImageEnhance.Contrast(img).enhance(args.contrast)
    img = ImageEnhance.Brightness(img).enhance(args.brightness)

    if args.warmth:
        arr = np.asarray(img).astype(np.float32)
        arr[..., 0] *= 1.0 + args.warmth
        arr[..., 1] *= 1.0 + args.warmth * 0.28
        arr[..., 2] *= 1.0 - args.warmth * 0.20
        img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if args.blur:
        img = img.filter(ImageFilter.GaussianBlur(args.blur))

    tint = (8, 11, 20) if args.mode == 'dark' else (255, 250, 242)
    img = vignette(img, tint, args.vignette, args.vignette_inner)

    full = os.path.join(args.out, f'{name}-{W}x{H}.jpg')
    img.save(full, 'JPEG', quality=92, subsampling=1, optimize=True)

    embed = os.path.join(args.out, f'embed-{name}.jpg')
    img.resize(EMBED, Image.LANCZOS).save(embed, 'JPEG', quality=args.quality, optimize=True, subsampling=2)

    print(f'full  {full}  {os.path.getsize(full)/1024:,.0f} KB')
    print(f'embed {embed}  {os.path.getsize(embed)/1024:,.0f} KB')


if __name__ == '__main__':
    main()
