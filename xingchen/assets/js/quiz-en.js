/* ==========================================================================
   英语在线测试引擎
   数据：{title, subtitle, audio, sections:[{title,kind,hint,passage,bank,questions}],
          writing:[...]}
   ========================================================================== */

(function () {
  "use strict";

  var TYPE_LABEL = { choice: "单选", word: "填空" };
  var LABEL_OF = {
    listen: "听力",
    passage: "阅读",
    bank: "七选五",
    word: "单词填空",
    writing: "写作",
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ================= 听力播放器 ================= */
  function Player(box, src, name) {
    this.box = box;
    this.name = name || "听力原音";
    this.audio = new Audio();
    this.audio.src = src;
    this.audio.preload = "metadata";
    this.playing = false;
    this.render();
    this.bind();
  }

  Player.prototype.render = function () {
    this.box.innerHTML =
      '<div class="ab-ico">🎧</div>' +
      '<div class="ab-info">' +
      '<div class="ab-name">' + esc(this.name) + "</div>" +
      '<div class="ab-time"><span id="au-cur">00:00</span> / <span id="au-dur">--:--</span></div>' +
      "</div>" +
      '<div class="audio-track" id="au-track"><div class="fill" id="au-fill"></div></div>' +
      '<div class="ab-btns">' +
      '<button class="btn-play" id="au-play" type="button">▶ 开始</button>' +
      '<button class="btn-ghost" id="au-stop" type="button">■ 停止</button>' +
      '<button class="btn-ghost" id="au-back" type="button">« 后退 10 秒</button>' +
      '<button class="btn-ghost" id="au-fwd" type="button">前进 10 秒 »</button>' +
      '<button class="btn-ghost" id="au-reset" type="button">↺ 回到开头</button>' +
      "</div>";
  };

  Player.prototype.bind = function () {
    var self = this;
    var a = this.audio;
    var btnPlay = $("#au-play", this.box);
    var btnStop = $("#au-stop", this.box);
    var track = $("#au-track", this.box);
    var fill = $("#au-fill", this.box);
    var cur = $("#au-cur", this.box);
    var dur = $("#au-dur", this.box);

    a.addEventListener("loadedmetadata", function () {
      dur.textContent = fmt(a.duration);
    });
    a.addEventListener("timeupdate", function () {
      cur.textContent = fmt(a.currentTime);
      if (a.duration) {
        fill.style.width = (a.currentTime / a.duration) * 100 + "%";
      }
    });
    a.addEventListener("play", function () {
      self.playing = true;
      btnPlay.classList.add("playing");
      btnPlay.textContent = "❚❚ 暂停";
    });
    a.addEventListener("pause", function () {
      self.playing = false;
      btnPlay.classList.remove("playing");
      btnPlay.textContent = "▶ 开始";
    });
    a.addEventListener("ended", function () {
      self.playing = false;
      btnPlay.classList.remove("playing");
      btnPlay.textContent = "▶ 开始";
      fill.style.width = "0%";
      cur.textContent = "00:00";
    });
    a.addEventListener("error", function () {
      cur.textContent = "音频加载失败";
    });

    btnPlay.addEventListener("click", function () {
      if (a.paused) {
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        a.pause();
      }
    });

    // 停止 = 暂停并回到开头
    btnStop.addEventListener("click", function () {
      a.pause();
      a.currentTime = 0;
      fill.style.width = "0%";
      cur.textContent = "00:00";
      btnPlay.classList.remove("playing");
      btnPlay.textContent = "▶ 开始";
    });

    $("#au-back", this.box).addEventListener("click", function () {
      a.currentTime = Math.max(0, a.currentTime - 10);
    });
    $("#au-fwd", this.box).addEventListener("click", function () {
      if (isFinite(a.duration)) {
        a.currentTime = Math.min(a.duration, a.currentTime + 10);
      }
    });
    $("#au-reset", this.box).addEventListener("click", function () {
      a.currentTime = 0;
    });

    track.addEventListener("click", function (e) {
      if (!a.duration) return;
      var r = track.getBoundingClientRect();
      var ratio = (e.clientX - r.left) / r.width;
      a.currentTime = Math.max(0, Math.min(a.duration, ratio * a.duration));
    });
  };

  /* ================= 主体 ================= */
  function EngQuiz(root, data) {
    this.root = root;
    this.data = data;
    this.picks = {};      // num -> ['A'] 或 字符串（单词填空）
    this.revealed = {};
    this.build();
  }

  EngQuiz.prototype.allQs = function () {
    var out = [];
    this.data.sections.forEach(function (s) {
      (s.questions || []).forEach(function (q) { out.push(q); });
    });
    return out;
  };

  EngQuiz.prototype.renderFrags = function (frags) {
    var html = "";
    (frags || []).forEach(function (f) {
      if (f.t !== undefined) {
        html += esc(f.t).replace(/\n/g, "<br/>");
      } else if (f.i !== undefined) {
        html += '<img class="fx" src="assets/papers/eng/' + esc(f.i) + '" alt="" />';
      } else if (f.b !== undefined) {
        html += "<b>" + esc(f.b) + "</b>";
      } else if (f.it !== undefined) {
        html += "<i>" + esc(f.it) + "</i>";
      }
    });
    return html;
  };

  EngQuiz.prototype.build = function () {
    var self = this;
    var d = this.data;

    var bar =
      '<div class="quiz-bar">' +
      '<span class="qb-title">' + esc(d.title) + "</span>" +
      '<span class="qb-prog" id="en-prog">0 / 0</span>' +
      '<span class="qb-spacer"></span>' +
      '<button class="btn" data-act="reset" type="button">重做</button>' +
      '<button class="btn primary" data-act="submit" type="button">提交并查看解析</button>' +
      "</div>";

    var player = '<div class="audio-bar" id="en-player"></div>';

    // 各 section
    var body = "";
    d.sections.forEach(function (sec, si) {
      if (sec.kind === "writing") return;
      body += '<div class="grp-head"><span class="gh-t">' + esc(sec.title) + "</span>" +
        '<span class="gh-n">' + (LABEL_OF[sec.kind] || "") + " · " +
        (sec.questions || []).length + " 题</span>" +
        '<span class="qb-spacer"></span>' +
        '<button class="btn-mini sec" data-sec="' + si +
        '" type="button">本大题对答案</button>' +
        (sec.hint ? '<span class="gh-hint">' + esc(sec.hint) + "</span>" : "") +
        "</div>";

      if (sec.kind === "listen") {
        body += '<div class="listen-tip"><span class="lt-ico">🎧</span>' +
          "<span>先点上方「开始」播放听力，边听边作答。答题过程中可以随时暂停、后退重听；" +
          "每道题都能单独看答案，也可以整卷提交。</span></div>";
      }

      if (sec.passage && sec.passage.length) {
        body += '<div class="passage"><h4>短文原文</h4>' +
          sec.passage.map(function (p) { return "<p>" + self.plain(p) + "</p>"; }).join("") +
          "</div>";
      }
      if (sec.bank && sec.bank.length) {
        body += '<div class="bank" data-bank="' + si + '"><div class="bank-t">选项池（多余两项）</div>' +
          sec.bank.map(function (o) {
            return '<div class="q-opt" data-label="' + o.label + '" data-bank="' + si + '">' +
              '<span class="dot">' + o.label + "</span>" +
              '<span class="opt-tx">' + self.renderFrags(o.frags) + "</span></div>";
          }).join("") + "</div>";
      }
      (sec.questions || []).forEach(function (q) { body += self.qHtml(q); });
    });

    // 写作
    if (d.writing && d.writing.length) {
      body += '<div class="grp-head"><span class="gh-t">' +
        esc(d.writingTitle || "写作 · 书面表达（66—67）") + "</span>" +
        '<span class="gh-n">主观题</span>' +
        '<span class="gh-hint">按要求完成写作，提交后可展开参考答案对照自评。</span></div>';
      d.writing.forEach(function (w) {
        body +=
          '<div class="write-card" data-write="' + w.num + '">' +
          '<div class="wc-t">' + esc((w.label || w.num) + ". " + w.title) + "</div>" +
          '<div class="wc-stem">' + esc(w.stem) + "</div>" +
          (w.note ? '<div class="wc-note">' + esc(w.note) + "</div>" : "") +
          '<textarea placeholder="在此写下你的作文……" data-write="' + w.num + '"></textarea>' +
          '<div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap;">' +
          '<button class="btn-ghost" data-ref="' + w.num + '" type="button">查看参考答案</button>' +
          '<span class="wc-count" data-count="' + w.num +
          '" style="font-size:13px;color:var(--ink-faint);letter-spacing:1px;"></span></div>' +
          '<div class="wc-ref" data-refbox="' + w.num + '">' + esc(w.ref) + "</div>" +
          "</div>";
      });
    }

    var result =
      '<div class="quiz-result" id="en-result">' +
      '<div class="score" id="en-score">0</div>' +
      '<div class="word" id="en-word"></div>' +
      '<div class="detail" id="en-detail"></div>' +
      '<div class="acts">' +
      '<button class="btn primary" data-act="showall" type="button">显示全部解析</button>' +
      '<button class="btn" data-act="hideall" type="button">收起全部解析</button>' +
      '<button class="btn" data-act="reset" type="button">重新作答</button>' +
      "</div></div>";

    this.root.innerHTML = bar + player + '<div class="en-body">' + body + "</div>" + result;

    // 播放器
    this.player = new Player($("#en-player", this.root), d.audio, d.audioName);

    // 事件
    this.root.addEventListener("click", function (e) {
      var act = e.target.closest("[data-act]");
      if (act) {
        var a = act.getAttribute("data-act");
        if (a === "submit") self.submit();
        if (a === "reset") self.reset();
        if (a === "showall") self.toggleAll(true);
        if (a === "hideall") self.toggleAll(false);
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
        var box = document.getElementById("en-stat-" + sn);
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
        self.submitSection(parseInt(secBtn.getAttribute("data-sec"), 10));
        return;
      }
      var ref = e.target.closest("[data-ref]");
      if (ref) {
        var n = ref.getAttribute("data-ref");
        var box = document.querySelector('[data-refbox="' + n + '"]');
        if (box) box.classList.toggle("on");
        return;
      }
      var opt = e.target.closest(".q-opt");
      if (opt) {
        var card = opt.closest(".q-card");
        if (card) {
          self.pick(card.dataset.num, opt.dataset.label, opt);
        } else {
          // 选项池：标记被哪题选中
          self.markBank(opt);
        }
      }
    });

    $$(".q-input", this.root).forEach(function (inp) {
      inp.addEventListener("input", function () {
        self.picks[inp.dataset.num] = inp.value;
        self.update();
      });
    });

    // 作文字数统计
    $$("textarea[data-write]", this.root).forEach(function (ta) {
      ta.addEventListener("input", function () {
        var n = ta.getAttribute("data-write");
        var el = document.querySelector('[data-count="' + n + '"]');
        if (el) el.textContent = "已写 " + ta.value.trim().length + " 词";
      });
    });

    this.update();
  };

  EngQuiz.prototype.plain = function (p) {
    // 简易标记：<b>..</b> -> 加粗，<i>..</i> -> 斜体，\n -> 换行
    return esc(p)
      .replace(/&lt;b&gt;(.*?)&lt;\/b&gt;/g, "<b>$1</b>")
      .replace(/&lt;i&gt;(.*?)&lt;\/i&gt;/g, "<i>$1</i>")
      .replace(/\n/g, "<br/>");
  };

  EngQuiz.prototype.qHtml = function (q) {
    var html = '<div class="q-card' + (q.type === "word" ? " q-word" : "") +
      '" data-num="' + q.num + '">';
    html +=
      '<div class="q-head">' +
      '<span class="q-no">' + esc(q.label || q.num) + "</span>" +
      '<span class="q-tag">' + (TYPE_LABEL[q.type] || "题") + "</span>" +
      (q.stats
        ? '<button class="btn-mini stat" data-stat="' + q.num + '" type="button">📊 答题分布</button>'
        : "") +
      "</div>";
    html += '<div class="q-stem">' + this.plain(q.stem) + "</div>";

    if (q.type === "word") {
      html +=
        '<input class="q-input" data-num="' + q.num + '" type="text" placeholder="' +
        esc(q.placeholder || "填入答案") + '" />';
    }

    if (q.options && q.options.length) {
      html +=
        '<div class="q-opts">' +
        q.options
          .map(function (o) {
            return (
              '<div class="q-opt" data-label="' + o.label + '" role="button" tabindex="0">' +
              '<span class="dot">' + o.label + "</span>" +
              '<span class="opt-tx">' + this.renderFrags(o.frags) + "</span></div>"
            );
          }, this)
          .join("") +
        "</div>";
    }

    html += '<div class="q-ans" id="en-ans-' + q.num + '"></div>';
    html +=
      '<div class="q-acts">' +
      '<button class="btn-mini" data-one="' + q.num + '" type="button">本题答案与解析</button>' +
      '<span class="q-one-state" id="en-st-' + q.num + '"></span>' +
      "</div>";
    html += '<div class="q-stat" id="en-stat-' + q.num + '"></div></div>';
    return html;
  };

  /* 答题分布面板 HTML */
  EngQuiz.prototype.statHtml = function (q) {
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
          '<div class="so-names">' + (o.names.length ? esc(o.names.join("、")) : "—") + "</div></div>";
      });
      h += "</div>";
      if (st.unanswered) {
        h += '<div class="stat-unans">未作答 ' + st.unanswered.count + " 人：" +
          esc(st.unanswered.names.join("、")) + "</div>";
      }
    } else {
      h += '<div class="stat-title">本题得分分布（满分约 ' + (st.full || "?") +
        " 分，共 " + (st.total || 0) + " 人）</div>";
      h += '<div class="stat-bands">';
      (st.bands || []).forEach(function (b) {
        h += '<div class="stat-band"><span class="sb-lbl">' + esc(b.label) + "</span>" +
          '<span class="sb-cnt">' + b.count + " 人</span>" +
          '<div class="sb-names">' + (b.names.length ? esc(b.names.join("、")) : "—") + "</div></div>";
      });
      h += "</div>";
      if (st.unanswered) {
        h += '<div class="stat-unans">未作答 ' + st.unanswered.count + " 人：" +
          esc(st.unanswered.names.join("、")) + "</div>";
      }
    }
    h += "</div>";
    return h;
  };

  EngQuiz.prototype.pick = function (num, label, el) {
    this.picks[num] = [label];
    var card = el.closest(".q-card");
    $$(".q-opt", card).forEach(function (o) {
      o.classList.toggle("sel", o.dataset.label === label);
    });
    this.markBankByNum(num, label);
    this.update();
  };

  EngQuiz.prototype.markBank = function (opt) {
    var si = opt.getAttribute("data-bank");
    var label = opt.dataset.label;
    // 取消该选项在所有题中的选择（选项池通常一选）
    var self = this;
    this.allQs().forEach(function (q) {
      var p = self.picks[q.num];
      if (p && p.length === 1 && p[0] === label) {
        delete self.picks[q.num];
      }
    });
    $$(".q-opt", this.root).forEach(function (o) {
      o.classList.remove("sel");
      o.classList.remove("picked");
    });
    $$(".q-input", this.root).forEach(function (i) { i.value = ""; });
    this.update();
    void si;
  };

  EngQuiz.prototype.markBankByNum = function (num, label) {
    var card = this.root.querySelector('.q-card[data-num="' + num + '"]');
    if (!card || !card.closest(".q-body")) return;
    // 七选五的题目选项是「字母」，高亮选项池对应项
    if (!card.closest(".en-body")) return;
    var self = this;
    $$(".bank .q-opt", this.root).forEach(function (o) {
      o.classList.toggle("picked", o.dataset.label === label);
    });
    void self;
  };

  EngQuiz.prototype.correctLetters = function (q) {
    var head = ((q.answer || {}).head || "").trim();
    var seen = {};
    (head.match(/[A-Ga-g]/g) || []).forEach(function (c) {
      seen[c.toUpperCase()] = 1;
    });
    return Object.keys(seen).sort();
  };

  EngQuiz.prototype.norm = function (s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[\s’'"“”,，。．.、;；:：!！?？()（）\-—–_]/g, "");
  };

  EngQuiz.prototype.check = function (q) {
    var p = this.picks[q.num];
    if (q.type === "word") {
      var std = ((q.answer || {}).head || "").split("/")[0].trim();
      var mine = this.norm(p);
      if (!mine) return false;
      var ok = this.norm(std) === mine;
      if (!ok) {
        // 允许括号内的多选答案（如 who/that）
        var alts = ((q.answer || {}).head || "").split("/");
        ok = alts.some(function (a) {
          return this.norm(a) === mine;
        }, this);
      }
      return ok;
    }
    var right = this.correctLetters(q);
    var mine = (p || []).slice().sort();
    return (
      right.length > 0 &&
      right.length === mine.length &&
      right.every(function (L, i) { return L === mine[i]; })
    );
  };

  EngQuiz.prototype.ansHtml = function (q) {
    var a = q.answer || {};
    var html = '<div class="ans-head">📘 答案与解析';
    if ((a.head || "").trim()) {
      html += '<span class="ans-val">' + esc(a.head.trim()) + "</span>";
    }
    html += "</div>";
    html += '<div class="q-body">' + (a.body && a.body.length
      ? this.renderFrags(a.body)
      : "（本题为选择题，答案已标在上方；错题建议回原文定位依据句）") + "</div>";
    return html;
  };

  EngQuiz.prototype.update = function () {
    var qs = this.allQs();
    var done = qs.filter(function (q) {
      var p = this.picks[q.num];
      if (!p) return false;
      return Array.isArray(p) ? p.length > 0 : String(p).trim().length > 0;
    }, this).length;
    var el = $("#en-prog", this.root);
    if (el) el.textContent = done + " / " + qs.length;
  };

  /* 纯判定：只算对错，不动 DOM（统计用，避免泄露未提交题的答案） */
  EngQuiz.prototype.judge = function (q) {
    var p = this.picks[q.num];
    var answered = p &&
      (Array.isArray(p) ? p.length > 0 : String(p).trim().length > 0);
    if (!answered) return { ok: false, answered: false };
    return { ok: this.check(q), answered: true };
  };

  /* 判一道题并同步渲染该题卡片 */
  EngQuiz.prototype.judgeOne = function (q) {
    var card = this.root.querySelector('.q-card[data-num="' + q.num + '"]');
    var box = document.getElementById("en-ans-" + q.num);
    var stEl = document.getElementById("en-st-" + q.num);
    if (!card || !box) return null;

    var p = this.picks[q.num];
    var answered = p &&
      (Array.isArray(p) ? p.length > 0 : String(p).trim().length > 0);
    var ok = this.check(q);

    card.classList.remove("done", "wrong", "blank");
    if (answered) card.classList.add(ok ? "done" : "wrong");
    else card.classList.add("blank");

    if (q.type === "word") {
      var inp = card.querySelector(".q-input");
      if (inp) {
        inp.classList.remove("right", "miss");
        if (answered) inp.classList.add(ok ? "right" : "miss");
      }
    } else {
      var rls = this.correctLetters(q);
      var mine = (p || []).slice();
      $$(".q-opt", card).forEach(function (o) {
        var L = o.dataset.label;
        o.classList.remove("sel", "right", "miss");
        if (rls.indexOf(L) >= 0) o.classList.add("right");
        else if (mine.indexOf(L) >= 0) o.classList.add("miss");
      });
    }

    if (this.revealed[q.num]) {
      box.innerHTML = this.ansHtml(q);
      box.classList.add("on");
    } else {
      box.innerHTML = "";
      box.classList.remove("on");
    }

    if (stEl) {
      stEl.textContent = !answered ? "未作答" : (ok ? "✓ 答对" : "✗ 答错");
      stEl.className = "q-one-state " + (!answered ? "blank" : (ok ? "ok" : "bad"));
    }
    return { ok: !!ok, answered: !!answered };
  };

  /* 提交并显示某一道题（再点一次收起） */
  EngQuiz.prototype.submitOne = function (num) {
    var q = null;
    this.allQs().forEach(function (x) { if (x.num === num) q = x; });
    if (!q) return;
    var was = !!this.revealed[num];
    this.revealed[num] = !was;
    if (was) {
      var box = document.getElementById("en-ans-" + num);
      var card = this.root.querySelector('.q-card[data-num="' + num + '"]');
      var st = document.getElementById("en-st-" + num);
      if (box) {
        box.innerHTML = "";
        box.classList.remove("on");
      }
      if (card) card.classList.remove("done", "wrong", "blank");
      if (st) {
        st.textContent = "";
        st.className = "q-one-state";
      }
    } else {
      this.judgeOne(q);
    }
    this.refreshScore();
  };

  /* 提交整个大题 */
  EngQuiz.prototype.submitSection = function (si) {
    var self = this;
    var sec = this.data.sections[si];
    if (!sec) return;
    var nums = (sec.questions || []).map(function (q) { return q.num; });
    var r = 0;
    nums.forEach(function (n) {
      self.revealed[n] = true;
      var res = self.judgeOne(self.find(n));
      if (res && res.answered && res.ok) r++;
    });
    this.refreshScore();

    // 大题小结
    var head = this.root.querySelectorAll(".en-body > .grp-head")[si];
    if (head) {
      var tip = head.querySelector(".grp-tip");
      if (!tip) {
        tip = document.createElement("div");
        tip.className = "grp-tip";
        head.appendChild(tip);
      }
      tip.textContent = "本大题：已对 " + r + " / " + nums.length + " 题";
    }
  };

  EngQuiz.prototype.find = function (num) {
    var r = null;
    this.allQs().forEach(function (x) { if (x.num === num) r = x; });
    return r;
  };

  /* 刷新进度与得分 —— 只统计，不渲染标记 */
  EngQuiz.prototype.refreshScore = function () {
    var qs = this.allQs();
    var right = 0, answered = 0;
    qs.forEach(function (q) {
      var res = this.judge(q);
      if (res.answered) {
        answered++;
        if (res.ok) right++;
      }
    }, this);
    var prog = $("#en-prog", this.root);
    if (prog) prog.textContent = answered + " / " + qs.length;
    var sc = $("#en-score", this.root);
    if (sc) sc.innerHTML = right + "<small>/" + qs.length + "</small>";
    return { right: right, answered: answered, total: qs.length };
  };

  EngQuiz.prototype.submit = function () {
    var self = this;
    var qs = this.allQs();
    var wrong = [];
    var right = 0;
    var answered = 0;

    // 整卷提交：全部揭示答案，统一渲染
    qs.forEach(function (q) {
      self.revealed[q.num] = true;
      var res = self.judgeOne(q);
      if (res && res.answered) {
        answered++;
        if (res.ok) right++;
        else wrong.push(q.num);
      }
    });

    var total = qs.length;
    var pct = answered ? Math.round((right / answered) * 100) : 0;
    var blank = total - answered;
    var word =
      pct >= 90 ? "优秀 · 语感很好" :
      pct >= 75 ? "良好 · 稳步提升" :
      pct >= 60 ? "合格 · 巩固薄弱项" :
      pct >= 40 ? "待加强 · 对照解析重做" : "需加油 · 先回顾课文与语法";

    $("#en-score", this.root).innerHTML = right + "<small>/" + total + "</small>";
    $("#en-word", this.root).textContent = word;
    $("#en-detail", this.root).innerHTML =
      "已作答 <b>" + answered + "</b> 题，答对 <b>" + right + "</b> 题" +
      (answered ? "，正确率 <b>" + pct + "%</b>" : "") +
      (blank > 0 ? "，未作答 <b>" + blank + "</b> 题" : "") +
      (wrong.length
        ? "<br/>需回看的题号：" + wrong.map(function (n) {
            return '<a href="#en-ans-' + n + '" class="q-jump">' + n + "</a>";
          }).join(" ")
        : answered === total
        ? "<br/>全部答对，非常棒！"
        : "<br/>把没做的题补上吧。");

    // 写作：自动展开参考
    $$(".wc-ref", this.root).forEach(function (b) { b.classList.add("on"); });

    $("#en-result", this.root).classList.add("on");
    $("#en-result", this.root).scrollIntoView({
      behavior: "smooth", block: "center"
    });
  };

  EngQuiz.prototype.toggleAll = function (show) {
    var self = this;
    this.allQs().forEach(function (q) {
      var box = document.getElementById("en-ans-" + q.num);
      if (!box) return;
      if (!box.innerHTML.trim()) box.innerHTML = self.ansHtml(q);
      box.classList.toggle("on", show);
    });
  };

  EngQuiz.prototype.reset = function () {
    this.picks = {};
    this.revealed = {};
    this.build();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.EngQuiz = EngQuiz;
})();
