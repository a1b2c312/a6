# 星辰班级 · 学习资源站

瑞昌一中高一化学备课资源 + 星辰班级主页。**纯静态站点**：无构建、无后端、无依赖，`git push` 即上线。

线上地址：<https://a1b2c312.github.io/a6/>

---

## 目录结构

```
a6/
├── index.html                ← 总入口：三个互不重叠的入口
│
├── xingchen/                 ← 星辰班级主站（学生 + 老师，需登录，2300+ 文件）
│   ├── index.html              首页：班级风采 / 化学小屋 / 数学加油站 / 英语角 / 物理之家
│   ├── teacher.html            教师工具：答题汇总报表、维护说明
│   ├── class.html              班级风采（照片、接力视频、远足 MV）
│   ├── chemistry.html          化学小屋
│   ├── math.html               数学加油站
│   ├── english.html            英语角
│   ├── physics.html            物理之家
│   ├── chemistry-mol.html       物质的量课时索引（7 个课件）
│   ├── chemistry-*.html        化学交互课件（氯 / 钠 / 氧化还原 / 物质的量 / 期末复习）
│   ├── chem3-card.html         学生用：练习3 答题卡补录（凭印象重填 → 找回成绩码）
│   ├── quiz-report.html        成绩汇总报表（从 teacher.html 进入）
│   ├── login.html              登录页
│   ├── 使用说明.html            网站维护教程（从 teacher.html 进入）
│   └── assets/
│       ├── css/                4 个样式表（style / quiz / quiz-en / quiz-exam）
│       ├── js/                 答题引擎与鉴权（见下表）
│       ├── papers/             题库：16 套试卷 JSON + 2118 张题目切片
│       ├── audio/              英语听力音频
│       ├── media/              班级视频（接力、远足 MV）
│       ├── games/  poster/     小游戏与海报素材
│       └── vendor/katex/       本地 KaTeX，公式离线渲染
│
├── courseware/               ← 免登录的独立成品课件（可直接投屏）
│   ├── index.html              课件库导航
│   ├── na-compounds/           钠的化合物 · 复习课件
│   ├── chem-exam1/             第一次月考讲评（网页 index.html + PPT）
│   └── _legacy/na-v1/          早期版本，存档不入口
│
├── tools/                    ← 生成脚本与源数据（不参与部署）
│   ├── cl2/                    氯气课件逐页文稿 JSON 与改稿脚本
│   └── chem-exam1/             月考 PPT 生成脚本（python-pptx）与配图
│
├── VISUAL-SPEC.md            视觉规范：颜色 / 排版 / 组件 / 扩展（改样式前先看）
├── DEPLOY.md                 发布与临时局域网访问说明
├── .nojekyll                 关闭 GitHub Pages 的 Jekyll 处理
└── .gitignore
```

### 五个学科页的统一分类

`chemistry / math / physics / english` 一律按同一顺序排板块，缺哪层就跳过：

| 顺序 | 板块 | 英文副标题 | 放什么 |
|---|---|---|---|
| 1 | 课堂课件 | CLASSWARE | 上课用的交互课件（目前仅化学有） |
| 2 | 在线练习 | PRACTICE | 在线答题、周考、周末作业、挑战题 |
| 3 | 试题讲评 | EXAM REVIEW | 月考、期中的试卷讲评，按时间倒序 |
| 4 | 专题与资料 | REFERENCE | 知识专题、公式速查、学习方法、词汇墙 |
| 5 | 实验与安全 | LAB &amp; SAFETY | 实验记录、器材与安全（仅化学有） |

「活动秀」是英语角独有的班级活动板块，固定在最后。

### 视觉规范

视觉规范已单独成文：**[`VISUAL-SPEC.md`](VISUAL-SPEC.md)**。

一页纸摘要：

- 扁平风：纯色画布 + 白卡片 + 1px 描边，不用渐变、毛玻璃、模糊阴影、emoji 图标；
- 每个板块一个主题色（`body[data-theme]` → `--accent` 系列），贯穿子页面与答题界面；
- 画布是极浅主题色 + 扁平几何底纹；页首是深一档的色带，页脚是同色系横条；
- 悬停反馈统一「向左上位移 + 向右下硬投影」；
- 首页是实心主题色 bento 卡片 + 星座线稿 + 诗词（一言）。

