import json, os, sys, io, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
BASE = os.path.dirname(os.path.abspath(__file__))

cfg = json.load(open(os.path.join(BASE, 'edits.json'), encoding='utf-8'))
boxes = {}
for f in glob.glob(os.path.join(BASE, '[pf][123]_*.json')):
    key = 'p' + os.path.basename(f).split('_')[0][1]
    idx = int(os.path.basename(f).split('_')[1].split('.')[0])
    data = json.load(open(f, encoding='utf-8'))
    def walk(shapes):
        for s in shapes:
            if s.get('type') == 'group':
                walk(s.get('children', []))
            else:
                boxes[(key, idx, s.get('id'))] = (s.get('w'), s.get('h'))
    walk(data.get('shapes', []))


def cw(text, size):
    return sum((0.55 * size if ord(ch) < 128 else size) for ch in text)


warn = []
for deck, dcfg in cfg.items():
    print('\n' + '=' * 78)
    print('DECK', deck)
    for e in dcfg['edits']:
        shape, page = e['shape'], e['page']
        size = e['base']['font_size']
        bw, bh = boxes.get((deck, page, shape), (None, None))
        if bw is None:
            print(f'  ? {e["_n"]} [{shape}] 找不到尺寸')
            continue
        text = "\r".join([""] * e.get('lead', 0) + e['paras'] + [""] * e.get('trail', 0)) + "\r"
        paras = text.split('\r')
        if paras and paras[-1] == '':
            paras.pop()                 # 末尾 \r 是段落结束符，不算一行
        lines = 0
        detail = []
        for para in paras:
            w = cw(para, size)          # 段落总宽（磅）
            n = max(1, int(w / bw) + (1 if w % bw > 0.5 else 0)) if para else 1
            lines += n
            if para:
                detail.append(n)
        cap = bh / (size * 1.35)
        flag = 'OK ' if lines <= cap else '溢出'
        if lines > cap:
            warn.append((deck, e['_n'], shape, lines, round(cap, 1), bw, bh, size))
        print(f'  {flag} {e["_n"]:<22} [{shape}] 需{lines}行 可容{cap:.1f}行 '
              f'(框{bw}x{bh} sz{size}) 各段行数{detail}')

print('\n' + '=' * 78)
if warn:
    print(f'⚠ 有 {len(warn)} 处可能溢出：')
    for w in warn:
        print('   ', w)
else:
    print('✓ 全部在框内')
