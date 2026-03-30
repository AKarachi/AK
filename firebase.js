// ── FIREBASE CONFIG ──────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDwxR-0k4M5L0SCLaIjliKYR7yXeGUf1YI",
  authDomain:        "database-c6307.firebaseapp.com",
  projectId:         "database-c6307",
  storageBucket:     "database-c6307.firebasestorage.app",
  messagingSenderId: "341076375686",
  appId:             "1:341076375686:web:f346c9886b8323e4cb7907"
};

const DB_COLLECTION = "salesdb";
const DB_DOCUMENT   = "main";
const FIREBASE_SDK_APP = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
const FIREBASE_SDK_FS  = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js";
const EMPTY_DB = { clients: [], produits: [], magasins: [], commandes: [], transferts: [], approvHist: [], stockLogs: [] };

let _firestore   = null;
let _docRef      = null;
let _ready       = false;
let _pendingSubs = [];

function log(msg, error) {
  var prefix = "[firebase.js]";
  if (error) console.error(prefix, msg, error);
  else       console.log(prefix, msg);
}

function loadScript(src) {
  return new Promise(function(resolve, reject) {
    var s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = function() { reject(new Error("Impossible de charger: " + src)); };
    document.head.appendChild(s);
  });
}

// Affiche un message d'erreur bloquant dans la page
function showFatalError(msg) {
  var div = document.createElement("div");
  div.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:#0d0d1a;display:flex;align-items:center;justify-content:center;z-index:9999;";
  div.innerHTML = '<div style="background:#1a1a26;border:1px solid #c00;border-radius:12px;padding:32px;max-width:480px;text-align:center;font-family:sans-serif;">'
    + '<div style="font-size:32px;margin-bottom:16px;">⚠️</div>'
    + '<div style="color:#ff6b6b;font-size:18px;font-weight:700;margin-bottom:12px;">Connexion Firebase impossible</div>'
    + '<div style="color:#888;font-size:13px;line-height:1.6;">' + msg + '</div>'
    + '<button onclick="location.reload()" style="margin-top:20px;background:#5b5bf6;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:14px;">🔄 Réessayer</button>'
    + '</div>';
  document.body.appendChild(div);
}

var FirebaseDB = {

  init: async function() {
    try {
      await loadScript(FIREBASE_SDK_APP);
      await loadScript(FIREBASE_SDK_FS);
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      _firestore = firebase.firestore();
      _docRef    = _firestore.collection(DB_COLLECTION).doc(DB_DOCUMENT);
      var snap = await _docRef.get();
      if (!snap.exists) {
        await _docRef.set(EMPTY_DB);
        log("Nouvelle base de données créée dans Firestore.");
      }
      _ready = true;
      log("Firebase connecté. Projet: " + FIREBASE_CONFIG.projectId);

      _pendingSubs.forEach(function(cb) {
        FirebaseDB._attachSnapshot(cb);
      });
      _pendingSubs = [];

    } catch (err) {
      log("Échec connexion Firebase.", err);
      showFatalError(
        "Impossible de se connecter à Firebase.<br><br>"
        + "<strong style='color:#fff'>Vérifiez :</strong><br>"
        + "• Votre connexion Internet<br>"
        + "• Que gstatic.com est accessible<br>"
        + "• Les règles Firestore dans la console Firebase<br><br>"
        + "<span style='color:#555;font-size:11px'>" + (err && err.message ? err.message : "") + "</span>"
      );
      // Ne pas appeler les subscribers — l'app reste bloquée
      _pendingSubs = [];
    }
  },

  _attachSnapshot: function(callback) {
    _docRef.onSnapshot(
      function(snap) {
        if (snap.exists) {
          var data = Object.assign({}, EMPTY_DB, snap.data());
          callback(data);
        }
      },
      function(err) {
        log("Erreur snapshot Firestore.", err);
        showFatalError(
          "La connexion à Firebase a été interrompue.<br><br>"
          + "<span style='color:#555;font-size:11px'>" + (err && err.message ? err.message : "") + "</span>"
        );
      }
    );
  },

  subscribe: function(callback) {
    if (_ready && _docRef) {
      this._attachSnapshot(callback);
    } else {
      _pendingSubs.push(callback);
    }
    return function() {};
  },

  save: async function(data) {
    if (!_ready || !_docRef) {
      log("Save ignoré — Firebase non prêt.");
      return;
    }
    try {
      await _docRef.set(data);
    } catch (err) {
      log("Échec sauvegarde Firebase.", err);
      showFatalError(
        "Impossible de sauvegarder dans Firebase.<br><br>"
        + "<span style='color:#555;font-size:11px'>" + (err && err.message ? err.message : "") + "</span>"
      );
    }
  }
};

FirebaseDB.init();
