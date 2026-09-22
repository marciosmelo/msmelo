(function () {
  if (typeof firebase === "undefined" || typeof firebaseConfig === "undefined") return;

  var app = firebase.initializeApp(firebaseConfig);
  var db = firebase.firestore();
  var auth = firebase.auth();

  var root = document.querySelector(".post-likes");
  if (!root) return;

  var oidLikes = root.getAttribute("data-oid-likes");
  if (!oidLikes) return;
  var idLikes = oidLikes.replaceAll("/", "-");

  var likedPage = false;
  var btn = document.getElementById("button_likes");
  var heart = document.getElementById("button_likes_heart");
  var empty = document.getElementById("button_likes_emtpty_heart");
  var countEl = document.getElementById(oidLikes);

  function setLikedUI(on) {
    likedPage = on;
    if (heart) heart.hidden = !on;
    if (empty) empty.hidden = on;
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
  }

  function numberWithCommas(x) {
    return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function likeArticle() {
    auth
      .signInAnonymously()
      .then(function () {
        var docRef = db.collection("likes").doc(idLikes);
        return docRef.get().then(function (doc) {
          setLikedUI(true);
          localStorage.setItem(idLikes, "true");
          if (doc.exists) {
            return docRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
          }
          return docRef.set({ likes: 1 });
        });
      })
      .catch(function (err) {
        console.error(err.code, err.message);
      });
  }

  function removeLikeArticle() {
    auth
      .signInAnonymously()
      .then(function () {
        var docRef = db.collection("likes").doc(idLikes);
        return docRef.get().then(function (doc) {
          setLikedUI(false);
          localStorage.removeItem(idLikes);
          if (doc.exists) {
            return docRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
          }
          return docRef.set({ likes: 0 });
        });
      })
      .catch(function (err) {
        console.error(err.code, err.message);
      });
  }

  if (localStorage.getItem(idLikes)) {
    setLikedUI(true);
  }

  if (btn) {
    btn.addEventListener("click", function () {
      if (!likedPage) likeArticle();
      else removeLikeArticle();
    });
  }

  auth
    .signInAnonymously()
    .then(function () {
      if (!countEl) return;
      db.collection("likes")
        .doc(idLikes)
        .onSnapshot(function (doc) {
          var data = doc.data();
          countEl.textContent = data ? numberWithCommas(data.likes || 0) : "0";
        });
    })
    .catch(function (err) {
      console.error(err.code, err.message);
      if (countEl) countEl.textContent = "0";
    });
})();
