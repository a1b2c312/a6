/* ==========================================================================
   在线测试引擎
   数据结构：{"sections":[{"title","questions":[{num,type,stem,options,answer}]}]}
   片段 fragment：{"t":文字} | {"i":图片名} | {"m":"$LaTeX$"}
   ========================================================================== */

(function () {
  "use strict";

  var TYPE_LABEL = { choice: "单选", multi: "多选", fill: "填空", solve: "解答", open: "主观" };
  var FORMULA_DIR = "";   // 由 init 时传入

  /* ---------- 片段渲染 ---------- */
  function renderFrags(frags, dir) {
    var html = "";
    (frags || []).forEach(function (f) {
      if (f.t !== undefined) {
        html += escapeHtml(f.t).replace(/\n/g, "<br/>");
      } else if (f.i !== undefined) {
        // 黑白公式图在深色背景上看不清 -> 反色成白字；
        // 彩色图（v-t 图、光电门、实验装置）保持原色，限宽显示。
        var cls, st = "";
        if (f.c) {
          cls = "fx colored";
          st = ' style="width:' + Math.min(300, f.w || 240) + 'px"';
        } else {
          cls = "fx";
          // 公式图：按比例缩放到行内高度
          if (f.h) {
            var disp = Math.max(15, Math.min(30, Math.round(f.h / 4.2)));
            st = ' style="height:' + disp + 'px"';
          }
        }
        html +=
          '<img class="' + cls + '" src="' + dir + escapeHtml(f.i) +
          '" alt="公式" loading="lazy" title="点击放大"' + st + " />";
      } else if (f.m !== undefined) {
        var cls = "tex" + (f.disp ? " tex-disp" : "");
        html += '<span class="' + cls + '">' + escapeHtml(f.m) + "</span>";
      } else if (f.h !== undefined) {
        // 内嵌 HTML 片段（表格等），由数据生成方保证可信
        html += f.h;
      }
    });
    return html;
  }

  /* 是否可自动判分（主观题 open 只对照解析自查，不计分） */
  function isScored(q) {
    return q.type === "choice" || q.type === "multi" ||
      q.type === "fill" || q.type === "solve";
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /* 用 KaTeX 渲染容器内所有 .tex 公式片段（片段 {"m": latex}）。
     幂等：渲染过的加 data-kx 标记，避免重复渲染。 */
  Quiz.prototype.renderTex = function () {
    if (!window.katex) return;
    var self = this;
    $$(".tex", this.root).forEach(function (el) {
      if (el.getAttribute("data-kx")) return;
      try {
        katex.render(el.textContent, el, {
          throwOnError: false,
          displayMode: el.classList.contains("tex-disp")
        });
        el.setAttribute("data-kx", "1");
      } catch (e) {
        el.classList.add("tex-err");
        el.title = String((e && e.message) || e);
      }
    });
  };

  /* 渲染策略：
     - 彩色图（v-t 图、实验装置、田径场）-> 单独一块放大显示
     - 黑白公式图 -> 行内，按高度缩放 + CSS 反色成白字
     判定依据：JSON 里带 c 标记的是彩色图。 */
  function splitFigures(frags, dir) {
    var kept = [];
    var figs = [];

    (frags || []).forEach(function (f) {
      if (f.i !== undefined && f.c) {
        figs.push(f);
      } else {
        kept.push(f);
      }
    });

    return { inline: renderFrags(kept, dir), figures: figs };
  }

  /* ---------- 工具 ---------- */
  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------- 主类 ---------- */
  function Quiz(root, data, opts) {
    this.root = root;
    this.data = data;
    this.opts = opts || {};
    this.dir = opts.dir || "";
    this.picks = {};        // num -> [letters]
    this.revealed = {};     // num -> bool
    this.build();
  }

  Quiz.prototype.flat = function (scoredOnly) {
    var out = [];
    this.data.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (!scoredOnly || isScored(q)) out.push(q);
      });
    });
    return out;
  };

  Quiz.prototype.build = function () {
    var self = this;
    var qs = this.flat();
    var scoredTotal = this.flat(true).length;

    var bar =
      '<div class="quiz-bar">' +
      '<span class="qb-title">' + escapeHtml(this.opts.title || "在线测试") + "</span>" +
      '<span class="qb-prog" id="' + this.opts.id + '-prog">0 / ' + scoredTotal + "</span>" +
      '<span class="qb-spacer"></span>' +
      '<button class="btn" data-act="reset" type="button">重做</button>' +
      '<button class="btn primary" data-act="submit" type="button">整卷提交</button>' +
      "</div>";

    // 按大题分组渲染：每组一个标题 + 「本大题对答案」按钮
    var body = "";
    this.data.sections.forEach(function (sec) {
      var qs2 = sec.questions || [];
      if (!qs2.length) return;
      body +=
        '<div class="grp-head">' +
        '<span class="gh-t">' + escapeHtml(sec.title || "") + "</span>" +
        '<span class="gh-n">' + qs2.length + " 题</span>" +
        '<span class="qb-spacer"></span>' +
        '<button class="btn-mini sec" data-sec="' + escapeHtml(sec.title || "") +
        '" type="button">本大题对答案</button>' +
        "</div>";
      body += qs2.map(function (q) { return self.qHtml(q); }).join("");
    });
    body = '<div class="q-list">' + body + "</div>";
    var result =
      '<div class="quiz-result" id="' + this.opts.id + '-result">' +
      '<div class="score" id="' + this.opts.id + '-score">0<small>/' + scoredTotal + "</small></div>" +
      '<div class="word" id="' + this.opts.id + '-word"></div>' +
      '<div class="detail" id="' + this.opts.id + '-detail"></div>' +
      '<div class="acts">' +
      '<button class="btn primary" data-act="showall" type="button">显示全部解析</button>' +
      '<button class="btn" data-act="hideall" type="button">收起全部解析</button>' +
      '<button class="btn" data-act="reset" type="button">重新作答</button>' +
      "</div></div>";

    this.root.innerHTML = bar + body + result;

    // 事件
    this.root.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (btn) {
        var act = btn.getAttribute("data-act");
        if (act === "submit") self.submit();
        if (act === "reset") self.reset();
        if (act === "showall") self.toggleAll(true);
        if (act === "hideall") self.toggleAll(false);
        return;
      }
      // 单题提交
      var one = e.target.closest("[data-one]");
      if (one) {
        self.submitOne(parseInt(one.getAttribute("data-one"), 10));
        return;
      }
      // 答题分布
      var stat = e.target.closest("[data-stat]");
      if (stat) {
        var sn = parseInt(stat.getAttribute("data-stat"), 10);
        var box = document.getElementById(self.opts.id + "-stat-" + sn);
        var q = self.find(sn);
        if (box && q) {
          if (box.innerHTML) {
            box.innerHTML = "";
            box.classList.remove("on");
          } else {
            box.innerHTML = self.statHtml(q);
            box.classList.add("on");
          }
        }
        return;
      }
      // 本大题提交
      var secBtn = e.target.closest("[data-sec]");
      if (secBtn) {
        var title = secBtn.getAttribute("data-sec");
        var nums = self.numsOfSection(title);
        self.submitMany(nums, true);
        return;
      }
      var opt = e.target.closest(".q-opt");
      if (opt) {
        var card = opt.closest(".q-card");
        self.pick(card.dataset.num, opt.dataset.label, opt);
        return;
      }
      // 题图 / 公式点击放大
      var fig = e.target.closest(".q-figures img, img.fx");
      if (fig) {
        self.zoom(fig.src);
      }
    });

    // 填空题输入
    $$(".q-input", this.root).forEach(function (inp) {
      inp.addEventListener("input", function () {
        self.picks[inp.dataset.num] = inp.value;
      });
    });

    this.update();
    this.renderTex();
  };

  /* 题图 / 公式放大查看 */
  Quiz.prototype.zoom = function (src) {
    var self_ = this;
    var box = document.getElementById("zoom-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "zoom-box";
      box.className = "zoom-box";
      box.innerHTML = '<button class="zoom-close" type="button">✕</button><img alt="放大查看" />';
      document.body.appendChild(box);
      box.addEventListener("click", function (e) {
        if (e.target === box || e.target.classList.contains("zoom-close")) {
          box.classList.remove("on");
          document.body.style.overflow = "";
        }
      });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          box.classList.remove("on");
          document.body.style.overflow = "";
        }
      });
    }
    box.querySelector("img").src = src;
    box.classList.add("on");
    document.body.style.overflow = "hidden";
  };

  Quiz.prototype.qHtml = function (q) {
    var sp = splitFigures(q.stem, this.dir);
    var html = '<div class="q-card" data-num="' + q.num + '">';

    html +=
      '<div class="q-head">' +
      '<span class="q-no">' + q.num + "</span>" +
      '<span class="q-tag">' + (TYPE_LABEL[q.type] || "题") + "</span>" +
      (q.stats
        ? '<button class="btn-mini stat" data-stat="' + q.num + '" type="button">📊 答题分布</button>'
        : "") +
      "</div>";

    html += '<div class="q-stem">' + sp.inline + "</div>";

    if (sp.figures.length) {
      html +=
        '<div class="q-figures">' +
        sp.figures
          .map(function (f) {
            // 彩色图保持原色，尺寸按原图比例（限宽 420px）
            var w = f.w ? Math.min(420, f.w) : 320;
            return '<img src="' + this.dir + escapeHtml(f.i) +
              '" alt="题图" loading="lazy" style="width:' + w + 'px" />';
          }, this)
          .join("") +
        "</div>";
    }
    // 填空 / 解答 / 主观题给输入框
    if (q.type === "fill" || q.type === "solve" || q.type === "open") {
      var ph = q.type === "fill" ? "把你的答案填在这里"
        : q.type === "open" ? "主观题：可写下你的答案或思路（选填，对照解析自查）"
        : "可写下你的思路（选填）";
      html +=
        '<input class="q-input" data-num="' + q.num +
        '" type="text" placeholder="' + ph + '" />';
    }

    if (q.options && q.options.length) {
      html +=
        '<div class="q-opts">' +
        q.options
          .map(function (o) {
            return (
              '<div class="q-opt" data-label="' + o.label + '" role="button" tabindex="0">' +
              '<span class="dot">' + o.label + "</span>" +
              '<span class="opt-tx">' + renderFrags(o.frags, this.dir) + "</span>" +
              "</div>"
            );
          }, this)
          .join("") +
        "</div>";
    }

    html += '<div class="q-ans" id="' + this.opts.id + '-ans-' + q.num + '"></div>';
    html +=
      '<div class="q-acts">' +
      '<button class="btn-mini" data-one="' + q.num + '" type="button">' +
      "本题答案与解析</button>" +
      '<span class="q-one-state" id="' + this.opts.id + '-st-' + q.num + '"></span>' +
      "</div>";
    html += '<div class="q-stat" id="' + this.opts.id + '-stat-' + q.num + '"></div>';
    html += "</div>";
    return html;
  };

  /* 答题分布面板 HTML */
  Quiz.prototype.statHtml = function (q) {
    var st = q.stats;
    if (!st) return "";
    var h = '<div class="stat-box">';
    if (st.type === "choice") {
      h += '<div class="stat-title">本题选择分布（共 ' + (st.total || 0) + " 人作答）</div>";
      h += '<div class="stat-grid">';
      Object.keys(st.options).forEach(function (k) {
        var o = st.options[k];
        h += '<div class="stat-opt"><span class="so-lbl">' + k + "</span>" +
          '<span class="so-cnt">' + o.count + " 人</span>" +
          '<div class="so-names">' + (o.names.length ? escapeHtml(o.names.join("、")) : "—") + "</div></div>";
      });
      h += "</div>";
      if (st.unanswered) {
        h += '<div class="stat-unans">未作答 ' + st.unanswered.count + " 人：" +
          escapeHtml(st.unanswered.names.join("、")) + "</div>";
      }
    } else {
      h += '<div class="stat-title">本题得分分布（满分约 ' + (st.full || "?") +
        " 分，共 " + (st.total || 0) + " 人）</div>";
      h += '<div class="stat-bands">';
      (st.bands || []).forEach(function (b) {
        h += '<div class="stat-band"><span class="sb-lbl">' + escapeHtml(b.label) + "</span>" +
          '<span class="sb-cnt">' + b.count + " 人</span>" +
          '<div class="sb-names">' + (b.names.length ? escapeHtml(b.names.join("、")) : "—") + "</div></div>";
      });
      h += "</div>";
      if (st.unanswered) {
        h += '<div class="stat-unans">未作答 ' + st.unanswered.count + " 人：" +
          escapeHtml(st.unanswered.names.join("、")) + "</div>";
      }
    }
    h += "</div>";
    return h;
  };

  Quiz.prototype.pick = function (num, label, el) {
    var q = this.find(num);
    if (!q) return;
    if (q.type === "multi") {
      var arr = this.picks[num] || [];
      var i = arr.indexOf(label);
      if (i >= 0) arr.splice(i, 1);
      else arr.push(label);
      this.picks[num] = arr.sort();
    } else {
      this.picks[num] = [label];
    }
    if (el) {
      var card = el.closest(".q-card");
      var sel = (this.picks[num] || []).indexOf(el.dataset.label) >= 0;
      el.classList.toggle("sel", sel);
    }
    this.update();
  };

  Quiz.prototype.find = function (num) {
    var r = null;
    this.data.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (q.num == num) r = q;
      });
    });
    return r;
  };

  Quiz.prototype.correctLetters = function (q) {
    var a = q.answer || {};
    var head = (a.head || "").trim();
    // 只取 A-D 字母，去重后按字母序排列，保证与用户选择可比
    var seen = {};
    (head.match(/[A-Da-d]/g) || []).forEach(function (c) {
      seen[c.toUpperCase()] = 1;
    });
    return Object.keys(seen).sort();
  };

  Quiz.prototype.update = function () {
    var qs = this.flat(true);
    var done = qs.filter(function (q) {
      var p = this.picks[q.num];
      if (!p) return false;
      return Array.isArray(p) ? p.length > 0 : String(p).trim().length > 0;
    }, this).length;
    var el = document.getElementById(this.opts.id + "-prog");
    if (el) el.textContent = done + " / " + qs.length;
  };

  Quiz.prototype.normText = function (s) {
    return String(s || "")
      .replace(/[\s，,。；;：:（）()【】\[\]]/g, "")
      .replace(/[－—–]/g, "-")
      .toLowerCase();
  };

  /* 纯判定：只算对错，不动 DOM。
     统计分数用这个，避免把未提交题目的正确答案标出来泄露答案。 */
  Quiz.prototype.judge = function (q) {
    var pick = this.picks[q.num];
    var answered = pick &&
      (Array.isArray(pick) ? pick.length > 0 : String(pick).trim().length > 0);
    if (!answered) return { ok: false, answered: false };

    if (q.type === "open") {
      return { ok: true, answered: true, open: true };
    }
    if (q.type === "choice" || q.type === "multi") {
      var rightLs = this.correctLetters(q);
      var mine = (pick || []).slice().sort();
      return {
        ok: rightLs.length > 0 &&
          rightLs.length === mine.length &&
          rightLs.every(function (L, i) { return L === mine[i]; }),
        answered: true
      };
    }
    var std = ((q.answer || {}).head || "").trim();
    return {
      ok: !!std && this.normText(pick) === this.normText(std),
      answered: true
    };
  };

  /* 判断一道题的对错，并同步渲染该题卡片 */
  Quiz.prototype.judgeOne = function (q) {
    var self = this;
    var card = document.querySelector('.q-card[data-num="' + q.num + '"]');
    var ansBox = document.getElementById(this.opts.id + "-ans-" + q.num);
    var stEl = document.getElementById(this.opts.id + "-st-" + q.num);
    if (!card || !ansBox) return null;

    var pick = this.picks[q.num];
    var answered = pick &&
      (Array.isArray(pick) ? pick.length > 0 : String(pick).trim().length > 0);
    var ok = false;
    var isOpen = q.type === "open";

    if (isOpen) {
      ok = true;
      var inp0 = card.querySelector(".q-input");
      if (inp0) {
        inp0.classList.remove("right", "miss");
        if (answered) inp0.classList.add("right");
      }
    } else if (q.type === "choice" || q.type === "multi") {
      var rightLs = this.correctLetters(q);
      var mine = (pick || []).slice().sort();
      ok = rightLs.length > 0 &&
        rightLs.length === mine.length &&
        rightLs.every(function (L, i) { return L === mine[i]; });
      $$(".q-opt", card).forEach(function (o) {
        var L = o.dataset.label;
        o.classList.remove("sel", "right", "miss");
        if (rightLs.indexOf(L) >= 0) o.classList.add("right");
        else if (mine.indexOf(L) >= 0) o.classList.add("miss");
      });
    } else {
      var std = ((q.answer || {}).head || "").trim();
      var norm = self.normText;
      ok = !!std && norm(pick) === norm(std);
      var inp = card.querySelector(".q-input");
      if (inp) {
        inp.classList.remove("right", "miss");
        if (answered) inp.classList.add(ok ? "right" : "miss");
      }
    }

    card.classList.remove("done", "wrong", "blank");
    if (answered) card.classList.add(ok ? "done" : "wrong");
    else card.classList.add("blank");

    // 解析框
    if (this.revealed[q.num]) {
      ansBox.innerHTML = this.ansHtml(q);
      ansBox.classList.add("on");
    } else {
      ansBox.innerHTML = "";
      ansBox.classList.remove("on");
    }

    // 题号旁的状态小标
    if (stEl) {
      stEl.textContent = !answered ? "未作答"
        : (isOpen ? "✓ 已作答 · 对照解析自查" : (ok ? "✓ 答对" : "✗ 答错"));
      stEl.className = "q-one-state " + (!answered ? "blank" : "ok");
    }
    return { ok: !!ok, answered: !!answered };
  };

  /* 提交并显示某一道题 */
  Quiz.prototype.submitOne = function (num) {
    var q = this.find(num);
    if (!q) return;
    var wasShown = !!this.revealed[num];
    this.revealed[num] = !wasShown;      // 再次点击可收起
    if (!wasShown) this.judgeOne(q);
    else {
      var ansBox = document.getElementById(this.opts.id + "-ans-" + num);
      var card = document.querySelector('.q-card[data-num="' + num + '"]');
      if (ansBox) {
        ansBox.innerHTML = "";
        ansBox.classList.remove("on");
      }
      if (card) card.classList.remove("done", "wrong", "blank");
      var st = document.getElementById(this.opts.id + "-st-" + num);
      if (st) {
        st.textContent = "";
        st.className = "q-one-state";
      }
    }
    this.refreshScore();
    this.renderTex();
  };

  /* 提交若干题（一个大题） */
  Quiz.prototype.submitMany = function (nums, showAns) {
    var self = this;
    var r = 0, ans = 0;
    nums.forEach(function (n) {
      self.revealed[n] = showAns;
      var q = self.find(n);
      var res = self.judgeOne(q);
      if (res && res.answered) {
        ans++;
        if (res.ok) r++;
      }
    });
    this.refreshScore();

    // 本大题小结
    var first = this.find(nums[0]);
    if (first) {
      var card = document.querySelector('.q-card[data-num="' + nums[0] + '"]');
      var box = card && card.closest(".q-list");
      if (box) {
        var tip = box.querySelector('.grp-tip.on');
        if (!tip) {
          tip = document.createElement("div");
          tip.className = "grp-tip on";
          box.appendChild(tip);
        }
        tip.textContent = "本大题：已对 " + r + " / " + nums.length + " 题";
      }
    }
    this.renderTex();
  };

  Quiz.prototype.numsOfSection = function (title) {
    var out = [];
    this.data.sections.forEach(function (s) {
      if ((s.title || "") === title) {
        (s.questions || []).forEach(function (q) { out.push(q.num); });
      }
    });
    return out;
  };

  /* 实时刷新顶部进度与得分 —— 只统计，不渲染标记，
     否则会把没提交的题目的正确答案标绿，造成答案泄露 */
  Quiz.prototype.refreshScore = function () {
    var qs = this.flat(true);
    var right = 0, answered = 0;
    qs.forEach(function (q) {
      var r = this.judge(q);
      if (r.answered) {
        answered++;
        if (r.ok) right++;
      }
    }, this);
    var prog = document.getElementById(this.opts.id + "-prog");
    if (prog) prog.textContent = answered + " / " + qs.length;
    var sc = document.getElementById(this.opts.id + "-score");
    if (sc) sc.innerHTML = right + "<small>/" + qs.length + "</small>";
    return { right: right, answered: answered, total: qs.length };
  };

  Quiz.prototype.submit = function () {
    var self = this;
    var qs = this.flat(true);
    var openCount = this.flat().length - qs.length;
    var wrongList = [];
    var right = 0;
    var answered = 0;

    // 整卷提交：所有题都揭示答案，所以统一渲染
    qs.forEach(function (q) {
      self.revealed[q.num] = true;
      var r = self.judgeOne(q);
      if (r && r.answered) {
        answered++;
        if (r.ok) right++;
        else wrongList.push(q.num);
      }
    });
    // 主观题只揭示解析，不判分
    this.flat().forEach(function (q) {
      if (!isScored(q)) self.revealed[q.num] = true;
    });

    var total = qs.length;
    var pct = answered ? Math.round((right / answered) * 100) : 0;
    var word =
      pct >= 90 ? "优秀 · 基础扎实" :
      pct >= 75 ? "良好 · 稳中有进" :
      pct >= 60 ? "合格 · 再巩固一下" :
      pct >= 40 ? "待加强 · 重点看解析" : "需加油 · 从基础重新梳理";

    document.getElementById(this.opts.id + "-score").innerHTML =
      right + "<small>/" + total + "</small>";
    document.getElementById(this.opts.id + "-word").textContent = word;
    document.getElementById(this.opts.id + "-detail").innerHTML =
      "已作答 <b>" + answered + "</b> 题，答对 <b>" + right + "</b> 题" +
      (answered ? "，正确率 <b>" + pct + "%</b>" : "") +
      (openCount ? "<br/>另有 <b>" + openCount + "</b> 道主观题，请对照参考答案自查。" : "") +
      (wrongList.length
        ? "<br/>需要回看的题号：" + wrongList.map(function (n) {
            return '<a href="#' + self.opts.id + "-q" + n + '" class="q-jump">' + n + "</a>";
          }).join(" ")
        : answered === total
        ? "<br/>全部答对，太棒了！"
        : "<br/>还有没做的题，补上试试。");

    document.getElementById(this.opts.id + "-result").classList.add("on");
    document.getElementById(this.opts.id + "-result").scrollIntoView({
      behavior: "smooth", block: "center"
    });
    this.renderTex();
  };

  Quiz.prototype.ansHtml = function (q) {
    var a = q.answer || {};
    var html = '<div class="ans-head">📘 解析与答案';
    if ((a.head || "").trim()) {
      html += '<span class="ans-val">' + escapeHtml(a.head.trim()) + "</span>";
    }
    html += "</div>";
    if (a.body && a.body.length) {
      html += '<div class="q-body">' + renderFrags(a.body, this.dir) + "</div>";
    } else {
      html += '<div class="q-body">（本题暂无文字解析）</div>';
    }
    return html;
  };

  Quiz.prototype.toggleAll = function (show) {
    var self = this;
    this.flat().forEach(function (q) {
      var box = document.getElementById(self.opts.id + "-ans-" + q.num);
      if (!box) return;
      if (!box.innerHTML.trim()) box.innerHTML = self.ansHtml(q);
      box.classList.toggle("on", show);
    });
    this.renderTex();
  };

  Quiz.prototype.reset = function () {
    this.picks = {};
    this.revealed = {};
    this.build();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ---------- 全局初始化 ---------- */
  window.QuizEngine = { Quiz: Quiz, renderFrags: renderFrags, TYPE_LABEL: TYPE_LABEL };
})();
