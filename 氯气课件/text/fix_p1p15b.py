import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
SRC = r"C:\Users\何xing\Desktop\氯气课件-情境优化版\2.2.1氯气 第一课时（情境优化版）.pptx"


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_p15d.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


out, _ = call('open_file', {"file_path": SRC, "file_type": "slide", "wait": True})
fid = re.search(r'file_id=(.+?)\s*$', out, re.M).group(1)
PAGE, SID = 14, None

o3, _ = call('slide_get_page_info', {"file_id": fid, "page_index": PAGE})
d = json.loads(o3)
def walk(shapes):
    global SID
    for s in shapes:
        if SID: return
        if s.get('type') == 'group':
            walk(s.get('children', []))
        elif '侦探题' in (s.get('text') or ''):
            SID = s['id']
walk(d.get('shapes', []))
print('shape:', SID)

seg1 = "[例3] 侦探题："
seg2 = "红色酚酞NaOH溶液里滴入氯水，红色为何消失？"
seg3 = "真凶是谁？"
NEW = seg1 + seg2 + seg3 + "\r(1) 产生上述现象的原因可能有两种：\r\r(2) 怎样用实验证明红色褪去的原因是①或②?\r"

out, err = call('slide_set_text', {"file_id": fid, "page_index": PAGE, "shape_id": SID, "text": NEW})
print('set_text:', out[:100])

out, err = call('slide_set_text_property', {"file_id": fid, "page_index": PAGE, "shape_id": SID,
                 "font_name": "宋体", "font_size": 26, "color": "000000", "bold": True,
                 "index": 0, "count": -1})
print('base:', out[:80])

i1 = len(seg1)
i3 = len(seg1) + len(seg2)
for name, kw in [("红标题", {"color": "FF0000", "index": 0, "count": i1}),
                 ("红结尾", {"color": "C00000", "index": i3, "count": len(seg3)})]:
    out, err = call('slide_set_text_property', {"file_id": fid, "page_index": PAGE, "shape_id": SID, **kw})
    print(name, out[:80])

out, err = call('save_file', {"file_id": fid})
print('save:', out[:120])
call('close_file', {"file_id": fid, "force": True})
print('done')
