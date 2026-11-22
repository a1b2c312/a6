import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
fid = open(os.path.join(tempfile.gettempdir(), 'p15_fid.txt')).read().strip()


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_p15b.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


out, _ = call('slide_get_text', {"file_id": fid, "page_index": 14, "shape_id": "000235"})
d = json.loads(out)
print('text:', repr(d.get('text', '')))
runs = d.get('runs') or []
for r in runs:
    print({k: r.get(k) for k in ('index', 'count', 'text', 'font_size', 'font_name', 'color', 'bold') if k in r})
