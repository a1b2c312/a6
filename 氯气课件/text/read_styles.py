import json, os, subprocess, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = os.path.dirname(os.path.abspath(__file__))
EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)

targets = json.load(open(os.path.join(BASE, 'targets.json'), encoding='utf-8'))
only = sys.argv[1] if len(sys.argv) > 1 else None

out = {}
for deck, cfg in targets.items():
    if only and deck != only:
        continue
    fid = cfg['file_id']
    print(f'\n########## {deck} ##########')
    for it in cfg['items']:
        p = subprocess.run(
            [sys.executable, EDSDK, 'call', 'slide_get_text',
             f'file_id={fid}', f"page_index={it['page']}", f"shape_id={it['shape']}"],
            capture_output=True, cwd=CWD)
        raw = p.stdout.decode('utf-8', 'replace')
        try:
            data = json.loads(raw)
        except Exception:
            print(f"  [{it['shape']}] p{it['page']+1} {it['note']} -> RAW ERROR: {raw[:200]}")
            continue
        runs = data.get('runs') or []
        plen = data.get('length')
        summary = []
        for r in runs:
            summary.append({k: r.get(k) for k in
                            ('start', 'end', 'font_size', 'font_name', 'color', 'bold', 'italic')
                            if r.get(k) is not None})
        print(f"  [{it['shape']}] p{it['page']+1} {it['note']}  length={plen} runs={len(runs)}")
        for s in summary:
            print(f"      {s}")
        out[f"{deck}:{it['shape']}"] = {'page': it['page'], 'runs': summary, 'length': plen}

json.dump(out, open(os.path.join(BASE, 'styles.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print('\nsaved styles.json')
