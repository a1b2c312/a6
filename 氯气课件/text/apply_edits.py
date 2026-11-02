import json, os, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
DRY = '--dry' in sys.argv
ONLY = None
for a in sys.argv[1:]:
    if a.startswith('--only='):
        ONLY = a.split('=', 1)[1]

cfg = json.load(open(os.path.join(BASE, 'edits.json'), encoding='utf-8'))


def call(tool, payload):
    if DRY:
        return {'ok': True, 'dry': True}
    f = os.path.join(tempfile.gettempdir(), 'eds_args_%d.json' % os.getpid())
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(payload, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    try:
        return json.loads(p.stdout.decode('utf-8', 'replace'))
    except Exception:
        return {'ok': False, 'raw': p.stdout.decode('utf-8', 'replace')[:400],
                'err': p.stderr.decode('utf-8', 'replace')[:400]}


def build_text(lead, paras, trail):
    return "\r".join([""] * lead + paras + [""] * trail) + "\r"


def find_all(text, needle, start=0):
    out = []
    i = text.find(needle, start)
    while i >= 0:
        out.append(i)
        i = text.find(needle, i + 1)
    return out


def is_ascii_alpha(c):
    return ('a' <= c <= 'z') or ('A' <= c <= 'Z')


def auto_ranges(text, base_size, do_sub, do_sup):
    """返回 (index, count, style) 列表：化学式中数字下标 / 电荷上标"""
    res = []
    for i, c in enumerate(text):
        if i == 0:
            continue
        prev = text[i - 1]
        if do_sub and c.isdigit() and (is_ascii_alpha(prev) or prev == ')'):
            res.append((i, 1, {'baseline': -25000,
                               'font_size': round(base_size * 1.33, 2)}))
        elif do_sup and c in '+-' and (is_ascii_alpha(prev) or prev.isdigit()):
            res.append((i, 1, {'baseline': 30000,
                               'font_size': round(base_size * 0.78, 2)}))
    return res


def est_lines(text, box_w, box_h, size, bold):
    """粗略估算行数：中文按 1 个字号宽，ASCII 按 0.55"""
    w = 0.0
    for ch in text:
        w += 0.55 * size if ord(ch) < 128 else size
    per_line = max(1.0, box_w / size)
    lines = 0
    for para in text.split('\r'):
        pw = sum((0.55 * size if ord(ch) < 128 else size) for ch in para)
        lines += max(1, int(pw / per_line) + (1 if pw % per_line else 0))
    cap = box_h / (size * 1.35)
    return lines, cap


total = 0
ok_n = 0
for deck, dcfg in cfg.items():
    if ONLY and deck != ONLY:
        continue
    fid = dcfg['file_id']
    print('\n' + '=' * 72)
    print('DECK', deck)
    for e in dcfg['edits']:
        name, page, shape = e['_n'], e['page'], e['shape']
        text = build_text(e.get('lead', 0), e['paras'], e.get('trail', 0))
        base = e['base']
        size = base['font_size']
        total += 1

        # ---- 写入文本 ----
        r = call('slide_set_text', {'file_id': fid, 'page_index': page,
                                    'shape_id': shape, 'text': text})
        if not r.get('ok'):
            print(f'  ✗ {name} [{shape}] set_text FAILED: {r}')
            continue

        # ---- 基础样式 ----
        payload = {'file_id': fid, 'page_index': page, 'shape_id': shape,
                   'index': 0, 'count': -1}
        payload.update(base)
        r2 = call('slide_set_text_property', payload)
        if not r2.get('ok'):
            print(f'  ✗ {name} [{shape}] base style FAILED: {r2}')
            continue

        # ---- 显式范围 ----
        for (idx, cnt, sty) in e.get('explicit', []):
            p3 = {'file_id': fid, 'page_index': page, 'shape_id': shape,
                  'index': idx, 'count': cnt}
            p3.update(sty)
            call('slide_set_text_property', p3)

        # ---- 关键词高亮 ----
        for needle, sty in e.get('ranges', []):
            for pos in find_all(text, needle):
                p3 = {'file_id': fid, 'page_index': page, 'shape_id': shape,
                      'index': pos, 'count': len(needle)}
                p3.update(sty)
                call('slide_set_text_property', p3)

        # ---- 上下标 ----
        for (idx, cnt, sty) in auto_ranges(text, size, e.get('sub'), e.get('sup')):
            p3 = {'file_id': fid, 'page_index': page, 'shape_id': shape,
                  'index': idx, 'count': cnt}
            p3.update(sty)
            call('slide_set_text_property', p3)

        ok_n += 1
        n_para = len(text.split('\r'))
        print(f'  ✓ {name}  [{shape}] p{page+1}  段落{n_para}  字符{len(text)}  '
              f'字号{size}  {"[DRY]" if DRY else ""}')
        if DRY:
            for para in e['paras']:
                print('       | ' + para)

print(f'\n完成 {ok_n}/{total}')
