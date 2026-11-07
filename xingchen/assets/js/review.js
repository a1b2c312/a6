/* ==========================================================================
   逐题精讲渲染器（复用 quiz.css 的卡片 / 答题分布样式）
   用法： ReviewPage.init({ mount:"review-list", dataUrl:"...", dir:".../" })
   数据结构同 quiz.js：sections[].questions[] { num,type,stem[],answer{body[]},stats }
   ========================================================================== */
(function () {
  "use strict";

  var TYPE_LABEL = { choice: "单选", multi: "多选", fill: "填空", solve: "解答" };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* 片段：{"i":图片,"w":宽} | {"t":文字} | {"m":"$LaTeX$"} */
  function fragHtml(frags, dir) {
    return (frags || [])
      .map(function (f) {
        if (f.i !== undefined) {
          return (
            '<img class="rv-img" src="' + dir + encodeURI(f.i) +
            '" alt="题面" loading="lazy" title="点击放大" />'
          );
        }
        if (f.t !== undefined) return esc(f.t).replace(/\n/g, "<br/>");
        if (f.m !== undefined) return '<span class="tex">' + esc(f.m) + "</span>";
        return "";
      })
      .join("");
  }

  /* 答题分布面板（与 quiz.js statHtml 保持一致） */
  function statHtml(q) {
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
  }

  function ansHtml(q, dir) {
    var a = q.answer;
    if (!a) return "";
    var h = '<div class="ans-head">📘 答案与解析</div>';
    if (a.body && a.body.length) {
      h += '<div class="q-body">' + fragHtml(a.body, dir) + "</div>";
    } else if ((a.head || "").trim()) {
      h += '<div class="q-body">' + esc(a.head.trim()) + "</div>";
    } else {
      h += '<div class="q-body">（本题暂无文字解析，见页面下方参考答案页）</div>';
    }
    return h;
  }

  function hasAnswer(q) {
    return !!(q.answer && ((q.answer.body && q.answer.body.length) || (q.answer.head || "").trim()));
  }

  function cardHtml(q, dir) {
    var h = '<div class="q-card" data-num="' + q.num + '">';
    h += '<div class="q-head"><span class="q-no">' + q.num + "</span>" +
      '<span class="q-tag">' + (TYPE_LABEL[q.type] || "题") + "</span>" +
      '<span class="qb-spacer"></span>';
    if (hasAnswer(q)) h += '<button class="btn-mini rv-ansbtn" type="button">📖 答案与解析</button>';
    if (q.stats) h += '<button class="btn-mini stat" type="button">📊 答题分布</button>';
    h += "</div>";
    h += '<div class="q-stem">' + fragHtml(q.stem, dir) + "</div>";
    h += '<div class="q-ans rv-ans"></div>';
    h += '<div class="q-stat"></div>';
    h += "</div>";
    return h;
  }

  function findQ(data, num) {
    var r = null;
    data.sections.forEach(function (s) {
      s.questions.forEach(function (q) {
        if (String(q.num) === String(num)) r = q;
      });
    });
    return r;
  }

  function zoom(src) {
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
        if (e.key === "Escape") { box.classList.remove("on"); document.body.style.overflow = ""; }
      });
    }
    box.querySelector("img").src = src;
    box.classList.add("on");
    document.body.style.overflow = "hidden";
  }

  function init(cfg) {
    var dir = cfg.dir;
    var list = document.getElementById(cfg.mount);
    if (!list) return;
    fetch(cfg.dataUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var html = "";
        data.sections.forEach(function (sec) {
          var qs = sec.questions || [];
          if (!qs.length) return;
          html += '<div class="grp-head"><span class="gh-t">' + esc(sec.title || "") +
            '</span><span class="gh-n">' + qs.length + " 题</span></div>";
          html += qs.map(function (q) { return cardHtml(q, dir); }).join("");
        });
        list.innerHTML = html;

        list.addEventListener("click", function (e) {
          var stat = e.target.closest(".btn-mini.stat");
          if (stat) {
            var card = stat.closest(".q-card");
            var q = findQ(data, card.dataset.num);
            var box = card.querySelector(".q-stat");
            if (box.classList.contains("on")) { box.classList.remove("on"); box.innerHTML = ""; }
            else { box.innerHTML = statHtml(q); box.classList.add("on"); }
            stat.classList.toggle("on");
            return;
          }
          var ansBtn = e.target.closest(".rv-ansbtn");
          if (ansBtn) {
            var card2 = ansBtn.closest(".q-card");
            var q2 = findQ(data, card2.dataset.num);
            var ab = card2.querySelector(".rv-ans");
            if (ab.classList.contains("on")) { ab.classList.remove("on"); ab.innerHTML = ""; }
            else { ab.innerHTML = ansHtml(q2, dir); ab.classList.add("on"); }
            return;
          }
          var img = e.target.closest("img.rv-img");
          if (img) { zoom(img.src); return; }
        });
      })
      .catch(function () {
        list.innerHTML = '<div class="placeholder"><div class="ico">😢</div>' +
          '<div class="t">试卷加载失败</div><div class="d">请稍后重试。</div></div>';
      });
  }

  window.ReviewPage = { init: init, statHtml: statHtml };
})();
