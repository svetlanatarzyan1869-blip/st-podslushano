#!/usr/bin/env python3
# Собирает расширение SillyTavern «Подслушано 👂» (порт плагина Tavo ~/Desktop/кодики/podslushano).
#   src/index.template.js — движок (токены __ALBUM__ __SONGS__ __STICKERS__ __AVATAR__ __FAB__ __VERSION__)
#   ../podslushano/src/panel.css — те же стили, что в Tavo; при сборке #pdx-root удваивается
#       (#pdx-root#pdx-root): темы таверны грузятся ПОСЛЕ стилей расширения и иначе
#       перебивают цвета и тени при равной специфичности.
#   ../podslushano/album/tags.txt, index.json, songs.txt — общие с Tavo (правятся там)
# Результат: index.js, style.css, manifest.json в корне (так ставится по ссылке с GitHub).
import json, os, re, io, base64
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
TAVO = os.path.join(ROOT, '..', 'podslushano')
VERSION = '1.0.2'
MOODS = 'love longing sad jealous party street sunset cozy funny sassy drama flirt'.split()
STICKER_IDS = ['03', '06', '08', '11', '16', '23', '25', '31', '39', '48']
AVATAR_ID = '10'   # Спотти с большими глазами — аватар паблика
FAB_ID = '32'      # Спотти читает журнал — плавающая кнопка
STICKER_DIR = os.path.join(ROOT, '..', 'tavo-vk2017', 'stickers', 'hq')

def lines(path):
    for n, l in enumerate(open(path, encoding='utf-8'), 1):
        l = l.strip()
        if l and not l.startswith('#'): yield n, l

index = {it['id']: it for it in json.load(open(os.path.join(TAVO, 'album', 'index.json'), encoding='utf-8'))}
album = []
for n, l in lines(os.path.join(TAVO, 'album', 'tags.txt')):
    m = re.match(r'^(\d\d)\s+([a-z ]+?)\s*(\|.*)?$', l)
    if not m: raise SystemExit('album/tags.txt строка %d: не понял «%s»' % (n, l))
    tags = m.group(2).split()
    bad = [t for t in tags if t not in MOODS]
    if bad: raise SystemExit('album/tags.txt строка %d: неизвестный тег %s' % (n, bad))
    it = index[m.group(1)]
    album.append({'id': it['id'], 'tags': tags, 'w': it['w'], 'h': it['h']})

songs = []
for n, l in lines(os.path.join(TAVO, 'songs.txt')):
    parts = [x.strip() for x in l.split('|')]
    if len(parts) != 3 or not parts[2]: raise SystemExit('songs.txt строка %d: нужно «Исполнитель | Название | теги»' % n)
    tags = parts[2].split()
    bad = [t for t in tags if t not in MOODS]
    if bad: raise SystemExit('songs.txt строка %d: неизвестный тег %s' % (n, bad))
    songs.append({'id': str(len(songs) + 1), 'a': parts[0], 't': parts[1], 'tags': tags})

def sticker_uri(sid, q):
    im = Image.open(os.path.join(STICKER_DIR, sid + '.png')).convert('RGBA').resize((128, 128), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
stickers = {sid: sticker_uri(sid, 75) for sid in STICKER_IDS}

js = open(os.path.join(ROOT, 'src', 'index.template.js'), encoding='utf-8').read()
for tok, val in (('__ALBUM__', album), ('__SONGS__', songs), ('__STICKERS__', stickers),
                 ('__AVATAR__', sticker_uri(AVATAR_ID, 80)), ('__FAB__', sticker_uri(FAB_ID, 80)), ('__VERSION__', VERSION)):
    assert js.count(tok) == 1, tok
    js = js.replace(tok, json.dumps(val, ensure_ascii=False))
open(os.path.join(ROOT, 'index.js'), 'w', encoding='utf-8').write(js)

css = open(os.path.join(TAVO, 'src', 'panel.css'), encoding='utf-8').read()
css = css.replace('#pdx-root', '#pdx-root#pdx-root')
css += open(os.path.join(ROOT, 'src', 'st-extra.css'), encoding='utf-8').read()
open(os.path.join(ROOT, 'style.css'), 'w', encoding='utf-8').write(css)

manifest = {
    'display_name': 'Подслушано 👂',
    'loading_order': 100,
    'requires': [],
    'optional': [],
    'js': 'index.js',
    'css': 'style.css',
    'author': 'Света русреал',
    'version': VERSION,
    'homePage': 'https://github.com/svetlanatarzyan1869-blip/st-podslushano',
    'auto_update': True,
}
json.dump(manifest, open(os.path.join(ROOT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('собрано: st-podslushano v%s | index.js %.1f КБ | сохранёнок %d | песен %d | стикеров %d' % (
    VERSION, os.path.getsize(os.path.join(ROOT, 'index.js')) / 1024, len(album), len(songs), len(stickers)))
