#!/usr/bin/env python3
"""Optimise les photos d'articles pour le web.   Usage :  python3 scripts/optimize_photos.py

Entrée  : photos-source/<adresse-de-l-article>.jpg|.jpeg|.png|.webp   (photo d'origine, 1424 px de large minimum conseillé)
Sortie  : public/images/photos/<adresse>-480.webp, -712.webp, -1424.webp  (recadrées en 712 x 384, WebP, métadonnées retirées)
          + le registre src/data/photos.js (utilisé par le site)
Nécessite : Python 3 et Pillow (pip install pillow). Les photos d'origine ne sont pas versionnées dans Git.
"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'photos-source'
OUT = ROOT / 'public' / 'images' / 'photos'
REGISTRY = ROOT / 'src' / 'data' / 'photos.js'
WIDTHS = (480, 712, 1424)          # tailles produites (largeur)
RATIO = 712 / 384                  # format des cartes du site
QUALITY = 78                       # compromis poids / finesse
MIN_SOURCE_WIDTH = 1000

def crop_to_ratio(img):
    w, h = img.size
    target_h = round(w / RATIO)
    if target_h <= h:              # trop haute : on recadre en hauteur (centre légèrement haut : visages)
        top = round((h - target_h) * 0.4)
        return img.crop((0, top, w, top + target_h))
    target_w = round(h * RATIO)    # trop large : on recadre en largeur
    left = (w - target_w) // 2
    return img.crop((left, 0, left + target_w, h))

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    registry, problems = {}, []
    files = sorted(p for p in SRC.glob('*') if p.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'))
    if not files:
        print('Aucune photo dans photos-source/ : rien à faire.')
    for path in files:
        slug = path.stem
        if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', slug):
            problems.append(f'{path.name} : le nom doit être l’adresse (slug) de l’article, en minuscules'); continue
        img = ImageOps.exif_transpose(Image.open(path)).convert('RGB')   # respecte l'orientation, retire l'EXIF
        if img.width < MIN_SOURCE_WIDTH:
            problems.append(f'{path.name} : trop petite ({img.width} px de large, {MIN_SOURCE_WIDTH} minimum)'); continue
        base = crop_to_ratio(img)
        for width in WIDTHS:
            height = round(width / RATIO)
            resized = base.resize((width, height), Image.LANCZOS) if base.width != width else base
            resized.save(OUT / f'{slug}-{width}.webp', 'WEBP', quality=QUALITY, method=6)
        registry[slug] = {
            'src': f'/images/photos/{slug}-712.webp',
            'srcset': ', '.join(f'/images/photos/{slug}-{w}.webp {w}w' for w in WIDTHS),
            'width': 712, 'height': 384,
        }
        print(f'OK  {slug}  ' + ' / '.join(f'{w}px {(OUT / f"{slug}-{w}.webp").stat().st_size // 1024} Ko' for w in WIDTHS))
    # Conserve aussi les photos déjà traitées dont l'original n'est plus là.
    for existing in sorted(OUT.glob('*-712.webp')):
        slug = existing.name[:-9]
        registry.setdefault(slug, {'src': f'/images/photos/{slug}-712.webp',
                                   'srcset': ', '.join(f'/images/photos/{slug}-{w}.webp {w}w' for w in WIDTHS),
                                   'width': 712, 'height': 384})
    body = json.dumps(dict(sorted(registry.items())), indent=2, ensure_ascii=False)
    REGISTRY.write_text(
        "// REGISTRE DES PHOTOS — fichier généré par `python3 scripts/optimize_photos.py` (ne pas modifier à la main).\n"
        "// Associe chaque article (slug) à ses photos optimisées (WebP, 3 tailles). Un article absent de cette liste\n"
        "// garde son illustration (src/data/images.js).\n"
        f"export const photos = {body};\n", encoding='utf-8')
    for p in problems: print('ATTENTION', p)
    return 1 if problems else 0

if __name__ == '__main__':
    sys.exit(main())
