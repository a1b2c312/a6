import json, glob, os, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

base = os.path.dirname(os.path.abspath(__file__))
prefix = sys.argv[1] if len(sys.argv) > 1 else 'p1'
files = sorted(glob.glob(os.path.join(base, prefix + '_*.json')),
               key=lambda p: int(os.path.basename(p).split('_')[1].split('.')[0]))

def walk(shapes, out, depth=0):
    for s in shapes:
        if s.get('type') == 'group':
            walk(s.get('children', []), out, depth + 1)
            continue
        txt = (s.get('text') or '').replace('\r', ' / ').strip()
        if not txt:
            continue
        out.append({
            'id': s.get('id'),
            'x': s.get('x'), 'y': s.get('y'), 'w': s.get('w'), 'h': s.get('h'),
            'size': s.get('font_size'), 'font': s.get('font_name'),
            'color': s.get('font_color'), 'bold': s.get('bold'),
            'text': txt[:200],
        })

for f in files:
    data = json.load(open(f, encoding='utf-8'))
    idx = int(os.path.basename(f).split('_')[1].split('.')[0])
    shapes = []
    walk(data.get('shapes', []), shapes)
    print('=' * 70)
    print(f'### 第 {idx+1} 页  (page_index={idx})')
    for s in shapes:
        print(f"  [{s['id']}] x{s['x']} y{s['y']} w{s['w']} h{s['h']} "
              f"sz={s['size']} font={s['font']} color={s['color']} bold={s['bold']}")
        print(f"       {s['text']}")
