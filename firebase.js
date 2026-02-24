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
const EMPTY_DB = { clients: [], produits: [], magasins: [], commandes: [] };

let _firestore  = null;
let _docRef     = null;
let _listeners  = [];
let _ready      = false;
let _localMode  = false;

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
    s.onerror = function() { reject(new Error("Failed to load: " + src)); };
    document.head.appendChild(s);
  });
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
        log("New database created in Firestore.");
      }
      _ready = true;
      log("Firebase connected. Project: " + FIREBASE_CONFIG.projectId);
    } catch (err) {
      log("Firebase init failed — switching to LOCAL mode.", err);
      _localMode = true;
      _ready = true;
    }
  },

  subscribe: function(callback) {
    _listeners.push(callback);
    if (_localMode) {
      callback(this._loadLocal());
      return function() {
        _listeners = _listeners.filter(function(l) { return l !== callback; });
      };
    }
    var self = this;
    var unsub = _docRef.onSnapshot(
      function(snap) {
        if (snap.exists) {
          var data = Object.assign({}, EMPTY_DB, snap.data());
          callback(data);
        }
      },
      function(err) {
        log("Snapshot error — switching to LOCAL mode.", err);
        _localMode = true;
        callback(self._loadLocal());
      }
    );
    return function() {
      _listeners = _listeners.filter(function(l) { return l !== callback; });
      unsub();
    };
  },

  save: async function(data) {
    if (!_ready) return;
    if (_localMode) {
      this._saveLocal(data);
      return;
    }
    try {
      await _docRef.set(data);
    } catch (err) {
      log("Save failed — writing to localStorage as backup.", err);
      this._saveLocal(data);
    }
  },

  _saveLocal: function(data) {
    try { localStorage.setItem("sv5", JSON.stringify(data)); } catch (err) {}
  },

  _loadLocal: function() {
    try {
      var s = localStorage.getItem("sv5");
      return s ? Object.assign({}, EMPTY_DB, JSON.parse(s)) : Object.assign({}, EMPTY_DB);
    } catch(e) {
      return Object.assign({}, EMPTY_DB);
    }
  }
};

FirebaseDB.init();
