(function () {
  var list = document.getElementById("home-posts");
  if (!list) return;

  var limit = parseInt(list.getAttribute("data-page-size"), 10) || 8;
  var articles = Array.prototype.slice.call(list.querySelectorAll(".post-entry"));
  if (articles.length < 2) return;

  var dateBtn = document.querySelector('.home-sort__btn[data-sort="date"]');
  var likesBtn = document.querySelector('.home-sort__btn[data-sort="likes"]');
  var dateHint = document.querySelector("[data-date-hint]");
  var pager = document.getElementById("home-pager");
  var pageStatus = pager ? pager.querySelector("[data-page-status]") : null;
  var prevBtn = pager ? pager.querySelector('[data-page="prev"]') : null;
  var nextBtn = pager ? pager.querySelector('[data-page="next"]') : null;

  var mode = "date";
  var dateDir = "desc";
  var counts = {};
  var page = 1;

  function dateOf(el) {
    return parseInt(el.getAttribute("data-date"), 10) || 0;
  }

  function likesOf(el) {
    var id = el.getAttribute("data-like-id");
    if (!id || !Object.prototype.hasOwnProperty.call(counts, id)) return 0;
    return counts[id];
  }

  function compare(a, b) {
    if (mode === "likes") {
      var diff = likesOf(b) - likesOf(a);
      if (diff !== 0) return diff;
      return dateOf(b) - dateOf(a);
    }
    return dateDir === "asc" ? dateOf(a) - dateOf(b) : dateOf(b) - dateOf(a);
  }

  function pageCount() {
    return Math.max(1, Math.ceil(articles.length / limit));
  }

  function readPage() {
    var params = new URLSearchParams(window.location.search);
    var n = parseInt(params.get("pagina"), 10);
    if (!n || n < 1) return 1;
    return Math.min(n, pageCount());
  }

  function writePage(n, replace) {
    var url = new URL(window.location.href);
    if (n <= 1) url.searchParams.delete("pagina");
    else url.searchParams.set("pagina", String(n));
    var state = { homePage: n };
    if (replace) history.replaceState(state, "", url);
    else history.pushState(state, "", url);
  }

  function renderPager() {
    if (!pager) return;
    var pages = pageCount();
    pager.hidden = pages < 2;
    if (pageStatus) pageStatus.textContent = page + " / " + pages;
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= pages;
  }

  function apply(opts) {
    opts = opts || {};
    var sorted = articles.slice().sort(compare);
    var pages = pageCount();
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    var start = (page - 1) * limit;
    sorted.forEach(function (el, i) {
      list.appendChild(el);
      el.hidden = i < start || i >= start + limit;
    });
    renderPager();
    if (opts.scroll) {
      var anchor = document.querySelector(".home-sort") || list;
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function goTo(n, opts) {
    opts = opts || {};
    var next = Math.min(Math.max(n, 1), pageCount());
    var changed = next !== page;
    page = next;
    apply(opts);
    if (!changed) return;
    writePage(page, !!opts.replace);
  }

  function formatCount(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function paintCounts() {
    articles.forEach(function (el) {
      var slot = el.querySelector(".post-meta-likes__n");
      var wrap = el.querySelector(".post-meta-likes");
      if (!slot) return;
      var id = el.getAttribute("data-like-id");
      var n = id && Object.prototype.hasOwnProperty.call(counts, id) ? counts[id] : 0;
      slot.textContent = formatCount(n);
      if (wrap) {
        var label = n === 1 ? "1 curtida" : formatCount(n) + " curtidas";
        wrap.title = label;
        wrap.setAttribute("aria-label", label);
      }
    });
  }

  function setPressed(btn, on) {
    if (!btn) return;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function updateLabels() {
    var newest = dateDir === "desc";
    if (dateHint) dateHint.textContent = newest ? "mais novos" : "mais antigos";
    if (dateBtn) {
      dateBtn.setAttribute(
        "aria-label",
        newest
          ? "Publicação, dos mais novos aos mais antigos"
          : "Publicação, dos mais antigos aos mais novos"
      );
    }
    setPressed(dateBtn, mode === "date");
    setPressed(likesBtn, mode === "likes");
  }

  if (dateBtn) {
    dateBtn.addEventListener("click", function () {
      if (mode === "date") dateDir = dateDir === "desc" ? "asc" : "desc";
      else mode = "date";
      updateLabels();
      goTo(1);
    });
  }

  if (likesBtn) {
    likesBtn.addEventListener("click", function () {
      if (mode === "likes") return;
      mode = "likes";
      updateLabels();
      goTo(1);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (page > 1) goTo(page - 1, { scroll: true });
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (page < pageCount()) goTo(page + 1, { scroll: true });
    });
  }

  window.addEventListener("popstate", function () {
    page = readPage();
    apply({ scroll: true });
  });

  updateLabels();
  page = readPage();
  apply();
  writePage(page, true);

  if (typeof firebase === "undefined" || typeof firebaseConfig === "undefined") return;
  if (!articles.some(function (el) { return el.getAttribute("data-like-id"); })) return;

  var db = firebase.firestore();
  firebase
    .auth()
    .signInAnonymously()
    .then(function () {
      var ids = [];
      articles.forEach(function (el) {
        var id = el.getAttribute("data-like-id");
        if (id && ids.indexOf(id) === -1) ids.push(id);
      });
      return Promise.all(
        ids.map(function (id) {
          return db
            .collection("likes")
            .doc(id)
            .get()
            .then(function (doc) {
              counts[id] = doc.exists ? doc.data().likes || 0 : 0;
            })
            .catch(function () {
              counts[id] = 0;
            });
        })
      );
    })
    .then(function () {
      paintCounts();
      if (mode === "likes") apply();
    })
    .catch(function (err) {
      console.error(err.code, err.message);
      paintCounts();
    });
})();
