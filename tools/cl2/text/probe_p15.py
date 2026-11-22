import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
SRC = r"C:\Users\何xing\Desktop\氯气课件-情境优化版\2.2.1氯气 第一课时（情境优化版）.pptx"


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_p15.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


out, _ = call('open_file', {"file_path": SRC, "file_type": "slide", "wait": True})
fid = re.search(r'file_id=(.+?)\s*$', out, re.M).group(1)

o3, _ = call('slide_get_page_info', {"file_id": fid, "page_index": 14})
d = json.loads(o3)
hits = {}
def walk(shapes):
    for s in shapes:
        if s.get('type') == 'group':
            walk(s.get('children', []))
        else:
            t = s.get('text') or ''
            for key in ['侦探题', '强氧化性', '重新变成红色']:
                if key in t:
                    hits[key] = s['id']
walk(d.get('shapes', []))
print('hits:', hits)

for key, sid in hits.items():
    o4, _ = call('slide_get_shape_info', {"file_id": fid, "page_index": 14, "shape_id": sid})
    d4 = json.loads(o4)
    bp = d4.get('body_pr') or {}
    print(key, sid, 'x=%s y=%s w=%s h=%s' % (d4.get('x'), d4.get('y'), d4.get('w'), d4.get('h')),
          'anchor=', bp.get('anchor'), 'autofit=', bp.get('autofit_type'), 'wrap=', bp.get('wrap'))

# 保存 fid 供下一步
with open(os.path.join(tempfile.gettempdir(), 'p15_fid.txt'), 'w') as fh:
    fh.write(fid)
print('FID_SAVED')
