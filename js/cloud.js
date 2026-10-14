// Sincronización opcional con Firebase (Auth + Firestore con persistencia offline).
const V = '10.12.2';
const SRC = [`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`, `https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`, `https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`];
let fb = null, auth = null, db = null, unsub = null;
// La configuración puede venir de firebase-config.js o pegada por el usuario dentro de la app (se guarda en este dispositivo).
const LS = 'noxcount.fbconfig';
const stored = () => { try { return JSON.parse(localStorage.getItem(LS)); } catch { return null; } };
export const cfg = () => window.NOX_FIREBASE || stored();
export const configured = () => !!cfg();
export const fromFile = () => !!window.NOX_FIREBASE;
export const ready = () => !!auth;
export const clearConfig = () => { try { localStorage.removeItem(LS); } catch {} };
// acepta JSON o el objeto de la consola de Firebase (const firebaseConfig = { apiKey: "...", ... })
export function saveConfig(text) {
  const o = {};
  for (const m of String(text).matchAll(/["']?(\w+)["']?\s*[:=]\s*["']([^"']*)["']/g)) o[m[1]] = m[2];
  const need = ['apiKey', 'authDomain', 'projectId', 'appId'].filter((k) => !o[k]);
  if (need.length) throw new Error('Falta: ' + need.join(', '));
  const keep = ['apiKey', 'authDomain', 'projectId', 'appId', 'storageBucket', 'messagingSenderId', 'measurementId'];
  const clean = Object.fromEntries(keep.filter((k) => o[k]).map((k) => [k, o[k]]));
  localStorage.setItem(LS, JSON.stringify(clean));
  return clean;
}
const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });

export async function init(onUser) {
  if (!configured()) return false;
  try {
    for (const s of SRC) await load(s);
    fb = window.firebase;
    fb.initializeApp(cfg());
    auth = fb.auth();
    db = fb.firestore();
    try { await db.enablePersistence({ synchronizeTabs: true }); } catch {}
    auth.onAuthStateChanged(onUser);
    return true;
  } catch (e) { console.warn(e); return false; }
}
export const signIn = (e, p) => auth.signInWithEmailAndPassword(e, p);
export const signUp = (e, p) => auth.createUserWithEmailAndPassword(e, p);
export const google = () => auth.signInWithPopup(new fb.auth.GoogleAuthProvider());
export const signOut = () => { if (unsub) unsub(); unsub = null; return auth.signOut(); };
export const user = () => (auth && auth.currentUser) || null;

const ref = () => db.collection('users').doc(user().uid);
export async function push(state) {
  if (!user()) return;
  await ref().set({ data: JSON.stringify(state), updatedAt: state.updatedAt || 0 });
}
export async function pull() {
  const snap = await ref().get();
  return snap.exists ? { state: JSON.parse(snap.data().data), updatedAt: snap.data().updatedAt } : null;
}
export function listen(cb) {
  if (unsub) unsub();
  unsub = ref().onSnapshot((snap) => { if (snap.exists && !snap.metadata.hasPendingWrites) cb(JSON.parse(snap.data().data)); });
}
