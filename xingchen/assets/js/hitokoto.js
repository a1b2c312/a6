/* ==========================================================================
   首页「一言」：从 hitokoto.cn 取一句，带本地缓存与失败退避
   --------------------------------------------------------------------------
   - 只请求一次文学 / 诗词 / 哲学分类，长度 10–24 字，适合做标题下的一句。
   - 浏览器本地缓存 30 分钟；请求失败后退避 5 分钟，避免反复打接口。
   - 任何异常都保留 HTML 里的兜底文案，不出现空白。
   - 按一言的使用建议，出处文字本身带 hitokoto.cn 链接（带 uuid），不再单列标签。
   ========================================================================== */
(function () {
  "use strict";

  var ENDPOINT =
    "https://v1.hitokoto.cn/?encode=json&charset=utf-8" +
    "&c=i&min_length=10&max_length=24";
  var CACHE_KEY = "xc_hitokoto_i";
  var FAIL_KEY = "xc_hitokoto_i_fail";
  var TTL = 30 * 60 * 1000;
  var FAIL_TTL = 5 * 60 * 1000;

  var box = document.getElementById("home-quote");
  if (!box) return;

  var textEl = box.querySelector(".quote-text");
  var fromEl = box.querySelector(".quote-from");
  if (!textEl || !fromEl) return;

  function read(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* 隐私模式下忽略 */
    }
  }

  function render(data) {
    if (!data || typeof data.hitokoto !== "string") return;
    var text = data.hitokoto.trim();
    if (!text) return;

    textEl.textContent = text;

    var who = data.from_who ? String(data.from_who).trim() : "";
    var from = data.from ? String(data.from).trim() : "";
    /* 「网络 / 原创 / 佚名」这类出处没有信息量，不展示 */
    if (/^(网络|互联网|原创|佚名|未知|暂无|一言)$/.test(from)) from = "";
    if (/^(网络|互联网|佚名|未知|暂无)$/.test(who)) who = "";
    var source = [who, from].filter(Boolean).join(" · ");
    if (source) {
      fromEl.textContent = "—— " + source;
      fromEl.hidden = false;
    } else {
      fromEl.hidden = true;
    }

    if (data.uuid) {
      fromEl.href = "https://hitokoto.cn?uuid=" + encodeURIComponent(String(data.uuid));
      fromEl.target = "_blank";
      fromEl.rel = "noopener";
    } else {
      fromEl.removeAttribute("href");
    }

    box.classList.add("is-ready");
  }

  var now = Date.now();
  var cached = read(CACHE_KEY);
  if (cached && cached.data && now - (cached.ts || 0) < TTL) {
    render(cached.data);
    return;
  }

  var failed = read(FAIL_KEY);
  if (failed && now - (failed.ts || 0) < FAIL_TTL) return;

  fetch(ENDPOINT, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function (data) {
      save(CACHE_KEY, { ts: Date.now(), data: data });
      render(data);
    })
    .catch(function () {
      save(FAIL_KEY, { ts: Date.now() });
      /* 保留兜底文案 */
    });
})();
