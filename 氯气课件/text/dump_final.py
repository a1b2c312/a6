import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
OUT = r"C:\Users\何xing\Desktop\氯气课件-情境优化版"
DST = os.path.dirname(os.path.abspath(__file__))

FILES = [
    ("f1", "2.2.1氯气 第一课时（情境优化版）.pptx"),
    ("f2", "2.2.2氯气 第二课时（情境优化版）.pptx"),
    ("f3", "2.2.3氯气的实验室制法及氯离子的检验（情境优化版）.pptx"),
]


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_df.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


for tag, name in FILES:
    path = os.path.join(OUT, name)
    out, err = call('open_file', {"file_path": path, "file_type": "slide", "wait": True})
    m = re.search(r'file_id=(.+?)\s*$', out, re.M)
    if not m:
        print(name, 'open 失败', out[:200])
        continue
    fid = m.group(1)
    o2, _ = call('slide_get_info', {"file_id": fid})
    print(name, '| slides:', o2[:200])
    n = int(re.search(r'slide_count["\s:]+(\d+)', o2).group(1)) if re.search(r'slide_count["\s:]+(\d+)', o2) else 20
    for i in range(n):
        o3, e3 = call('slide_get_page_info', {"file_id": fid, "page_index": i})
        try:
            d = json.loads(o3)
        except Exception:
            print('  page', i, 'fail', o3[:120])
            continue
        with open(os.path.join(DST, f'{tag}_{i}.json'), 'w', encoding='utf-8') as fh:
            json.dump(d, fh, ensure_ascii=False, indent=1)
    call('close_file', {"file_id": fid, "force": True})
    print('  dumped', n, 'pages ->', tag)