改颜色、加板块、加页面的具体步骤见该文档第 11 节。

### 页面脚本分工（`xingchen/assets/js/`）

| 文件 | 作用 |
|---|---|
| `auth.js` | 姓名 + 学号登录校验，只存加盐 SHA-256，**不含明文** |
| `quiz.js` | 练习模式：即时判对错 + 解析 + 讲评 |
| `quiz-exam.js` | 考试模式：交卷只判 ✓/✗，生成 `XC3-` 成绩码，本机暂存可续答 |
| `quiz-en.js` | 英语听力专用（音频播放 + 选项） |
| `review.js` | 试题讲评页逐题展开 |
| `main.js` | 公共交互（返回顶部、高亮当前板块等） |
| `hitokoto.js` | 首页诗词：向 `v1.hitokoto.cn` 取一句诗词（`c=i`），带 30 分钟本地缓存与失败退避 |

---

## 常见改动

**加一套练习/试卷**
1. 把题目切片图放进 `xingchen/assets/papers/<新卷名>/`
2. 写 `xingchen/assets/papers/<新卷名>.json`（字段见 `quiz-exam.js` 顶部注释）
3. 在 `chemistry.html`（或对应学科页）里加一张卡片，`fetch` 该 JSON

**加一个课件**：站内课件放 `xingchen/` 并在对应学科页加卡片；免登录成品放 `courseware/<名字>/index.html`，只需在 `courseware/index.html` 加一条链接。

**新增学生账号**：按 `auth.js` 里现有方式算加盐 SHA-256 追加到 `TOKENS`，并升级引用处的 `?v=` 版本号。

**换取句范围 / 缓存时长**：改 `xingchen/assets/js/hitokoto.js` 顶部的 `ENDPOINT`（当前固定 `c=i` 只取诗词；要放宽可加 `&c=d` 文学、`&c=k` 哲学）与 `TTL`/`FAIL_TTL`。接口有 QPS 限制，请保留缓存，不要为了「每次刷新都换一句」去掉 `TTL`。

**改完记得升版本号**：静态站靠 `?v=20261120g` 这种查询串破缓存，改了 css/js 就要改引用它的 `?v=`。

---

## 已知限制

- **鉴权是"防误点"级别**：静态站没有服务端，`auth.js` 只能挡住随手点开，懂技术的人可以绕过。**不要在这里放敏感资料。**
- `xingchen/assets/papers/_monthly_stats.json` 含学生姓名与分数分布，仓库是公开的。
- 成绩汇总靠学生把成绩码发给老师再粘贴统计，没有自动回传。
- 单个大文件 `星辰班远足MV.mp4` 约 86MB，clone 仓库会比较慢。

---

## 已清理 / 可从历史找回

整理前的这些内容不再维护，但仍在 git 历史里：

| 内容 | 说明 | 找回方式 |
|---|---|---|
| `氯气课件/shots/` | 143 张逐页校验截图（约 15MB） | `git log --diff-filter=D -- 氯气课件/shots` |
| `氯气课件/text/` | 已迁至 `tools/cl2/`，无遗漏 | — |
| `xingchen/huaxue-xiaowu.html` | chemistry.html 的旧副本 | 任意历史提交 |
| `courseware/cl2/` | 与 `xingchen/chemistry-cl2-lesson1.html` 仅差一行 auth.js，已去重 | 任意历史提交 |
| `化学互动课堂/` | 早期钠课件 + 外链导航页 | 现存档于 `courseware/_legacy/na-v1/` |
| `氯气互动课件/氯气-三册合一互动课件.html` | 与 `index.html` 完全相同，已去重 | 任意历史提交 |

**注意**：根目录下原来的中文目录名（`氯气互动课件/`、`钠及其化合物互动课件/` 等）已改为 `courseware/` 下的英文名。如果有二维码或外链指向旧地址，需要更新。
