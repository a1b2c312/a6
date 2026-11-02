# -*- coding: utf-8 -*-
"""生成「高一化学第一次月考·试卷讲评」PPTX（学术风 / 16:9）。
每题答案与解析在放映时点击后出现；非选择题每大题一页。"""
import copy
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ---------- 配色（学术风：宝蓝主色 / 白底浅蓝卡） ----------
BLUE   = RGBColor(0x1E, 0x4F, 0xA8)   # 主蓝
NAVY   = RGBColor(0x0E, 0x3F, 0x8C)   # 藏蓝
LBLUE  = RGBColor(0xE8, 0xEF, 0xF8)   # 浅蓝卡底
LBLUE2 = RGBColor(0xF0, 0xF5, 0xFC)   # 更浅蓝
WHITE  = RGBColor(0xFF, 0xFF, 0xFF)
INK    = RGBColor(0x1A, 0x22, 0x30)   # 主文本
SUB    = RGBColor(0x4A, 0x55, 0x68)   # 副文本
GREY   = RGBColor(0x8B, 0x97, 0xA8)
RED    = RGBColor(0xD9, 0x53, 0x4F)   # 警示红（错误项）
GREEN  = RGBColor(0x10, 0xB9, 0x81)   # 答案绿
GREENBG= RGBColor(0xEC, 0xFD, 0xF5)   # 答案框底
GOLD   = RGBColor(0xFF, 0xC1, 0x07)   # 高亮黄
LINE   = RGBColor(0xD6, 0xDC, 0xE5)
FONT   = "Microsoft YaHei"
FONTE  = "Times New Roman"

EMU_W, EMU_H = Inches(13.333), Inches(7.5)
SW, SH = 12192000, 6858000  # 16:9 EMU

prs = Presentation()
prs.slide_width  = SW
prs.slide_height = SH
BLANK = prs.slide_layouts[6]

_sid = [0]
def next_id():
    _sid[0] += 1
    return 1000 + _sid[0]

# ---------- 基础组件 ----------
def add_rect(slide, x, y, w, h, fill=None, line=None, line_w=None, shape=MSO_SHAPE.RECTANGLE, shadow=False):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    sp.shadow.inherit = False
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid(); sp.fill.fore_color.rgb = fill
    if line is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line
        sp.line.width = line_w or Pt(1)
    return sp

def add_text(slide, x, y, w, h, runs, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, wrap=True):
    """runs: list of paragraphs; each paragraph is list of (text, size, bold, color, font)"""
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = Pt(2); tf.margin_right = Pt(2); tf.margin_top = Pt(1); tf.margin_bottom = Pt(1)
    for i, para in enumerate(runs):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if isinstance(para, tuple):  # single paragraph convenience
            para = [para]
        for (t, sz, b, col, *rest) in para:
            f = p.add_run(); f.text = t
            f.font.size = Pt(sz); f.font.bold = b; f.font.color.rgb = col
            f.font.name = FONT
            if rest and rest[0]:
                f.font.name = rest[0]
        # default opt
    return tb

def title_bar(slide, title, idx=None):
    add_rect(slide, 0, 0, SW, Inches(1.0), fill=BLUE)
    add_rect(slide, 0, Inches(1.0), SW, Pt(4), fill=GOLD)  # 金色细线点缀
    t = add_text(slide, Inches(0.5), Inches(0.12), Inches(11.4), Inches(0.78),
                 [[(title, 28, True, WHITE)]], anchor=MSO_ANCHOR.MIDDLE)
    if idx is not None:
        add_text(slide, Inches(11.6), Inches(0.12), Inches(1.2), Inches(0.78),
                 [[(idx, 24, True, RGBColor(0xCF,0xE0,0xFF))]], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)

def footer(slide, page):
    add_text(slide, Inches(0.5), Inches(7.06), Inches(8), Inches(0.4),
             [[("瑞昌一中 · 高一化学第一次月考讲评", 12, False, GREY)]], anchor=MSO_ANCHOR.MIDDLE)
    add_text(slide, Inches(11.8), Inches(7.06), Inches(1.0), Inches(0.4),
             [[(f"{page:02d}", 12, True, BLUE)]], align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.MIDDLE)

