import json, os, re, subprocess, sys, io, tempfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

EDSDK = r"C:\Users\何xing\.workbuddy\plugins\cache\workbuddy-builtin\workbuddy-pptx\5.9.2-wb.42136757.g0b5051be.hd4338c001c60\skills\workbuddy-pptx\scripts\edsdk.py"
CWD = os.path.dirname(EDSDK)
SRC = r"C:\Users\何xing\Desktop\氯气课件-情境优化版\2.2.2氯气 第二课时（情境优化版）.pptx"


def call(tool, args):
    f = os.path.join(tempfile.gettempdir(), 'eds_fix.json')
    with open(f, 'w', encoding='utf-8') as fh:
        json.dump(args, fh, ensure_ascii=False)
    p = subprocess.run([sys.executable, EDSDK, 'call', tool, '--json-file', f],
                       capture_output=True, cwd=CWD)
    return p.stdout.decode('utf-8', 'replace').strip(), p.stderr.decode('utf-8', 'replace').strip()


out, _ = call('open_file', {"file_path": SRC, "file_type": "slide", "wait": True})
fid = re.search(r'file_id=(.+?)\s*$', out, re.M).group(1)
print('fid ok')

# 定位含「汶川地震」的 shape
o3, _ = call('slide_get_page_info', {"file_id": fid, "page_index": 9})
d = json.loads(o3)
sid = None
def walk(shapes):
    global sid
    for s in shapes:
        if sid: return
        if s.get('type') == 'group':
            walk(s.get('children', []))
        elif '汶川地震' in (s.get('text') or ''):
            sid = s['id']
walk(d.get('shapes', []))
print('shape:', sid)

out, err = call('slide_get_text', {"file_id": fid, "page_index": 9, "shape_id": sid})
old = json.loads(out)
print('原文本:', repr(old.get('text', '')[:120]))

NEW = "【新闻回放】汶川地震后，成吨漂白粉被运往灾区消毒。\r3、氯气怎样“变”成漂白粉？凭什么漂白？保存要注意什么？\r"
out, err = call('slide_set_text', {"file_id": fid, "page_index": 9, "shape_id": sid, "text": NEW})
print('set_text:', out[:150], err[:150])

# 铺基础样式：微软雅黑 24 C00000
out, err = call('slide_set_text_property', {"file_id": fid, "page_index": 9, "shape_id": sid,
                 "font_name": "微软雅黑", "font_size": 24, "color": "C00000", "bold": False,
                 "index": 0, "count": -1})
print('base:', out[:120], err[:120])

# 「【新闻回放】汶川地震后」加粗 (0-13 共13个字符? 数一下)
head = "【新闻回放】汶川地震后"
out, err = call('slide_set_text_property', {"file_id": fid, "page_index": 9, "shape_id": sid,
                 "bold": True, "index": 0, "count": len(head)})
print('bold:', out[:120], err[:120])

out, err = call('save_file', {"file_id": fid, "file_path": SRC})
print('save:', out[:200], err[:150])
call('close_file', {"file_id": fid, "force": True})
print('done')
