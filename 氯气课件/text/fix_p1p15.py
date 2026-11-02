import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
fid = open(os.path.join(tempfile.gettempdir(), 'p15_fid.txt')).read().strip()


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_p15c.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


PAGE, SID = 14, "000235"

seg1 = "[例3] 侦探题："
seg2 = "滴酚酞的红色NaOH稀溶液里滴入氯水，红色突然消失！"
seg3 = "真凶是谁？"
line2 = "(1) 产生上述现象的原因可能有两种："
line3 = "(2) 怎样用实验证明红色褪去的原因是①或②?"
NEW = seg1 + seg2 + seg3 + "\r" + line2 + "\r\r\r" + line3 + "\r"

out, err = call('slide_set_text', {"file_id": fid, "page_index": PAGE, "shape_id": SID, "text": NEW})
print('set_text:', out[:120], err[:100])

# 基础样式：宋体 26 加粗 黑色
out, err = call('slide_set_text_property', {"file_id": fid, "page_index": PAGE, "shape_id": SID,
                 "font_name": "宋体", "font_size": 26, "color": "000000", "bold": True,
                 "index": 0, "count": -1})
print('base:', out[:100], err[:100])

i1 = len(seg1)
i3 = len(seg1) + len(seg2)
jobs = [
    ("红标题", {"color": "FF0000", "index": 0, "count": i1}),
    ("红结尾", {"color": "C00000", "index": i3, "count": len(seg3)}),
]
for name, kw in jobs:
    out, err = call('slide_set_text_property', {"file_id": fid, "page_index": PAGE, "shape_id": SID, **kw})
    print(name, out[:100], err[:100])

out, err = call('save_file', {"file_id": fid})
print('save:', out[:150])
call('close_file', {"file_id": fid, "force": True})
print('done')
