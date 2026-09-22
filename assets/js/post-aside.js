(function () {
  var buttons = document.querySelectorAll(".post-aside__share");
  if (!buttons.length) return;

  function feedback(btn) {
    var tip = btn.parentElement && btn.parentElement.querySelector(".post-aside__copied");
    if (!tip) return;
    tip.hidden = false;
    window.setTimeout(function () {
      tip.hidden = true;
    }, 1800);
  }

  function copyUrl(url, btn) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        feedback(btn);
      });
      return;
    }
    var ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      feedback(btn);
    } finally {
      document.body.removeChild(ta);
    }
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var url = btn.getAttribute("data-share-url") || window.location.href;
      var title = btn.getAttribute("data-share-title") || document.title;
      if (navigator.share) {
        navigator
          .share({ title: title, url: url })
          .catch(function () {
            copyUrl(url, btn);
          });
        return;
      }
      copyUrl(url, btn);
    });
  });
})();
