// Before/after slider and a simple photo lightbox. No dependencies.
(function () {
  document.querySelectorAll("[data-compare]").forEach(function (box) {
    var range = box.querySelector("input[type=range]");
    var wrap = box.querySelector(".compare-before-wrap");
    var img = wrap.querySelector("img");
    var after = box.querySelector(".compare-after");
    function fit() {
      if (!after.naturalWidth) return;
      var r = after.naturalWidth / after.naturalHeight;
      box.style.aspectRatio = String(r);
      box.style.maxWidth = "min(100%, calc(80vh * " + r + "))";
      size();
    }
    function size() { img.style.width = box.clientWidth + "px"; }
    if (after.complete) fit(); else after.addEventListener("load", fit);
    function move() { wrap.style.width = range.value + "%"; }
    range.addEventListener("input", move);
    window.addEventListener("resize", size);
    size(); move();
  });

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a.lightbox-link");
    if (!link) return;
    e.preventDefault();
    var overlay = document.createElement("div");
    overlay.className = "lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Photo");
    var img = document.createElement("img");
    img.src = link.getAttribute("href");
    img.alt = (link.querySelector("img") || {}).alt || "";
    overlay.appendChild(img);
    function close() { overlay.remove(); document.removeEventListener("keydown", onKey); }
    function onKey(ev) { if (ev.key === "Escape") close(); }
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    document.body.appendChild(overlay);
  });
})();