def option_letter(opt):
    return opt[0] if opt[:1] in "ABCD" else opt

# ---------- 点击出现动画（放映时点击再显示答案） ----------
PML = "http://schemas.openxmlformats.org/presentationml/2006/main"
def _qn(tag): return '{%s}%s' % (PML, tag)

def add_click_reveal(slide, shape):
    """给某个形状添加：放映时鼠标点击后再出现（appear 动画）。"""
    spid = shape.shape_id
    sld = slide._element
    timing = sld.find(_qn('timing'))
    if timing is None:
        timing = sld.makeelement(_qn('timing'), {})
        sld.append(timing)
    base = next_id()
    xml = (
      f'<p:tnLst xmlns:p="{PML}"><p:par><p:cTn id="{base}" fill="hold">'
      f'<p:stCondLst><p:cond type="node"/></p:stCondLst><p:childTnLst><p:par>'
      f'<p:cTn id="{base+1}" fill="hold" nodeType="clickEffect">'
      f'<p:stCondLst><p:cond type="onBegin" delay="0"/></p:stCondLst><p:childTnLst>'
      f'<p:anim type="appear"><p:cBhvr><p:cTnLst><p:cTn id="{base+2}" fill="hold" dur="500"/>'
      f'</p:cTnLst><p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'
      f'<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst>'
      f'</p:cBhvr></p:anim></p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par></p:tnLst>'
    )
    node = timing.makeelement(_qn('tnLst'), {})
    from lxml import etree
    frag = etree.fromstring(xml)
    timing.append(frag)
    return True

