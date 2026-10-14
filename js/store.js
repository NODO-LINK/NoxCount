// Estado de la app + persistencia local (offline). Los recibos se guardan aparte (solo en el dispositivo).
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
  ['food', '🍽️'], ['transport', '🚌'], ['rent', '🏠'], ['services', '💡'], ['leisure', '🎮'], ['health', '🩺'], ['edu', '📚'], ['shop', '🛍️'], ['other', '📦'],
].map(([k, icon]) => ({ id: 'e_' + k, key: 'c_' + k, icon, type: 'expense' }))
  .concat([['salary', '💼'], ['freelance', '🧑‍💻'], ['invest', '📈'], ['other', '✨']].map(([k, icon]) => ({ id: 'i_' + k, key: 'i_' + k, icon, type: 'income' })));

export const defaultState = () => ({
  accounts: [{ id: 'a_cash', key: 'a_cash', kind: 'cash', initial: 0 }, { id: 'a_bank', key: 'a_bank', kind: 'bank', initial: 0 }],
  categories: defCats(), tx: [], recurring: [], budgets: {}, goals: [], debts: [], updatedAt: 0,
});

let state;
try { state = JSON.parse(localStorage.getItem(KEY)) || defaultState(); } catch { state = defaultState(); }
const subs = new Set();
let saveHook = null;
export const get = () => state;
export const subscribe = (f) => subs.add(f);
export const onSave = (f) => { saveHook = f; };
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('No se pudo guardar', e); } }
export function update(fn) { fn(state); state.updatedAt = Date.now(); persist(); subs.forEach((f) => f(state)); if (saveHook) saveHook(state); }
export function replace(s) { state = s; persist(); subs.forEach((f) => f(state)); }
export function reset() { state = defaultState(); state.updatedAt = Date.now(); persist(); Object.keys(localStorage).filter((k) => k.startsWith('noxcount.r.')).forEach((k) => localStorage.removeItem(k)); subs.forEach((f) => f(state)); if (saveHook) saveHook(state); }

// ajustes del dispositivo (idioma, PIN, notificaciones)
const dev = (() => { try { return JSON.parse(localStorage.getItem(DEV)) || {}; } catch { return {}; } })();
export const device = () => dev;
export const setDevice = (patch) => { Object.assign(dev, patch); try { localStorage.setItem(DEV, JSON.stringify(dev)); } catch {} };

// recibos (solo locales)
export const getReceipt = (id) => { try { return localStorage.getItem('noxcount.r.' + id); } catch { return null; } };
export const setReceipt = (id, data) => { try { data ? localStorage.setItem('noxcount.r.' + id, data) : localStorage.removeItem('noxcount.r.' + id); } catch { return false; } return true; };

// cálculos
export const sumTx = (list, type) => list.filter((x) => x.type === type).reduce((a, x) => a + x.amount, 0);
export function accountBalance(a, upTo) {
  let b = a.initial || 0;
  for (const x of state.tx) {
    if (upTo && x.date > upTo) continue;
    if (x.type === 'income' && x.accountId === a.id) b += x.amount;
    else if (x.type === 'expense' && x.accountId === a.id) b -= x.amount;
    else if (x.type === 'transfer') { if (x.accountId === a.id) b -= x.amount; if (x.toAccountId === a.id) b += x.amount; }
  }
  return Math.round(b * 100) / 100;
}
export const totalBalance = (upTo) => Math.round(state.accounts.reduce((s, a) => s + accountBalance(a, upTo), 0) * 100) / 100;
export const txInRange = (from, to) => state.tx.filter((x) => x.date >= from && x.date <= to).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.created - a.created));
export const monthTx = (ym) => txInRange(ym + '-01', monthEnd(ym));
export function spentByCategory(ym) {
  const m = {};
  for (const x of monthTx(ym)) if (x.type === 'expense') m[x.categoryId] = (m[x.categoryId] || 0) + x.amount;
  return m;
}

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
