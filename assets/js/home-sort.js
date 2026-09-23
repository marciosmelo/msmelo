(function () {
  var list = document.getElementById("home-posts");
  if (!list) return;

  var limit = parseInt(list.getAttribute("data-limit"), 10) || 5;
  var articles = Array.prototype.slice.call(list.querySelectorAll(".post-entry"));
  if (articles.length < 2) return;

  var dateBtn = document.querySelector('.home-sort__btn[data-sort="date"]');
  var likesBtn = document.querySelector('.home-sort__btn[data-sort="likes"]');
  var dateHint = document.querySelector("[data-date-hint]");

  var mode = "date";
  var dateDir = "desc";
  var counts = {};

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

  function apply() {
    var sorted = articles.slice().sort(compare);
    sorted.forEach(function (el, i) {
      list.appendChild(el);
      el.hidden = i >= limit;
    });
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
      apply();
    });
  }

  if (likesBtn) {
    likesBtn.addEventListener("click", function () {
      if (mode === "likes") return;
      mode = "likes";
      updateLabels();
      apply();
    });
  }

  updateLabels();

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
