import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
SRC = r"C:\Users\何xing\Desktop\氯气课件-情境优化版\2.2.1氯气 第一课时（情境优化版）.pptx"


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_p15e.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


out, _ = call('open_file', {"file_path": SRC, "file_type": "slide", "wait": True})
fid = re.search(r'file_id=(.+?)\s*$', out, re.M).group(1)
PAGE = 14

o3, _ = call('slide_get_page_info', {"file_id": fid, "page_index": PAGE})
d = json.loads(o3)
tgt = {}
def walk(shapes):
    for s in shapes:
        if s.get('type') == 'group':
            walk(s.get('children', []))
        else:
            t = s.get('text') or ''
            if '强氧化性' in t:
                tgt['ans'] = s
            elif '重新变成红色' in t:
                tgt['blue'] = s
            elif '侦探题' in t:
                tgt['stem'] = s
walk(d.get('shapes', []))
for k, s in tgt.items():
    print(k, s['id'], 'y=', s.get('y'), 'h=', s.get('h'))

# 红色答案框下移到 (1) 与 (2) 之间：y -> 288
sid = tgt['ans']['id']
out, err = call('slide_set_shape_properties', {"file_id": fid, "page_index": PAGE,
                 "shape_id": sid, "y": 288})
print('move:', out[:150], err[:100])

out, err = call('save_file', {"file_id": fid})
print('save:', out[:120])
call('close_file', {"file_id": fid, "force": True})
print('done')
