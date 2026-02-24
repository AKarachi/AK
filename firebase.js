// ═══════════════════════════════════════════════════════════════════════════
//  firebase.js — SALES.DB × Firebase Firestore
//  Replace localStorage with real-time cloud storage.
//
//  SETUP (3 steps):
//    1. Go to https://console.firebase.google.com
//    2. Create a project → Firestore Database → Start in test mode
//    3. Go to Project Settings → Your apps → Add web app
//       Copy your config values and paste them in the FIREBASE CONFIG section below
//
//  Then add this script to index.html BEFORE app.js:
//    <script src="firebase.js"></script>
// ═══════════════════════════════════════════════════════════════════════════


// ── FIREBASE CONFIG ──────────────────────────────────────────────────────────
// 🔴 Replace these values with your own from Firebase Console
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDwxR-0k4M5L0SCLaIjliKYR7yXeGUf1YI",
  authDomain: "database-c6307.firebaseapp.com",
  projectId: "database-c6307",
  storageBucket: "database-c6307.firebasestorage.app",
  messagingSenderId: "341076375686",
  appId: "1:341076375686:web:f346c9886b8323e4cb7907",
  measurementId: "G-DGJNE6X9KD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
};

// ── FIRESTORE COLLECTION NAME ────────────────────────────────────────────────
// All app data is stored in one document inside this collection.
// You can change this if you want multi-user support later.
const DB_COLLECTION = "salesdb";
const DB_DOCUMENT   = "main";


// ═══════════════════════════════════════════════════════════════════════════
//  INTERNAL SETUP — do not edit below unless you know what you're doing
// ═══════════════════════════════════════════════════════════════════════════

// Firebase SDK (loaded via CDN — added dynamically)
const FIREBASE_SDK_APP = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
const FIREBASE_SDK_FS  = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js";

// Empty data structure (mirrors EMPTY in app.js)
const EMPTY_DB = { clients: [], produits: [], magasins: [], commandes: [] };

// Internal state
let _firestore  = null;   // Firestore instance
let _docRef     = null;   // Reference to the main document
let _onSnapshot = null;   // Unsubscribe function for real-time listener
let _listeners  = [];     // List of callbacks to notify on data change
let _ready      = false;  // True once Firebase is initialized
let _localMode  = false;  // Fallback to localStorage if Firebase fails


// ── UTILITIES ────────────────────────────────────────────────────────────────

function log(msg, error) {
  const prefix = "[firebase.js]";
  if (error) console.error(prefix, msg, error);
  else       console.log(prefix, msg);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load: " + src));
    document.head.appendChild(s);
  });
}


// ── PUBLIC API ───────────────────────────────────────────────────────────────
//
//  These functions are used by app.js to read and write data.
//  They work whether Firebase is connected or in local fallback mode.
//
//  Usage in app.js:
//
//    // Replace:  const [db, setDb] = useState(loadDb);
//    // With:     const [db, setDb] = useState(EMPTY_DB);
//    //           useEffect(() => FirebaseDB.subscribe(setDb), []);
//
//    // Replace:  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(db)); }, [db]);
//    // With:     useEffect(() => { FirebaseDB.save(db); }, [db]);