# =========================================================
# 内容数据
# =========================================================
# 选择题： (题号, 分值, 题干, [选项], 答案, 解析)
MCQ = [
 (1,3,"生活处处是化学，下列过程不涉及化学变化的是（&nbsp;）",
  ["A．米饭变酸","B．绳锯木断","C．铁刀生锈","D．蜡炬成灰"],"B",
  "米饭变酸是食物腐败、铁刀生锈是铁被氧化、蜡炬成灰是石蜡燃烧，均有新物质生成，属化学变化；绳锯木断只是形状改变，无新物质生成，属物理变化。判定关键：是否有新物质生成。"),

 (2,3,"关于胶体的下列说法正确的是（&nbsp;）",
  ["A．溶液、胶体、浊液均属于化合物",
   "B．胶体区别于其他分散系的本质特征是丁达尔效应",
   "C．向沸水中滴加 FeCl₃ 饱和溶液至红褐色制备 Fe(OH)₃ 胶体",
   "D．激光照射 CuSO₄ 溶液和 Fe(OH)₃ 胶体，均可看见光亮通路"],"C",
  "三种分散系都是混合物，不是化合物；本质特征是分散质粒子直径 1~100 nm，丁达尔效应只是区分方法；向沸水滴加饱和 FeCl₃、煮沸至红褐色即得胶体，操作正确；溶液无丁达尔效应。"),

 (3,3,"关于纯净物、混合物、电解质、非电解质的正确组合为（&nbsp;）",
  ["A．盐酸 / 澄清石灰水 / 硫酸 / 干冰",
   "B．冰水混合物 / 酒精溶液 / 碳酸钙 / 氯气",
   "C．氨水 / Fe(OH)₃胶体 / 铜 / 硫酸钡",
   "D．胆矾 / 食盐水 / 氯化铜 / 氨气"],"D",
  "胆矾 CuSO₄·5H₂O 是纯净物（结晶水合物）；食盐水是混合物；CuCl₂ 是电解质；NH₃ 自身不电离，是非电解质。盐酸是混合物；氯气是单质（既非电解质也非非电解质）；氨水、铜不是电解质。易错：结晶水合物是纯净物，单质和混合物既不是电解质也不是非电解质。"),

 (4,3,"下列各组离子，能在溶液中大量共存的是（&nbsp;）",
  ["A．H⁺、Ag⁺、Na⁺、NO₃⁻",
   "B．K⁺、Ca²⁺、Cl⁻、CO₃²⁻",
   "C．Ca²⁺、Cl⁻、OH⁻、NO₃⁻",
   "D．Na⁺、Cu²⁺、SO₄²⁻、OH⁻"],"A",
  "A 四离子互不反应，可共存；B 中 Ca²⁺+CO₃²⁻=CaCO₃↓；C 中 Ca²⁺与 OH⁻ 生成微溶 Ca(OH)₂；D 中 Cu²⁺+2OH⁻=Cu(OH)₂↓。共存口诀：查沉淀、查气体、查弱电解质。"),

 (5,3,"下列化学方程式或离子方程式中，正确的是（&nbsp;）",
  ["A．Cu + Ag⁺ = Cu²⁺ + Ag",
   "B．少量 SO₂ 与 NaOH：SO₂ + 2OH⁻ = SO₃²⁻ + H₂O",
   "C．石灰乳与盐酸：H⁺ + OH⁻ = H₂O",
   "D．稀硝酸与铜：Cu+4HNO₃(稀)=Cu(NO₃)₂+2NO₂↑+2H₂O"],"B",
  "A 电荷不守恒，应为 Cu+2Ag⁺=Cu²⁺+2Ag；B 少量 SO₂（NaOH 过量）生成正盐 SO₃²⁻，正确；C 石灰乳应写化学式 Ca(OH)₂+2H⁺=Ca²⁺+2H₂O；D 稀硝酸还原产物是 NO 而非 NO₂。"),

 (6,3,"Fe(OH)₃ 胶体制备与性质实验记录，恰当的是（&nbsp;）",
  ["A．饱和 FeCl₃ 滴入 NaOH 溶液可制得胶体",
   "B．Fe(OH)₃ 胶体带正电，FeCl₃ 溶液呈电中性",
   "C．向胶体滴加稀盐酸，先有红褐色沉淀，后沉淀消失",
   "D．用滤纸过滤胶体，滤纸上得到红褐色沉淀"],"C",
  "A 滴入 NaOH 直接生成沉淀，制胶体须滴沸水；B 胶体整体呈电中性，是胶体粒子带电荷；C 电解质使胶体先聚沉为沉淀，盐酸过量后沉淀溶解，正确；D 胶体粒子能透过滤纸，过滤得不到沉淀。"),

 (7,3,"下列化合物中属于“复盐”的是（&nbsp;）",
  ["A．CaOCl₂　　B．Cu₂(OH)₂CO₃　　C．Ca(ClO)Cl　　D．(NH₄)₂Fe(SO₄)₂"],"D",
  "复盐=多种简单阳离子+一种酸根。D 含 NH₄⁺、Fe²⁺ 两种阳离子和 SO₄²⁻，是典型复盐（莫尔盐）；A、C 是混盐（一种阳离子+多种酸根）；B 是碱式盐。"),

 (8,3,"A、B、C、D、E 中都含有同一种元素，它们之间的相互转化关系如图所示，其中所含的相同元素是（&nbsp;）",
  ["A．碳","B．铜","C．钙","D．铁"],"C",
  "突破口：E 高温分解生成 A，A 与水化合生成 B——联想 CaCO₃ 高温→CaO→Ca(OH)₂。A=CaO，B=Ca(OH)₂，D=CaCl₂，C=Ca(NO₃)₂，E=CaCO₃，五种物质都含钙元素。"),

 (9,3,"下列氧化还原反应中，电子转移的方向和数目均正确的是（&nbsp;）",
  ["A．10KI+2KMnO₄+8H₂SO₄=5I₂+6K₂SO₄+2MnSO₄+8H₂O",
   "B．Cu+2H₂SO₄(浓)→CuSO₄+SO₂↑+2H₂O（2e⁻）",
   "C．2CO+O₂→2CO₂（失去2e⁻/得到2e⁻）",
   "D．2Na+2H₂O=2NaOH+H₂↑（e⁻）"],"A",
  "A：10 个 I⁻（−1→0）失 10e⁻，2 个 Mn（+7→+2）得 2×5e⁻，得失相等，方向数目均对；B 只有 1 个 S 被还原（+6→+4），电子应标在 Cu 与被还原的 S 之间；C 应“失去 2×2e⁻”；D 应标“2×e⁻”。双线桥口诀：桥连同种元素，得失分开标，数目乘系数。"),

 (10,3,"用 FeS 固体和稀硫酸制 H₂S（FeS+H₂SO₄=FeSO₄+H₂S↑）。H₂S 有毒、密度大于空气、可溶于水，合理的是（&nbsp;）",
  ["A．可用 H₂O₂ 制 O₂ 的发生装置制取",
   "B．收集可用排水法",
   "C．可用向下排空气法收集",
   "D．可用 NaCl 溶液吸收防污染"],"A",
  "A：固+液→气、不加热，与 H₂O₂ 分解制 O₂ 同型；B：H₂S 可溶，不能排水法；C：密度大于空气应向上排空气法；D：NaCl 不吸收，应用 CuSO₄ 或 NaOH 溶液尾气处理。"),

 (11,3,"火药引爆：S+2KNO₃+3C=K₂S+N₂↑+3X，说法正确的是（&nbsp;）",
  ["A．X 是空气成分之一，有毒性",
   "B．化合价变化的元素有两种",
   "C．S 得电子，发生氧化反应",
   "D．每生成 1 个 N₂ 转移 12 个电子"],"D",
  "由原子守恒 X=CO₂。变价元素 S、N、C 三种；CO₂ 无毒；S 得电子被还原，发生还原反应；3 个 C 共失 3×4=12e⁻（N 得 10e⁻+S 得 2e⁻），即每生成 1 个 N₂ 转移 12e⁻。电子守恒最快：失电子总数=得电子总数=转移数。"),

 (12,3,"Cl₂ 通入 NaOH，得 NaCl、NaClO、NaClO₃ 混合液，ClO⁻:ClO₃⁻=1:1，氧化剂与还原剂物质的量之比为（&nbsp;）",
  ["A．21:5　　B．13:3　　C．3:1　　D．3:13"],"C",
  "歧化反应中氧化剂、还原剂都是 Cl₂。设 ClO⁻、ClO₃⁻ 各 n：被氧化失 1n+5n=6n e⁻（2n mol Cl 作还原剂）；被还原的 Cl 每个得 1e⁻，需 6n mol（作氧化剂）。氧化剂:还原剂=6n:2n=3:1。"),

 (13,3,"KMnO₄ 是常见的氧化剂，实验室以 MnO₂ 等为原料制取少量 KMnO₄，实验流程如下图所示。下列说法不正确的是（&nbsp;）",
  ["A．“熔融”氧化剂 KClO₃、还原剂 MnO₂",
   "B．“溶解”后溶液含大量 K⁺、Cl⁻、MnO₄⁻",
   "C．流程中 MnO₂ 可循环使用",
   "D．“歧化”氧化剂:还原剂=1:2"],"B",
  "熔融：3MnO₂+KClO₃+6KOH=3K₂MnO₄+KCl+3H₂O，Cl(+5→−1)被还原、Mn(+4→+6)被氧化，A 对；锰酸根是 MnO₄²⁻（绿色）不是 MnO₄⁻（紫色），B 错；过滤的 MnO₂ 可循环，C 对；歧化 3K₂MnO₄+2CO₂=2KMnO₄+MnO₂↓+2K₂CO₃，作氧化剂与还原剂的 K₂MnO₄ 比 1:2，D 对。MnO₄²⁻ 与 MnO₄⁻ 一字之差最易错。"),

 (14,3,"标准电极电势 Eθ（酸性）：Co³⁺/Co²⁺ 1.92、PbO₂/PbSO₄ 1.685、MnO₄⁻/Mn²⁺ 1.51、Cl₂/Cl⁻ 1.36、Fe³⁺/Fe²⁺ 0.77。错误的是（&nbsp;）",
  ["A．氧化性 Co³⁺>PbO₂>Cl₂>Fe³⁺",
   "B．PbO₂ 与浓盐酸可制 Cl₂",
   "C．酸性下 Cl⁻ 还原性比 Co²⁺ 强",
   "D．硫酸酸化足量 KMnO₄ 与 FeCl₂ 反应：MnO₄⁻+5Fe²⁺+8H⁺=5Fe³⁺+Mn²⁺+4H₂O"],"D",
  "A 按 Eθ 排序正确；B 因 1.685>1.36，PbO₂ 能氧化 Cl⁻ 制 Cl₂；C Eθ 越低还原型还原性越强，Cl⁻(1.36)>Co²⁺(1.92)；D FeCl₂ 中 Cl⁻ 也有还原性，且 Eθ(1.51)>1.36，足量 KMnO₄ 会一并氧化 Cl⁻，该方程式漏掉 Cl⁻ 被氧化（应改用 FeSO₄）。"),
]

