// Estado de la app + persistencia local (offline). Los recibos se guardan aparte (solo en el dispositivo).
import { iconName } from './icons.js';
const KEY = 'noxcount.v1';
const DEV = 'noxcount.device';

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => iso(new Date());
export const ymOf = (date) => date.slice(0, 7);
export const addDays = (date, n) => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const addMonthsYM = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
export const monthEnd = (ym) => { const [y, m] = ym.split('-').map(Number); return iso(new Date(y, m, 0)); };
export function addPeriod(date, freq) {
  if (freq === 'weekly') return addDays(date, 7);
  const [y, m, d] = date.split('-').map(Number);
  const ty = freq === 'yearly' ? y + 1 : y;
  const tm = freq === 'yearly' ? m : m + 1;
  const last = new Date(ty, tm, 0).getDate();
  return iso(new Date(ty, tm - 1, Math.min(d, last)));
}

const defCats = () => [
  ['food', 'utensils'], ['transport', 'bus'], ['rent', 'home'], ['services', 'bulb'], ['leisure', 'gamepad'], ['health', 'health'], ['edu', 'book'], ['shop', 'bag'], ['other', 'box'],
].map(([k, icon]) => ({ id: 'e_' + k, key: 'c_' + k, icon, type: 'expense' }))
  .concat([['salary', 'briefcase'], ['freelance', 'laptop'], ['invest', 'trending'], ['other', 'sparkles']].map(([k, icon]) => ({ id: 'i_' + k, key: 'i_' + k, icon, type: 'income' })));

export const defaultState = () => ({
  accounts: [{ id: 'a_cash', key: 'a_cash', kind: 'cash', initial: 0 }, { id: 'a_bank', key: 'a_bank', kind: 'bank', initial: 0 }],
  categories: defCats(), tx: [], recurring: [], budgets: {}, goals: [], debts: [], favorites: [],
  settings: { base: 'USD', rates: {}, income: 0, rule: { n: 50, w: 30, s: 20 }, incomeDay: 1 }, updatedAt: 0,
});
const migrate = (st) => {
  const d = defaultState();
  for (const k of ['favorites', 'settings']) if (!st[k]) st[k] = d[k];
  st.settings = { ...d.settings, ...st.settings, rates: st.settings.rates || {}, rule: { ...d.settings.rule, ...(st.settings.rule || {}) } };
  st.categories.forEach((c) => { c.icon = iconName(c.icon); }); // emojis antiguos -> vectores
  return st;
};

// ---- cifrado opcional en el dispositivo (AES-GCM, clave derivada del PIN con PBKDF2) ----
const ENC = 'noxcount.enc';
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
let cryptoKey = null, salt = null, chain = Promise.resolve();
async function derive(pin, saltBytes) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: saltBytes, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function encStr(text) { const iv = crypto.getRandomValues(new Uint8Array(12)); const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new TextEncoder().encode(text))); return b64(iv) + '.' + b64(c); }
async function decStr(str, key = cryptoKey) { const [iv, c] = str.split('.'); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, key, unb64(c))); }

let state;
const readPlain = () => { try { return migrate(JSON.parse(localStorage.getItem(KEY)) || defaultState()); } catch { return defaultState(); } };
export const isEncrypted = () => !!localStorage.getItem(ENC);
export const isLocked = () => isEncrypted() && !cryptoKey;
state = isEncrypted() ? defaultState() : readPlain(); // si está cifrado, se carga al desbloquear
const subs = new Set();
let saveHook = null;
export const get = () => state;
export const subscribe = (f) => subs.add(f);
export const onSave = (f) => { saveHook = f; };
function persist() {
  if (cryptoKey) {
    const snap = JSON.stringify(state);
    chain = chain.then(async () => { const [iv, c] = (await encStr(snap)).split('.'); localStorage.setItem(ENC, JSON.stringify({ salt: b64(salt), iv, c })); }).catch((e) => console.warn(e));
    return;
  }
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); }
}
export async function unlock(pin) {
  try {
    const box = JSON.parse(localStorage.getItem(ENC)), sl = unb64(box.salt), k = await derive(pin, sl);
    const st = migrate(JSON.parse(await decStr(box.iv + '.' + box.c, k)));
    cryptoKey = k; salt = sl; state = st; subs.forEach((f) => f(state)); return true;
  } catch { return false; }
}
export async function enableEncryption(pin) {
  salt = crypto.getRandomValues(new Uint8Array(16)); cryptoKey = await derive(pin, salt);
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('noxcount.r.'));
  for (const k of keys) { const v = localStorage.getItem(k); if (!v.startsWith('enc:')) localStorage.setItem(k, 'enc:' + (await encStr(v))); }
  persist(); await chain; localStorage.removeItem(KEY);
}
export async function disableEncryption() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('noxcount.r.'));
  for (const k of keys) { const v = localStorage.getItem(k); if (v.startsWith('enc:')) localStorage.setItem(k, await decStr(v.slice(4))); }
  localStorage.setItem(KEY, JSON.stringify(state)); localStorage.removeItem(ENC); cryptoKey = null; salt = null;
}
export function update(fn) { fn(state); state.updatedAt = Date.now(); persist(); subs.forEach((f) => f(state)); if (saveHook) saveHook(state); }
export function replace(s) { state = migrate(s); persist(); subs.forEach((f) => f(state)); }
export function reset() { state = defaultState(); state.updatedAt = Date.now(); persist(); Object.keys(localStorage).filter((k) => k.startsWith('noxcount.r.')).forEach((k) => localStorage.removeItem(k)); subs.forEach((f) => f(state)); if (saveHook) saveHook(state); }