const FirebaseDB = {

  /**
   * Initialize Firebase and start listening for data changes.
   * Called automatically when the script loads.
   */
  async init() {
    if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
      log("⚠ Firebase config not set. Running in LOCAL mode (localStorage).");
      _localMode = true;
      _ready = true;
      return;
    }

    try {
      await loadScript(FIREBASE_SDK_APP);
      await loadScript(FIREBASE_SDK_FS);

      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      _firestore = firebase.firestore();
      _docRef    = _firestore.collection(DB_COLLECTION).doc(DB_DOCUMENT);

      // Create document with empty data if it doesn't exist yet
      const snap = await _docRef.get();
      if (!snap.exists) {
        await _docRef.set(EMPTY_DB);
        log("✓ New database created in Firestore.");
      }

      _ready = true;
      log("✓ Firebase connected. Project: " + FIREBASE_CONFIG.projectId);

    } catch (err) {
      log("Firebase init failed — switching to LOCAL mode.", err);
      _localMode = true;
      _ready = true;
    }
  },

  /**
   * Subscribe to real-time data changes.
   * The callback is called immediately with current data, then on every change.
   *
   * @param {function} callback - Called with the full db object { clients, produits, magasins, commandes }
   * @returns {function} Unsubscribe function — call it in useEffect cleanup
   *
   * Example:
   *   useEffect(() => {
   *     const unsub = FirebaseDB.subscribe(data => setDb(data));
   *     return () => unsub();
   *   }, []);
   */
  subscribe(callback) {
    _listeners.push(callback);

    if (_localMode) {
      // Local mode: read from localStorage and notify once
      const data = this._loadLocal();
      callback(data);
      return () => {
        _listeners = _listeners.filter(l => l !== callback);
      };
    }

    // Firestore real-time listener
    const unsub = _docRef.onSnapshot(
      snap => {
        if (snap.exists) {
          const data = { ...EMPTY_DB, ...snap.data() };
          callback(data);
        }
      },
      err => {
        log("Snapshot error — switching to LOCAL mode.", err);
        _localMode = true;
        callback(this._loadLocal());
      }
    );

    _onSnapshot = unsub;
    return () => {
      _listeners = _listeners.filter(l => l !== callback);
      unsub();
    };
  },

  /**
   * Save the full database to Firestore (or localStorage in local mode).
   * Call this inside a useEffect whenever db state changes.
   *
   * @param {object} data - Full db object { clients, produits, magasins, commandes }
   *
   * Example:
   *   useEffect(() => { FirebaseDB.save(db); }, [db]);
   */
  async save(data) {
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

  /**
   * Export the entire database as a JSON file download.
   * Useful for backups before clearing browser data.
   */
  exportJSON() {
    if (_localMode) {
      const data = this._loadLocal();
      this._downloadJSON(data, "salesdb-export.json");
      return;
    }
    _docRef.get().then(snap => {
      if (snap.exists) this._downloadJSON(snap.data(), "salesdb-export.json");
    });
  },

  /**
   * Import a previously exported JSON backup into the database.
   * WARNING: This will overwrite all current data.
   *
   * @param {File} file - A .json file from exportJSON()
   * @param {function} onSuccess - Called after import completes
   * @param {function} onError - Called if import fails
   */
  importJSON(file, onSuccess, onError) {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        // Validate structure
        if (!data.clients || !data.commandes || !data.produits || !data.magasins) {
          throw new Error("Invalid backup file structure.");
        }
        await this.save(data);
        if (onSuccess) onSuccess(data);
        log("✓ Import successful.");
      } catch (err) {
        log("Import failed.", err);
        if (onError) onError(err);
      }
    };
    reader.readAsText(file);
  },

  /**
   * Wipe all data and reset to empty state.
   * WARNING: This is irreversible.
   */
  async reset() {
    await this.save(EMPTY_DB);
    log("⚠ Database reset to empty state.");
  },

  /**
   * Returns true if currently running in local (localStorage) mode.
   */
  isLocalMode() {
    return _localMode;
  },

  /**
   * Returns true if Firebase has finished initializing.
   */
  isReady() {
    return _ready;
  },


  // ── PRIVATE HELPERS ────────────────────────────────────────────────────────

  _saveLocal(data) {
    try {
      localStorage.setItem("sv5", JSON.stringify(data));
    } catch (err) {
      log("localStorage write failed.", err);
    }
  },

  _loadLocal() {
    try {
      const s = localStorage.getItem("sv5");
      return s ? { ...EMPTY_DB, ...JSON.parse(s) } : { ...EMPTY_DB };
    } catch {
      return { ...EMPTY_DB };
    }
  },

  _downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
};


// ── AUTO-INIT ─────────────────────────────────────────────────────────────────
// Firebase initializes as soon as this script is loaded.
FirebaseDB.init();


// ═══════════════════════════════════════════════════════════════════════════
//
//  HOW TO INTEGRATE INTO app.js
//  ─────────────────────────────
//
//  1. In index.html, add firebase.js BEFORE app.js:
//       <script src="firebase.js"></script>
//       <script src="app.js"></script>
//
//  2. In app.js, find the App() function and make these 2 changes:
//
//     BEFORE:
//       const [db, setDb] = useState(loadDb);
//       useEffect(() => {
//         try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
//       }, [db]);
//
//     AFTER:
//       const [db, setDb] = useState(EMPTY);
//       useEffect(() => FirebaseDB.subscribe(setDb), []);
//       useEffect(() => { FirebaseDB.save(db); }, [db]);
//
//  3. Fill in your FIREBASE_CONFIG at the top of this file.
//     Done! Your data now syncs to Firestore in real time.
//
//  NOTE: If FIREBASE_CONFIG is not filled in, the app automatically
//        falls back to localStorage — no data is lost.
//
// ═══════════════════════════════════════════════════════════════════════════