# 非选择题： (大题号, 标题, [(小点标题, 内容含答案)])
NONMCQ = [
 (15, "物质的分类 · 电解质 · 离子方程式", [
   ("(1) 导电/电解质/非电解质判断",
    "能导电：①②④　电解质：①⑤⑥⑦　非电解质：③\n"
    "①熔融NaCl有自由离子导电且是化合物；②铝是金属单质能导电但单质非电解质；③乙醇不电离非电解质；④氨水是混合物能导电但非电解质；⑤HCl气体溶于水自身电离电解质；⑥NaHSO₄电解质；⑦Al(OH)₃难溶但溶解部分电离，电解质。"),
   ("(1)ⅱ 电离方程式",
    "① NaCl(熔融) = Na⁺ + Cl⁻\n⑥ NaHSO₄ = Na⁺ + H⁺ + SO₄²⁻（水溶液中）"),
   ("(2) 酸、碱、盐说法",
    "答案：C。A/B 错在“有”——须电离出的阳离子全部是H⁺才是酸、阴离子全部是OH⁻才是碱；D 错，盐溶液不一定中性（如Na₂CO₃显碱性）。"),
   ("(3) 离子方程式",
    "Al(OH)₃ + 3H⁺ = Al³⁺ + 3H₂O\nNH₃·H₂O + H⁺ = NH₄⁺ + H₂O（弱碱写化学式）\nHCO₃⁻ + H⁺ = CO₂↑ + H₂O"),
 ]),
 (16, "分类观 · 三酸两碱 · 导电能力曲线", [
   ("(1) 类别归属不恰当",
    "答案：Na₂CO₃（纯碱从分类上属盐，因溶液显碱性得名，归为“碱”不恰当）。"),
   ("(2) 两离子方程式",
    "强酸+NaOH：H⁺ + OH⁻ = H₂O\n强酸(过量)+Na₂CO₃：2H⁺ + CO₃²⁻ = CO₂↑ + H₂O（6个化学方程式→2个离子方程式）"),
   ("(3) 导电能力曲线",
    "答案：b。NaOH 被 SiO₂ 消耗，离子浓度减小、导电能力下降；NaOH 反应完后过量 SiO₂ 不溶不导电，离子浓度基本不变，导电能力保持较低水平——先降后平为曲线 b。"),
   ("(4) Ba(OH)₂ 与 NaHSO₄ 反应",
    "o→a（1:1 恰好沉淀）：Ba²⁺ + H⁺ + OH⁻ + SO₄²⁻ = BaSO₄↓ + H₂O\na→b（NaOH 被继续中和）：NaOH + NaHSO₄ = Na₂SO₄ + H₂O（b 点中性）"),
 ]),
 (17, "胶体 · Fe(OH)₃ 制备与安全标识", [
   ("(1) 化合价与类别",
    "Fe(CrO₂)₂ 中 Cr 为 +3：x + 2×(+3) + 4×(−2)=0 → Fe 为 +2；CrO₂⁻ 为酸根 → 该物质属盐。"),
   ("(2) 鉴别明胶带/K₂SO₄ 溶液",
    "用一束光分别照射，侧面有光亮“通路”的是明胶水溶液（胶体，丁达尔效应），无此现象的是 K₂SO₄ 溶液。"),
   ("(3) 制备与性质",
    "① 选 B（沸水）；② 还应标注 ②③④（排风、热烫、明火）；\n③ FeCl₃ + 3H₂O =(Δ)= Fe(OH)₃(胶体) + 3HCl；\n滴入过量稀硫酸：先聚沉出沉淀，后沉淀逐渐溶解（Fe³⁺ 棕黄色溶液）。"),
 ]),
 (18, "氧化还原反应综合", [
   ("(1) 只有还原性的粒子",
    "答案：①⑦（S²⁻ 为 S 最低价 −2，Mg 为 0 价金属单质，只有还原性；中间价既有氧化性又有还原性，最高价只有氧化性）。"),
   ("(2) 亚硒酸钠的作用",
    "答案：还原剂。Na₂SeO₃ 消除强氧化性“活性氧”，自身被氧化（Se：+4→+6）。"),
   ("(3) Fe 与稀 HNO₃",
    "HNO₃ 表现氧化性（N +5→+2）和酸性（生成 Fe(NO₃)₃）。\n离子方程式：Fe + 4H⁺ + NO₃⁻ = Fe³⁺ + NO↑ + 2H₂O"),
   ("(4)(5) 电子转移与双/单线桥",
    "(4) 双线桥：N(−3→0)失 2×3e⁻；Cu(+2→0)得 3×2e⁻。氧化剂:还原剂=3:2（4个CuO中3个被还原）。\n(5) 氧化剂 MnO₂；氧化产物 Cl₂。单线桥：2e⁻，由被氧化的 Cl⁻(−1) 指向 Mn(+4)。"),
 ]),
]

