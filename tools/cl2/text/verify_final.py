import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
OUT = r"C:\Users\何xing\Desktop\氯气课件-情境优化版"

# 成品文件 -> 需要复核的 (page_index 0-based, shape_id, 说明)
JOBS = [
    ("2.2.1氯气 第一课时（情境优化版）.pptx", [
        (14, "0002c4", "例3 侦探题（应为宋体30，不溢出）"),
        (7,  "0001b9", "云朵思考框（应为30pt一行）"),
        (2,  "00005a", "液氯泄漏新闻导入"),
    ]),
    ("2.2.2氯气 第二课时（情境优化版）.pptx", [
        (9,  "000210", "漂白粉页（应为24pt三行）"),
    ]),
    ("2.2.3氯气的实验室制法及氯离子的检验（情境优化版）.pptx", [
        (13, "0002cd", "阅读P49"),
    ]),
]


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_vf.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


for name, checks in JOBS:
    path = os.path.join(OUT, name)
    print('=' * 70)
    print(name)
    out, err = call('open_file', {"file_path": path, "file_type": "slide", "wait": True})
    m = re.search(r'file_id=(.+?)\s*$', out, re.M)
    if not m:
        print('  open 失败:', out[:300], err[:200])
        continue
    fid = m.group(1)
    print('  file_id:', fid)

    for page, shape, note in checks:
        out, err = call('slide_get_text', {"file_id": fid, "page_index": page, "shape_id": shape})
        print('  ' + '-' * 60)
        print(f'  [{note}]  page={page+1} shape={shape}')
        try:
            d = json.loads(out)
        except Exception:
            print('    读取失败:', out[:200], err[:150])
            continue
        # 打印段落、字号、字体
        txt = d.get('text', '')
        print('    文本:', repr(txt[:160]))
        runs = d.get('runs') or d.get('paragraphs') or []
        if isinstance(runs, dict):
            runs = [runs]
        sizes = []
        fonts = set()
        def walk(o):
            if isinstance(o, dict):
                if 'font_size' in o: sizes.append(o['font_size'])
                if 'font_name' in o: fonts.add(str(o['font_name']))
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(d)
        print('    字号:', sorted(set(sizes)), ' 字体:', fonts)
    call('close_file', {"file_id": fid, "force": True})