// ajustes del dispositivo (idioma, PIN, notificaciones)
const dev = (() => { try { return JSON.parse(localStorage.getItem(DEV)) || {}; } catch { return {}; } })();
export const device = () => dev;
export const setDevice = (patch) => { Object.assign(dev, patch); try { localStorage.setItem(DEV, JSON.stringify(dev)); } catch {} };

// recibos (solo locales; cifrados si el cifrado está activo)
export async function getReceipt(id) {
  try { const v = localStorage.getItem('noxcount.r.' + id); if (!v) return null; return v.startsWith('enc:') ? await decStr(v.slice(4)) : v; } catch { return null; }
}
export async function setReceipt(id, data) {
  try { if (!data) localStorage.removeItem('noxcount.r.' + id); else localStorage.setItem('noxcount.r.' + id, cryptoKey ? 'enc:' + (await encStr(data)) : data); } catch { return false; }
  return true;
}

// monedas: cada cuenta tiene su moneda; los totales se convierten a la moneda base (settings.base)
export const baseCur = () => state.settings.base || 'USD';
export const rate = (cur) => (!cur || cur === baseCur() ? 1 : Number(state.settings.rates[cur]) || 1); // 1 {cur} = rate {base}
export const accCur = (id) => (state.accounts.find((a) => a.id === id)?.currency) || baseCur();
export const toBase = (amount, cur) => amount * rate(cur);
const txBase = (x) => toBase(x.amount, accCur(x.accountId));
export const sumTx = (list, type) => Math.round(list.filter((x) => x.type === type).reduce((a, x) => a + txBase(x), 0) * 100) / 100;
export function accountBalance(a, upTo) {
  let b = a.initial || 0;
  for (const x of state.tx) {
    if (upTo && x.date > upTo) continue;
    if (x.type === 'income' && x.accountId === a.id) b += x.amount;
    else if (x.type === 'expense' && x.accountId === a.id) b -= x.amount;
    else if (x.type === 'transfer') { if (x.accountId === a.id) b -= x.amount; if (x.toAccountId === a.id) b += x.toAmount ?? x.amount; }
  }
  return Math.round(b * 100) / 100;
}
export const totalBalance = (upTo) => Math.round(state.accounts.reduce((s, a) => s + toBase(accountBalance(a, upTo), a.currency), 0) * 100) / 100;
export const txInRange = (from, to) => state.tx.filter((x) => x.date >= from && x.date <= to).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created));
export const monthTx = (ym) => txInRange(ym + '-01', monthEnd(ym));
export function spentByCategory(ym) {
  const m = {};
  for (const x of monthTx(ym)) if (x.type === 'expense') m[x.categoryId] = (m[x.categoryId] || 0) + txBase(x);
  return m;
}
export const baseAmount = txBase;

// movimientos recurrentes: los automáticos se registran solos hasta hoy
export function runRecurring() {
  const t = today();
  if (!state.recurring.some((r) => r.auto && r.next <= t)) return false;
  update((s) => {
    for (const r of s.recurring) {
      let guard = 0;
      while (r.auto && r.next <= t && guard++ < 400) {
        s.tx.push({ id: uid(), type: r.type, amount: r.amount, date: r.next, accountId: r.accountId, categoryId: r.categoryId, note: r.note || '', tags: [], created: Date.now(), fromRecurring: r.id });
        r.next = addPeriod(r.next, r.freq);
      }
    }
  });
  return true;
}