# =========================================================
# 生成各页
# =========================================================
def new_slide():
    return prs.slides.add_slide(BLANK)

# ---- 封面 ----
s = new_slide()
add_rect(s, 0, 0, SW, SH, fill=NAVY)
add_rect(s, 0, 0, SW, Inches(2.0), fill=BLUE)
add_text(s, Inches(0.9), Inches(0.4), Inches(11.5), Inches(0.7),
         [[("瑞 昌 一 中", 30, True, WHITE)]])
add_text(s, Inches(0.9), Inches(2.5), Inches(11.5), Inches(1.6),
         [[("高一化学第一次月考试卷讲评", 52, True, WHITE)]])
add_text(s, Inches(0.95), Inches(4.0), Inches(11), Inches(0.6),
         [[("2026—2027 学年上学期 · 第一次月考", 24, False, RGBColor(0xCF,0xE0,0xFF))]])
add_rect(s, Inches(0.95), Inches(4.8), Inches(4.2), Pt(3), fill=GOLD)
add_text(s, Inches(0.95), Inches(5.1), Inches(11), Inches(1.6),
         [[("命题人：何孟君", 20, False, RGBColor(0xDD,0xE6,0xF5))],
          [("审题人：陈才", 20, False, RGBColor(0xDD,0xE6,0xF5))],
          [("满分 100 分 · 考试时间 75 分钟 · 2026 年 10 月", 18, False, GREY)]])
