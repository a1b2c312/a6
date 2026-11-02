import json, os, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
OUT = r"C:\Users\何xing\Desktop\氯气课件-情境优化版"

JOBS = [
    ("9FDD1BF3-A9CC-494E-9DD6-ACC6415BA94D", "2.2.1氯气 第一课时（情境优化版）.pptx"),
    ("58CFAD98-AC4B-4CE9-B338-F242415CA283", "2.2.2氯气 第二课时（情境优化版）.pptx"),
    ("90F25DF8-232C-47E0-B6B5-6823EF1CB50F", "2.2.3氯气的实验室制法及氯离子的检验（情境优化版）.pptx"),
]

for fid, name in JOBS:
    dest = os.path.join(OUT, name)
    args = {"file_id": fid, "file_path": dest}
    f = os.path.join(tempfile.gettempdir(), 'eds_save.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', 'save_file', '--json-file', f],
                       capture_output=True, cwd=CWD)
    out = p.stdout.decode('utf-8', 'replace').strip()
    err = p.stderr.decode('utf-8', 'replace').strip()
    print('=' * 60)
    print(name)
    print('  OUT:', out[:400])
    if err:
        print('  ERR:', err[:400])
    if os.path.exists(dest):
        print(f'  ✓ 已生成  {os.path.getsize(dest)/1024/1024:.1f} MB')
    else:
        print('  ✗ 文件未生成')
