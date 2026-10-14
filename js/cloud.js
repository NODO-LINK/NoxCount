// Sincronización opcional con Firebase (Auth + Firestore con persistencia offline).
const V = '10.12.2';
const SRC = [`https://www.gstatic.com/firebasejs/${V}/firebase-app-compat.js`, `https://www.gstatic.com/firebasejs/${V}/firebase-auth-compat.js`, `https://www.gstatic.com/firebasejs/${V}/firebase-firestore-compat.js`];
let fb = null, auth = null, db = null, unsub = null;
export const configured = () => !!window.NOX_FIREBASE;
const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('No se pudo cargar ' + src)); document.head.appendChild(s); });

export async function init(onUser) {
  if (!configured()) return false;
  try {
    for (const s of SRC) await load(s);
    fb = window.firebase;
    fb.initializeApp(window.NOX_FIREBASE);
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