add_text(s, Inches(0.95), Inches(6.75), Inches(11), Inches(0.5),
         [[("选择题逐题点按出现答案与解析 · 非选择题逐大题展开", 16, False, RGBColor(0x9F,0xB4,0xD6))]])

# ---- 答案速查 / 试卷结构 ----
s = new_slide()
title_bar(s, "试卷结构与答案速查", "00")
add_text(s, Inches(0.5), Inches(1.2), Inches(12), Inches(0.5),
         [[("第Ⅰ卷 选择题（14 小题 × 3 分 = 42 分）", 22, True, NAVY)]])
# 答案 chips
ans = "B C D A B C D C A A D C B D".split()
x0, y0 = Inches(0.5), Inches(1.8)
cw, ch = Inches(1.55), Inches(0.62)
for i, a in enumerate(ans):
    r, c = divmod(i, 7)
    x = x0 + c * (cw + Inches(0.12))
    y = y0 + r * (ch + Inches(0.12))
    box = add_rect(s, x, y, cw, ch, fill=LBLUE, line=BLUE, line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, x, y, cw, ch, [[(f"第{i+1}题  {a}", 18, True, NAVY)]], align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
add_text(s, Inches(0.5), Inches(3.95), Inches(12), Inches(0.5),
         [[("第Ⅱ卷 非选择题（4 大题 = 58 分）", 22, True, NAVY)]])
add_text(s, Inches(0.6), Inches(4.55), Inches(12), Inches(1.6),
         [[("15 题", 18, True, BLUE), ("　物质的分类 · 电解质 · 离子方程式", 18, False, INK)],
          [("16 题", 18, True, BLUE), ("　分类观 · 三酸两碱 · 导电能力曲线", 18, False, INK)],
          [("17 题", 18, True, BLUE), ("　胶体 · Fe(OH)₃ 制备与安全标识", 18, False, INK)],
          [("18 题", 18, True, BLUE), ("　氧化还原反应综合（双/单线桥）", 18, False, INK)]])
footer(s, 2)

# ---- 选择题逐题 ----
import os
BASE = os.path.dirname(os.path.abspath(__file__))
# 需要嵌入试卷原图的题目：题号 -> (图片文件, 宽高比 w/h)
FIGS = {
    8:  ("q8_fig.png",  1120/768),   # 转化关系图
    13: ("q13_fig.png", 2775/630),   # 制备流程图
}

def draw_opt(s, x, y, w, h, op, answer, fsize=17):
    is_ans = op.startswith(answer)
    bg = GREENBG if is_ans else WHITE
    ln = GREEN if is_ans else LINE
    add_rect(s, x, y, w, h, fill=bg, line=ln, line_w=Pt(1.4), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, x+Inches(0.12), y, w-Inches(0.24), h,
             [[(op.replace("&nbsp;"," "), fsize, is_ans, NAVY if is_ans else INK)]], anchor=MSO_ANCHOR.MIDDLE)

def slide_mcq(m):
    idx, score, stem, opts, answer, analysis = m
    s = new_slide()
    fig = FIGS.get(idx)
    title_bar(s, f"选择题 · 第{idx}题（{score}分）", f"{idx:02d}")
    ay, ah = Inches(4.95), Inches(1.95)          # 答案框默认位置
    if fig:
        fname, ratio = fig
        # 题干（矮条）
        add_rect(s, Inches(0.5), Inches(1.15), Inches(12.33), Inches(0.78), fill=LBLUE2, line=LINE, line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_text(s, Inches(0.7), Inches(1.15), Inches(12.0), Inches(0.78),
                 [[(stem.replace("&nbsp;"," "), 18, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
        img_path = os.path.join(BASE, fname)
        if idx == 8:
            # 图居左，选项居右竖排
            ih = 2.68; iw = ih * ratio
            s.shapes.add_picture(img_path, Inches(0.75), Inches(2.1), width=Inches(iw), height=Inches(ih))
            ox = 0.75 + iw + 0.5
            ow = 13.333 - ox - 0.5
            oy, oh, gap = 2.45, 0.5, 0.15
            for i, op in enumerate(opts):
                draw_opt(s, Inches(ox), Inches(oy + i*(oh+gap)), Inches(ow), Inches(oh), op, answer, 17)
        else:  # 13：流程图横贯居中，选项整行排列
            ih = 1.68; iw = ih * ratio
            ix = (13.333 - iw) / 2
            s.shapes.add_picture(img_path, Inches(ix), Inches(2.0), width=Inches(iw), height=Inches(ih))
            oy, oh, gap = 3.78, 0.30, 0.035
            for i, op in enumerate(opts):
                draw_opt(s, Inches(0.5), Inches(oy + i*(oh+gap)), Inches(12.33), Inches(oh), op, answer, 14.5)
            ay, ah = Inches(5.28), Inches(1.62)
    else:
        # 题干
        add_rect(s, Inches(0.5), Inches(1.25), Inches(12.33), Inches(1.25), fill=LBLUE2, line=LINE, line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_text(s, Inches(0.7), Inches(1.3), Inches(12.0), Inches(1.15),
                 [[(stem.replace("&nbsp;"," "), 19, True, INK)]], anchor=MSO_ANCHOR.MIDDLE)
        # 选项 2 列
        oy = Inches(2.7)
        oh = Inches(0.62)
        for i, op in enumerate(opts):
            r, c = divmod(i, 2)
            x = Inches(0.5) + c * Inches(6.25)
            y = oy + r * (oh + Inches(0.18))
            draw_opt(s, x, y, Inches(5.95), oh, op, answer, 17)
    # 答案框（点击出现）
    ax, aw = Inches(0.5), Inches(12.33)
    abox = add_rect(s, ax, ay, aw, ah, fill=GREENBG, line=GREEN, line_w=Pt(1.6), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, ax+Inches(0.2), ay+Inches(0.1), aw-Inches(0.4), ah-Inches(0.2),
             [[("【答案】", 18, True, GREEN), (f" {answer}", 20, True, NAVY), ("　【解析】", 18, True, GREEN)],
              [(analysis.replace("&nbsp;"," "), 15.5, False, INK)]],
             anchor=MSO_ANCHOR.TOP)
    add_click_reveal(s, abox)
    footer(s, idx+2)

for m in MCQ:
    slide_mcq(m)

# ---- 非选择题逐大题 ----
def slide_non(m, page):
    num, title, parts = m
    s = new_slide()
    title_bar(s, f"非选择题 · 第{num}题", f"{page:02d}")
    # 大标题条
    add_rect(s, Inches(0.5), Inches(1.2), Inches(12.33), Inches(0.6), fill=LBLUE, line=BLUE, line_w=Pt(1), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
    add_text(s, Inches(0.7), Inches(1.2), Inches(12), Inches(0.6),
             [[(f"第{num}题　{title}", 19, True, NAVY)]], anchor=MSO_ANCHOR.MIDDLE)
    # 子点卡片（2 列）
    cw, ch = Inches(6.0), Inches(2.45)
    gx, gy = Inches(0.33), Inches(0.22)
    x0 = Inches(0.5); y0 = Inches(1.95)
    for i, (sub, content) in enumerate(parts):
        r, c = divmod(i, 2)
        x = x0 + c * (cw + gx)
        y = y0 + r * (ch + gy)
        box = add_rect(s, x, y, cw, ch, fill=WHITE, line=LINE, line_w=Pt(1.2), shape=MSO_SHAPE.ROUNDED_RECTANGLE)
        add_rect(s, x, y, Inches(0.12), ch, fill=BLUE)
        add_text(s, x+Inches(0.25), y+Inches(0.12), cw-Inches(0.45), ch-Inches(0.24),
                 [[(sub, 16.5, True, BLUE)],
                  [(content.replace("&nbsp;"," "), 14, False, INK)]], anchor=MSO_ANCHOR.TOP)
        add_click_reveal(s, box)
    footer(s, page)

for k, m in enumerate(NONMCQ):
    slide_non(m, page=17 + k)   # 15题→17, 16题→18, 17题→19, 18题→20

OUT = r"D:\Users\何xing\2026-10-21-19-14-25\化学月考课件PPT\高一化学第一次月考讲评.pptx"
prs.save(OUT)
print("saved:", OUT, "slides:", len(prs.slides._sldIdLst))
