/* ==========================================================================
   星辰班级网站 · 交互脚本
   ========================================================================== */

(function () {
  "use strict";

  /* 标记 JS 已启用：只有此时才允许 .reveal 初始隐藏，避免脚本缺失时页面空白 */
  document.documentElement.classList.add("js");

  /* ---------- 滚动入场动画 ---------- */
  var reveals = document.querySelectorAll(".reveal");

  if (reveals.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      );

      reveals.forEach(function (el, i) {
        el.style.transitionDelay = Math.min(i * 90, 360) + "ms";
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) {
        el.classList.add("in");
      });
    }
  }

  /* ---------- 视频：同一时间只播放一个 ---------- */
  var videos = Array.prototype.slice.call(document.querySelectorAll("video"));
  videos.forEach(function (v) {
    v.addEventListener("play", function () {
      videos.forEach(function (other) {
        if (other !== v && !other.paused) {
          other.pause();
        }
      });
    });
  });

  /* ---------- 锚点跳转时考虑顶部固定栏高度 ---------- */
  document.addEventListener("click", function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;

    var id = link.getAttribute("href").slice(1);
    if (!id) return;

    var target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.pageYOffset - 84;
    window.scrollTo({ top: top, behavior: "smooth" });
    history.replaceState(null, "", "#" + id);
  });

  /* ---------- 照片灯箱：点击放大 ---------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lbImg = lightbox.querySelector("img");
    var lbCap = lightbox.querySelector(".lb-cap");
    var lbClose = lightbox.querySelector(".lb-close");

    document.querySelectorAll(".photo-item").forEach(function (item) {
      item.addEventListener("click", function () {
        var img = item.querySelector("img");
        if (!img) return;
        lbImg.src = img.src;
        lbImg.alt = img.alt || "";
        lbCap.textContent = item.getAttribute("data-caption") || "";
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });

    function closeLb() {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
      lbImg.src = "";
    }

    lightbox.addEventListener("click", function (e) {
      // 点关闭按钮或图片以外的空白处关闭
      if (e.target === lightbox || e.target === lbClose) closeLb();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLb();
    });
  }
})();