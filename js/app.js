import * as S from './store.js';
import { t, setLang, getLang, money, monthName, dayName } from './i18n.js';
import * as Ch from './charts.js';
import * as Cloud from './cloud.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const V = { tab: 'home', sub: null, ym: S.today().slice(0, 7), from: null, to: null };

const catName = (c) => (c ? c.name || t(c.key) : '—');
const accName = (a) => (a ? a.name || t(a.key) : '—');
const catById = (id) => S.get().categories.find((c) => c.id === id);
const accById = (id) => S.get().accounts.find((a) => a.id === id);
const cls = (type) => (type === 'income' ? 'inc' : type === 'expense' ? 'exp' : 'muted');
const sign = (type) => (type === 'income' ? '+' : type === 'expense' ? '−' : '↔');

function toast(msg) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 3200); }
async function notify(kind, title, body) {
  toast(body ? `${title}: ${body}` : title);
  const n = S.device().notif || {};
  if (!n[kind] || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try { const reg = await navigator.serviceWorker?.getRegistration(); reg ? reg.showNotification(title, { body, icon: 'icons/icon-192.png' }) : new Notification(title, { body }); } catch {}
}

// ---------- modal ----------
function modal(html, mount) {
  const m = $('#modal');
  m.innerHTML = `<div class="sheet">${html}</div>`;
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  mount && mount(m);
}
function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; render(); }
const fld = (label, inner) => `<label>${label}${inner}</label>`;
const opts = (list, sel, fn) => list.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(fn(x))}</option>`).join('');

// ---------- navegación ----------
function renderNav() {
  const items = [['home', '🏠', t('home')], ['moves', '🧾', t('moves')], ['add', '+', ''], ['reports', '📊', t('reports')], ['more', '☰', t('more')]];
  $('#nav').innerHTML = items.map(([k, i, l]) => k === 'add' ? `<button class="fab" data-act="newTx" aria-label="${t('newMove')}">+</button>` : `<button class="${V.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}"><span>${i}</span>${l}</button>`).join('');
}
function render() {
  document.title = 'NoxCount';
  const views = { home, moves, reports, plan, more };
  $('#view').innerHTML = (views[V.tab] || home)();
  renderNav();
}

// ---------- vistas ----------
function monthNav() {
  return `<div class="mnav noprint"><button data-act="mPrev">‹</button><b>${monthName(V.ym)}</b><button data-act="mNext">›</button></div>`;
}
function txRow(x) {
  const c = catById(x.categoryId), a = accById(x.accountId), b = accById(x.toAccountId);
  const title = x.type === 'transfer' ? `${accName(a)} → ${accName(b)}` : catName(c);
  return `<div class="item" data-act="editTx" data-id="${x.id}"><div class="ico">${x.type === 'transfer' ? '🔁' : c ? c.icon : '❔'}</div>
    <div class="grow"><div class="ellip">${esc(title)}</div><div class="muted ellip" style="font-size:.8rem">${esc(x.note || '')} ${(x.tags || []).map((g) => `<span class="tag">#${esc(g)}</span>`).join('')}${x.type !== 'transfer' ? ' · ' + esc(accName(a)) : ''}</div></div>
    <b class="${cls(x.type)}">${sign(x.type)}${money(x.amount)}</b></div>`;
}
function bar(val, max) {
  const p = max ? Math.min(100, (val / max) * 100) : 0;
  return `<div class="bar"><i class="${val > max ? 'over' : p >= 80 ? 'near' : ''}" style="width:${p}%"></i></div>`;
}
function progress(label, icon, val, max) {
  return `<div style="margin:10px 0"><div class="row sp"><span>${icon} ${esc(label)}</span><span class="muted">${money(val)} ${t('of')} ${money(max)}</span></div>${bar(val, max)}</div>`;
}
function dueList() {
  const s = S.get(), lim = S.addDays(S.today(), 7), out = [];
  s.debts.filter((d) => !d.paid && d.due && d.due <= lim).forEach((d) => out.push({ date: d.due, text: `${d.dir === 'owe' ? '💸' : '💰'} ${d.who}`, amount: d.amount }));
  s.recurring.filter((r) => r.next <= lim && r.type === 'expense').forEach((r) => out.push({ date: r.next, text: `🔁 ${r.note || catName(catById(r.categoryId))}`, amount: r.amount, rid: r.id }));
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function home() {
  const s = S.get(), ym = S.today().slice(0, 7), mt = S.monthTx(ym);
  const inc = S.sumTx(mt, 'income'), exp = S.sumTx(mt, 'expense');
  const spent = S.spentByCategory(ym);
  const bud = Object.entries(s.budgets).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v, p: (spent[id] || 0) / v })).sort((a, b) => b.p - a.p).slice(0, 4);
  const d7 = S.sumTx(S.txInRange(S.addDays(S.today(), -6), S.today()), 'expense'), p7 = S.sumTx(S.txInRange(S.addDays(S.today(), -13), S.addDays(S.today(), -7)), 'expense');
  const delta = p7 ? `${d7 >= p7 ? '+' : ''}${Math.round(((d7 - p7) / p7) * 100)}%` : '—';
  const due = dueList();
  return `<h1>NoxCount ${syncBadge()}</h1>
  <div class="card hero"><div class="muted">${t('balance')}</div><div class="big">${money(S.totalBalance())}</div></div>
  <div class="grid2"><div class="card"><div class="muted">${t('income')} · ${t('thisMonth')}</div><b class="inc">${money(inc)}</b></div><div class="card"><div class="muted">${t('expense')} · ${t('thisMonth')}</div><b class="exp">${money(exp)}</b></div></div>
  <h2>${t('weekly')}</h2><div class="card">${t('weeklyText', { a: money(d7), d: delta })}</div>
  <h2>${t('budgets')}</h2><div class="card">${bud.length ? bud.map((b) => progress(catName(catById(b.id)), catById(b.id)?.icon || '', spent[b.id] || 0, b.v)).join('') : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('goals')}</h2><div class="card">${s.goals.length ? s.goals.map((g) => progress(g.name, '🎯', g.saved, g.target)).join('') : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('upcoming')}</h2><div class="card">${due.length ? due.map((d) => `<div class="row sp" style="padding:6px 0"><span>${esc(d.text)}<br><small class="muted">${dayName(d.date)}</small></span><b>${money(d.amount)}</b></div>`).join('') : `<span class="muted">${t('nothing')}</span>`}</div>`;
}

function moves() {
  if (!V.from) { V.from = V.ym + '-01'; V.to = S.monthEnd(V.ym); }
  const list = S.txInRange(V.from, V.to);
  let last = '';
  const rows = list.map((x) => { const h = x.date !== last ? `<div class="day">${dayName(x.date)}</div>` : ''; last = x.date; return h + txRow(x); }).join('');
  const inc = S.sumTx(list, 'income'), exp = S.sumTx(list, 'expense');
  return `<h1>${t('moves')}</h1>
  <div class="card"><div class="grid2" style="gap:8px"><div>${fld(t('from'), `<input type="date" id="f-from" value="${V.from}">`)}</div><div>${fld(t('to'), `<input type="date" id="f-to" value="${V.to}">`)}</div></div>
  <button class="btn ghost sm" data-act="thisMonth">${t('thisMonth')}</button></div>
  <div class="grid2"><div class="card"><span class="muted">${t('income')}</span><br><b class="inc">${money(inc)}</b></div><div class="card"><span class="muted">${t('expense')}</span><br><b class="exp">${money(exp)}</b></div></div>
  <div class="card" style="margin-top:12px">${rows || `<span class="muted">${t('nothing')}</span>`}</div>`;
}

function reports() {
  const s = S.get(), ym = V.ym, mt = S.monthTx(ym), prev = S.addMonthsYM(ym, -1), pt = S.monthTx(prev);
  const sp = S.spentByCategory(ym);
  const data = Object.entries(sp).sort((a, b) => b[1] - a[1]).map(([id, value], i) => ({ label: catName(catById(id)), icon: catById(id)?.icon || '', value, color: Ch.PALETTE[i % Ch.PALETTE.length] }));
  const total = data.reduce((a, d) => a + d.value, 0);
  const rows = [], pts = [];
  for (let i = 5; i >= 0; i--) { const m = S.addMonthsYM(ym, -i), x = S.monthTx(m); rows.push({ label: monthName(m).slice(0, 3), inc: S.sumTx(x, 'income'), exp: S.sumTx(x, 'expense') }); }
  for (let i = 11; i >= 0; i--) { const m = S.addMonthsYM(ym, -i); pts.push({ label: monthName(m).slice(0, 3), v: S.totalBalance(S.monthEnd(m)) }); }
  const cmp = (cur, old) => { const d = cur - old; return old ? `${d >= 0 ? '+' : ''}${Math.round((d / old) * 100)}%` : '—'; };
  const ci = S.sumTx(mt, 'income'), ce = S.sumTx(mt, 'expense'), pi = S.sumTx(pt, 'income'), pe = S.sumTx(pt, 'expense');
  return `<h1>${t('reports')}</h1>${monthNav()}
  <h2>${t('byCategory')}</h2><div class="card row">${total ? `${Ch.donut(data)}<div class="legend grow">${data.map((d) => `<div><i style="background:${d.color}"></i><span class="grow ellip">${d.icon} ${esc(d.label)}</span><b>${Math.round((d.value / total) * 100)}%</b></div>`).join('')}</div>` : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('byMonth')}</h2><div class="card">${Ch.bars(rows)}</div>
  <h2>${t('trend')}</h2><div class="card">${Ch.line(pts)}</div>
  <h2>${t('compare')}</h2><div class="card">
    <div class="row sp"><span>${t('income')}</span><span><b class="inc">${money(ci)}</b> <small class="muted">${cmp(ci, pi)} ${t('vs')}</small></span></div>
    <div class="row sp" style="margin-top:8px"><span>${t('expense')}</span><span><b class="exp">${money(ce)}</b> <small class="muted">${cmp(ce, pe)} ${t('vs')}</small></span></div>
    <div class="row sp" style="margin-top:8px"><span>${t('total')}</span><b>${money(ci - ce)}</b></div></div>
  <button class="btn noprint" data-act="print">📄 ${t('print')}</button>`;
}

function plan() {
  const s = S.get(), sp = S.spentByCategory(V.ym);
  const ex = s.categories.filter((c) => c.type === 'expense');
  return `<h1>${t('plan')}</h1>${monthNav()}
  <h2>${t('budgets')}</h2><div class="card">${ex.map((c) => { const b = s.budgets[c.id] || 0; return `<div class="item" data-act="editBudget" data-id="${c.id}"><div class="ico">${c.icon}</div><div class="grow">${esc(catName(c))}${b ? `<div class="row sp"><span class="muted">${money(sp[c.id] || 0)} ${t('of')} ${money(b)}</span></div>${bar(sp[c.id] || 0, b)}` : `<div class="muted" style="font-size:.8rem">${money(sp[c.id] || 0)} · ${t('add')} ${t('budget').toLowerCase()}</div>`}</div></div>`; }).join('')}</div>
  <h2>${t('goals')}</h2><div class="card">${s.goals.map((g) => `<div class="item" data-act="editGoal" data-id="${g.id}"><div class="ico">🎯</div><div class="grow">${progress(g.name, '', g.saved, g.target)}</div></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}
  <button class="btn ghost" style="margin-top:10px" data-act="newGoal">+ ${t('goals')}</button></div>`;
}

function more() {
  const s = S.get();
  const back = `<button class="btn ghost sm" data-act="sub" data-id="">‹ ${t('more')}</button>`;
  if (!V.sub) {
    return `<h1>${t('more')}</h1><div class="card menu">${[['accounts', '🏦'], ['debts', '🤝'], ['recurring', '🔁'], ['categories', '🏷️'], ['settings', '⚙️']].map(([k, i]) => `<div class="item" data-act="sub" data-id="${k}"><div class="ico">${i}</div><div class="grow">${t(k)}</div><span class="chev">›</span></div>`).join('')}</div>`;
  }
  if (V.sub === 'accounts') {
    return `${back}<h1>${t('accounts')}</h1><div class="card">${s.accounts.map((a) => `<div class="item" data-act="editAcc" data-id="${a.id}"><div class="ico">${{ cash: '💵', bank: '🏦', wallet: '📱' }[a.kind]}</div><div class="grow">${esc(accName(a))}<br><small class="muted">${t(a.kind)}</small></div><b>${money(S.accountBalance(a))}</b></div>`).join('')}
    <button class="btn" style="margin-top:10px" data-act="newAcc">+ ${t('accounts')}</button></div>`;
  }
  if (V.sub === 'debts') {
    const row = (d) => `<div class="item" data-act="editDebt" data-id="${d.id}"><div class="ico">${d.dir === 'owe' ? '💸' : '💰'}</div><div class="grow"><span style="${d.paid ? 'text-decoration:line-through' : ''}">${esc(d.who)}</span><br><small class="muted">${d.paid ? t('paid') : d.due ? t('due') + ' ' + dayName(d.due) : t('pending')}</small></div><b class="${d.dir === 'owe' ? 'exp' : 'inc'}">${money(d.amount)}</b></div>`;
    const tot = (dir) => s.debts.filter((d) => d.dir === dir && !d.paid).reduce((a, d) => a + d.amount, 0);
    return `${back}<h1>${t('debts')}</h1><div class="grid2"><div class="card"><span class="muted">${t('iOwe')}</span><br><b class="exp">${money(tot('owe'))}</b></div><div class="card"><span class="muted">${t('theyOwe')}</span><br><b class="inc">${money(tot('owed'))}</b></div></div>
    <div class="card" style="margin-top:12px">${s.debts.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newDebt">+ ${t('debts')}</button></div>`;
  }
  if (V.sub === 'recurring') {
    const row = (r) => { const due = r.next <= S.today(); return `<div class="item" data-act="editRec" data-id="${r.id}"><div class="ico">${catById(r.categoryId)?.icon || '🔁'}</div><div class="grow">${esc(r.note || catName(catById(r.categoryId)))}<br><small class="muted">${t(r.freq + 'F')} · ${dayName(r.next)}${r.auto ? ' · auto' : ''}</small></div><div style="text-align:right"><b class="${cls(r.type)}">${money(r.amount)}</b>${due && !r.auto ? `<br><button class="btn sm" data-act="confirmRec" data-id="${r.id}">${t('confirm')}</button>` : ''}</div></div>`; };
    return `${back}<h1>${t('recurring')}</h1><div class="card">${s.recurring.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newRec">+ ${t('recurring')}</button></div>`;
  }
  if (V.sub === 'categories') {
    const block = (type) => `<h2>${t(type)}</h2><div class="card">${s.categories.filter((c) => c.type === type).map((c) => `<div class="item" data-act="editCat" data-id="${c.id}"><div class="ico">${c.icon}</div><div class="grow">${esc(catName(c))}</div></div>`).join('')}<button class="btn ghost" style="margin-top:10px" data-act="newCat" data-id="${type}">+ ${t('add')}</button></div>`;
    return `${back}<h1>${t('categories')}</h1>${block('expense')}${block('income')}`;
  }
  if (V.sub === 'settings') {
    const d = S.device(), n = d.notif || {}, u = Cloud.user();
    const tg = (k, l) => `<div class="toggle"><span>${l}</span><input type="checkbox" data-act="notif" data-id="${k}" ${n[k] ? 'checked' : ''}></div>`;
    return `${back}<h1>${t('settings')}</h1>
    <div class="card">${fld(t('language'), `<select id="s-lang"><option value="es" ${getLang() === 'es' ? 'selected' : ''}>Español</option><option value="en" ${getLang() === 'en' ? 'selected' : ''}>English</option></select>`)}</div>
    <h2>${t('pin')}</h2><div class="card">${d.pin ? `<button class="btn danger" data-act="rmPin">${t('removePin')}</button>` : `<button class="btn ghost" data-act="setPin">${t('setPin')}</button>`}</div>
    <h2>${t('notifs')}</h2><div class="card">${tg('due', t('nDue'))}${tg('budget', t('nBudget'))}${tg('summary', t('nSummary'))}</div>
    <h2>${t('cloud')}</h2><div class="card">${!Cloud.configured() ? `<span class="muted">${t('cloudOff')}</span>` : u ? `<div>${esc(u.email || '')}</div><div class="muted" style="margin:6px 0">${syncText()}</div><button class="btn ghost" data-act="signOut">${t('signOut')}</button>` : `<button class="btn" data-act="authOpen">${t('signIn')}</button>`}</div>
    <h2></h2><button class="btn danger" data-act="reset">${t('reset')}</button>`;
  }
  return '';
}

// ---------- formularios ----------
function txForm(x) {
  const s = S.get();
  const cur = x || { type: 'expense', amount: '', date: S.today(), accountId: s.accounts[0]?.id, categoryId: '', note: '', tags: [] };
  const rcp = x ? S.getReceipt(x.id) : null;
  modal(`<h1>${x ? t('editMove') : t('newMove')}</h1><form id="txf">
    <div class="seg">${['expense', 'income', 'transfer'].map((k) => `<label><input type="radio" name="type" value="${k}" ${cur.type === k ? 'checked' : ''}><span>${t(k)}</span></label>`).join('')}</div>
    ${fld(t('amount'), `<input name="amount" type="number" inputmode="decimal" step="0.01" min="0.01" required value="${cur.amount}" autofocus>`)}
    ${fld(t('date'), `<input name="date" type="date" required value="${cur.date}">`)}
    ${fld(t('account'), `<select name="accountId">${opts(s.accounts, cur.accountId, accName)}</select>`)}
    <div id="to-wrap">${fld(t('toAccount'), `<select name="toAccountId">${opts(s.accounts, cur.toAccountId, accName)}</select>`)}</div>
    <div id="cat-wrap">${fld(t('category'), `<select name="categoryId"></select>`)}</div>
    ${fld(t('note'), `<input name="note" value="${esc(cur.note)}">`)}
    ${fld(t('tags'), `<input name="tags" value="${esc((cur.tags || []).join(', '))}">`)}
    ${rcp ? `<img class="rcp" src="${rcp}" alt="">` : ''}
    ${fld(t('receipt'), `<input name="receipt" type="file" accept="image/*">`)}
    <button class="btn" type="submit">${t('save')}</button>
    ${x ? `<button class="btn danger" type="button" data-act="delTx" data-id="${x.id}" style="margin-top:8px">${t('delete')}</button>` : ''}
    <button class="btn ghost" type="button" data-act="close" style="margin-top:8px">${t('cancel')}</button></form>`, (m) => {
    const f = $('#txf', m);
    const sync = () => {
      const ty = f.type.value;
      $('#to-wrap', m).hidden = ty !== 'transfer';
      $('#cat-wrap', m).hidden = ty === 'transfer';
      const list = s.categories.filter((c) => c.type === ty);
      f.categoryId.innerHTML = list.map((c) => `<option value="${c.id}" ${c.id === cur.categoryId ? 'selected' : ''}>${c.icon} ${esc(catName(c))}</option>`).join('');
    };
    f.querySelectorAll('[name=type]').forEach((r) => r.addEventListener('change', sync));
    sync();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f), type = fd.get('type'), amount = Math.round(parseFloat(fd.get('amount')) * 100) / 100;
      if (!(amount > 0)) return;
      if (type === 'transfer' && fd.get('accountId') === fd.get('toAccountId')) return toast('⚠️ ' + t('account'));
      const rec = { id: x?.id || S.uid(), type, amount, date: fd.get('date'), accountId: fd.get('accountId'), note: fd.get('note').trim(), tags: fd.get('tags').split(',').map((g) => g.trim().replace(/^#/, '')).filter(Boolean), created: x?.created || Date.now() };
      if (type === 'transfer') rec.toAccountId = fd.get('toAccountId'); else rec.categoryId = fd.get('categoryId');
      const file = fd.get('receipt');
      if (file && file.size) { const data = await shrink(file); if (data && !S.setReceipt(rec.id, data)) toast('Sin espacio para el recibo'); }
      S.update((st) => { const i = st.tx.findIndex((y) => y.id === rec.id); i >= 0 ? (st.tx[i] = rec) : st.tx.push(rec); });
      closeModal();
      checkBudget(rec);
    });
  });
}
function shrink(file) {
  return new Promise((res) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 720 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.6)); };
    img.onerror = () => res(null);
    img.src = url;
  });
}
function checkBudget(tx) {
  if (tx.type !== 'expense') return;
  const b = S.get().budgets[tx.categoryId];
  if (b && (S.spentByCategory(tx.date.slice(0, 7))[tx.categoryId] || 0) > b) notify('budget', '⚠️ NoxCount', t('overBudget', { c: catName(catById(tx.categoryId)) }));
}

// formulario genérico simple
function simpleForm(title, fields, onSave, onDelete) {
  modal(`<h1>${title}</h1><form id="sf">${fields}<button class="btn" type="submit">${t('save')}</button>${onDelete ? `<button class="btn danger" type="button" id="sf-del" style="margin-top:8px">${t('delete')}</button>` : ''}<button class="btn ghost" type="button" data-act="close" style="margin-top:8px">${t('cancel')}</button></form>`, (m) => {
    $('#sf', m).addEventListener('submit', (e) => { e.preventDefault(); if (onSave(new FormData(e.target)) !== false) closeModal(); });
    onDelete && $('#sf-del', m).addEventListener('click', () => { if (confirm(t('deleteConfirm'))) { if (onDelete() !== false) closeModal(); } });
  });
}
const num = (v) => Math.round(parseFloat(v) * 100) / 100 || 0;

function recForm(r) {
  const s = S.get(), cur = r || { type: 'expense', amount: '', accountId: s.accounts[0]?.id, categoryId: '', note: '', freq: 'monthly', next: S.today(), auto: true };
  modal(`<h1>${t('recurring')}</h1><form id="sf">
    <div class="seg">${['expense', 'income'].map((k) => `<label><input type="radio" name="type" value="${k}" ${cur.type === k ? 'checked' : ''}><span>${t(k)}</span></label>`).join('')}</div>
    ${fld(t('amount'), `<input name="amount" type="number" step="0.01" min="0.01" required value="${cur.amount}">`)}
    ${fld(t('account'), `<select name="accountId">${opts(s.accounts, cur.accountId, accName)}</select>`)}
    ${fld(t('category'), `<select name="categoryId"></select>`)}
    ${fld(t('note'), `<input name="note" value="${esc(cur.note)}">`)}
    ${fld(t('freq'), `<select name="freq">${['weekly', 'monthly', 'yearly'].map((f) => `<option value="${f}" ${cur.freq === f ? 'selected' : ''}>${t(f + 'F')}</option>`).join('')}</select>`)}
    ${fld(t('next'), `<input name="next" type="date" required value="${cur.next}">`)}
    <div class="toggle"><span>${t('auto')}</span><input type="checkbox" name="auto" ${cur.auto ? 'checked' : ''}></div>
    <button class="btn" type="submit">${t('save')}</button>${r ? `<button class="btn danger" type="button" id="sf-del" style="margin-top:8px">${t('delete')}</button>` : ''}<button class="btn ghost" type="button" data-act="close" style="margin-top:8px">${t('cancel')}</button></form>`, (m) => {
    const f = $('#sf', m);
    const sync = () => { f.categoryId.innerHTML = s.categories.filter((c) => c.type === f.type.value).map((c) => `<option value="${c.id}" ${c.id === cur.categoryId ? 'selected' : ''}>${c.icon} ${esc(catName(c))}</option>`).join(''); };
    f.querySelectorAll('[name=type]').forEach((x) => x.addEventListener('change', sync)); sync();
    f.addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(f);
      const rec = { id: r?.id || S.uid(), type: fd.get('type'), amount: num(fd.get('amount')), accountId: fd.get('accountId'), categoryId: fd.get('categoryId'), note: fd.get('note').trim(), freq: fd.get('freq'), next: fd.get('next'), auto: fd.get('auto') === 'on' };
      S.update((st) => { const i = st.recurring.findIndex((y) => y.id === rec.id); i >= 0 ? (st.recurring[i] = rec) : st.recurring.push(rec); });
      closeModal(); S.runRecurring();
    });
    r && $('#sf-del', m).addEventListener('click', () => { if (confirm(t('deleteConfirm'))) { S.update((st) => { st.recurring = st.recurring.filter((y) => y.id !== r.id); }); closeModal(); } });
  });
}

// ---------- acciones ----------
const A = {
  tab: (el) => { V.tab = el.dataset.id; V.sub = null; if (V.tab === 'moves') { V.from = null; } render(); window.scrollTo(0, 0); },
  sub: (el) => { V.sub = el.dataset.id || null; render(); },
  close: closeModal,
  mPrev: () => { V.ym = S.addMonthsYM(V.ym, -1); render(); },
  mNext: () => { V.ym = S.addMonthsYM(V.ym, 1); render(); },
  thisMonth: () => { V.from = null; render(); },
  print: () => window.print(),
  newTx: () => txForm(),
  editTx: (el) => txForm(S.get().tx.find((x) => x.id === el.dataset.id)),
  delTx: (el) => { if (!confirm(t('deleteConfirm'))) return; S.update((s) => { s.tx = s.tx.filter((x) => x.id !== el.dataset.id); }); S.setReceipt(el.dataset.id, null); closeModal(); },
  editBudget: (el) => { const c = catById(el.dataset.id); simpleForm(`${c.icon} ${catName(c)}`, fld(t('budget') + ' / ' + t('thisMonth').toLowerCase(), `<input name="v" type="number" step="0.01" min="0" value="${S.get().budgets[c.id] || ''}" placeholder="0">`), (fd) => { S.update((s) => { const v = num(fd.get('v')); v > 0 ? (s.budgets[c.id] = v) : delete s.budgets[c.id]; }); }); },
  newGoal: () => simpleForm(t('goals'), fld(t('goalName'), '<input name="n" required>') + fld(t('target'), '<input name="g" type="number" step="0.01" min="1" required>'), (fd) => { S.update((s) => s.goals.push({ id: S.uid(), name: fd.get('n').trim(), target: num(fd.get('g')), saved: 0 })); }),
  editGoal: (el) => { const g = S.get().goals.find((x) => x.id === el.dataset.id); simpleForm('🎯 ' + g.name, fld(t('goalName'), `<input name="n" required value="${esc(g.name)}">`) + fld(t('target'), `<input name="g" type="number" step="0.01" min="1" required value="${g.target}">`) + fld(t('saved'), `<input name="sv" type="number" step="0.01" min="0" value="${g.saved}">`) + fld(t('contribute'), '<input name="add" type="number" step="0.01" placeholder="+0.00">'), (fd) => { S.update((s) => { const x = s.goals.find((y) => y.id === g.id); x.name = fd.get('n').trim(); x.target = num(fd.get('g')); x.saved = Math.max(0, num(fd.get('sv')) + num(fd.get('add'))); }); }, () => { S.update((s) => { s.goals = s.goals.filter((y) => y.id !== g.id); }); }); },
  newAcc: () => accForm(), editAcc: (el) => accForm(accById(el.dataset.id)),
  newDebt: () => debtForm(), editDebt: (el) => debtForm(S.get().debts.find((d) => d.id === el.dataset.id)),
  newRec: () => recForm(), editRec: (el) => recForm(S.get().recurring.find((r) => r.id === el.dataset.id)),
  confirmRec: (el) => {
    S.update((s) => { const r = s.recurring.find((x) => x.id === el.dataset.id); s.tx.push({ id: S.uid(), type: r.type, amount: r.amount, date: r.next, accountId: r.accountId, categoryId: r.categoryId, note: r.note || '', tags: [], created: Date.now(), fromRecurring: r.id }); r.next = S.addPeriod(r.next, r.freq); });
  },
  newCat: (el) => catForm(null, el.dataset.id), editCat: (el) => catForm(catById(el.dataset.id)),
  notif: async (el) => {
    const k = el.dataset.id, n = { ...(S.device().notif || {}) }; n[k] = el.checked;
    if (el.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
    S.setDevice({ notif: n });
  },
  setPin: () => simpleForm(t('pin'), fld(t('pinNew'), '<input name="p" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required>'), async (fd) => { S.setDevice({ pin: await hash(fd.get('p')) }); render(); }),
  rmPin: () => { S.setDevice({ pin: null }); render(); },
  reset: () => { if (confirm(t('resetConfirm'))) { S.reset(); render(); } },
  authOpen: () => authForm(),
  signOut: async () => { await Cloud.signOut(); render(); },
};
function accForm(a) {
  simpleForm(t('accounts'), fld(t('name'), `<input name="n" required value="${esc(a ? accName(a) : '')}">`) + fld(t('type'), `<select name="k">${['cash', 'bank', 'wallet'].map((k) => `<option value="${k}" ${a?.kind === k ? 'selected' : ''}>${t(k)}</option>`).join('')}</select>`) + fld(t('initial'), `<input name="i" type="number" step="0.01" value="${a?.initial ?? 0}">`), (fd) => {
    S.update((s) => { const rec = { id: a?.id || S.uid(), name: fd.get('n').trim(), kind: fd.get('k'), initial: num(fd.get('i')) }; const i = s.accounts.findIndex((x) => x.id === rec.id); i >= 0 ? (s.accounts[i] = rec) : s.accounts.push(rec); });
  }, a && (() => { if (S.get().tx.some((x) => x.accountId === a.id || x.toAccountId === a.id) || S.get().accounts.length < 2) { toast(t('inUse')); return false; } S.update((s) => { s.accounts = s.accounts.filter((x) => x.id !== a.id); }); }));
}
function debtForm(d) {
  simpleForm(t('debts'), `<div class="seg">${['owe', 'owed'].map((k) => `<label><input type="radio" name="dir" value="${k}" ${(d?.dir || 'owe') === k ? 'checked' : ''}><span>${t(k === 'owe' ? 'iOwe' : 'theyOwe')}</span></label>`).join('')}</div>` + fld(t('who'), `<input name="w" required value="${esc(d?.who || '')}">`) + fld(t('amount'), `<input name="a" type="number" step="0.01" min="0.01" required value="${d?.amount || ''}">`) + fld(t('due'), `<input name="d" type="date" value="${d?.due || ''}">`) + `<div class="toggle"><span>${t('paid')}</span><input type="checkbox" name="p" ${d?.paid ? 'checked' : ''}></div>`, (fd) => {
    S.update((s) => { const rec = { id: d?.id || S.uid(), dir: fd.get('dir'), who: fd.get('w').trim(), amount: num(fd.get('a')), due: fd.get('d') || '', paid: fd.get('p') === 'on' }; const i = s.debts.findIndex((x) => x.id === rec.id); i >= 0 ? (s.debts[i] = rec) : s.debts.push(rec); });
  }, d && (() => { S.update((s) => { s.debts = s.debts.filter((x) => x.id !== d.id); }); }));
}
function catForm(c, type) {
  simpleForm(t('categories'), fld(t('name'), `<input name="n" required value="${esc(c ? catName(c) : '')}">`) + fld(t('icon'), `<input name="i" maxlength="4" required value="${c?.icon || '🏷️'}">`), (fd) => {
    S.update((s) => { if (c) { const x = s.categories.find((y) => y.id === c.id); x.name = fd.get('n').trim(); x.icon = fd.get('i'); } else s.categories.push({ id: S.uid(), name: fd.get('n').trim(), icon: fd.get('i'), type }); });
  }, c && (() => { const s = S.get(); if (s.tx.some((x) => x.categoryId === c.id) || s.recurring.some((x) => x.categoryId === c.id)) { toast(t('inUse')); return false; } S.update((st) => { st.categories = st.categories.filter((x) => x.id !== c.id); delete st.budgets[c.id]; }); }));
}

// ---------- PIN ----------
async function hash(p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nox:' + p)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
function lockScreen() {
  const el = $('#lock'); if (!S.device().pin) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<h1>🌙 NoxCount</h1><p class="muted">${t('enterPin')}</p><input id="pin" type="password" inputmode="numeric" maxlength="6" autofocus><div id="pin-err" class="exp"></div>`;
  $('#pin').addEventListener('input', async (e) => { if (e.target.value.length >= 4 && (await hash(e.target.value)) === S.device().pin) el.hidden = true; else if (e.target.value.length >= 6) { $('#pin-err').textContent = t('wrongPin'); e.target.value = ''; } });
}

// ---------- nube ----------
let syncState = 'off';
const syncText = () => ({ ok: t('synced'), busy: t('syncing'), off: t('offline') }[syncState] || '');
const syncBadge = () => (Cloud.user() ? `<small class="muted" style="font-weight:400">☁️ ${syncText()}</small>` : '');
let pushT;
function schedulePush() {
  if (!Cloud.user()) return;
  syncState = 'busy'; clearTimeout(pushT);
  pushT = setTimeout(async () => { try { await Cloud.push(S.get()); syncState = 'ok'; } catch { syncState = 'off'; } if (V.tab === 'home' || V.sub === 'settings') render(); }, 1200);
}
async function onUser(u) {
  if (!u) return render();
  try {
    const remote = await Cloud.pull(), local = S.get();
    if (remote && remote.updatedAt > local.updatedAt) S.replace(remote.state); else await Cloud.push(local);
    syncState = 'ok';
    Cloud.listen((st) => { if (st.updatedAt > S.get().updatedAt) S.replace(st); });
  } catch { syncState = 'off'; }
  closeModal(); render();
}
function authForm() {
  modal(`<h1>☁️ ${t('cloud')}</h1><form id="af">${fld(t('email'), '<input name="e" type="email" required autocomplete="email">')}${fld(t('password'), '<input name="p" type="password" minlength="6" required autocomplete="current-password">')}
  <button class="btn" type="submit">${t('signIn')}</button><button class="btn ghost" type="button" id="su" style="margin-top:8px">${t('signUp')}</button><button class="btn ghost" type="button" id="gg" style="margin-top:8px">${t('google')}</button><button class="btn ghost" type="button" data-act="close" style="margin-top:8px">${t('skip')}</button></form><div id="aerr" class="exp"></div>`, (m) => {
    const run = (fn) => async () => { try { const f = $('#af', m); await fn(f.e.value, f.p.value); } catch (e) { $('#aerr', m).textContent = e.message; } };
    $('#af', m).addEventListener('submit', (e) => { e.preventDefault(); run(Cloud.signIn)(); });
    $('#su', m).onclick = run(Cloud.signUp);
    $('#gg', m).onclick = async () => { try { await Cloud.google(); } catch (e) { $('#aerr', m).textContent = e.message; } };
  });
}

// ---------- avisos al abrir ----------
function startupNotices() {
  const d = S.device(), n = d.notif || {}, t0 = S.today();
  if (n.due && d.lastDue !== t0) {
    const soon = dueList().filter((x) => x.date <= S.addDays(t0, 3));
    if (soon.length) { S.setDevice({ lastDue: t0 }); notify('due', '⏰ NoxCount', t('dueSoon', { n: soon.map((x) => x.text).join(', ') })); }
  }
  if (n.summary) {
    const dt = new Date(), wk = `${dt.getFullYear()}-W${Math.floor((dt - new Date(dt.getFullYear(), 0, 1)) / 6048e5)}`;
    if (d.lastWeek !== wk) {
      S.setDevice({ lastWeek: wk });
      if (d.lastWeek) { const e = S.sumTx(S.txInRange(S.addDays(t0, -6), t0), 'expense'); notify('summary', '📊 NoxCount', t('weeklyShort', { a: money(e) })); }
    }
  }
}

// ---------- arranque ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (el && el.dataset.act !== 'notif' && A[el.dataset.act]) A[el.dataset.act](el);
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'f-from' || id === 'f-to') { V.from = $('#f-from').value || V.from; V.to = $('#f-to').value || V.to; render(); }
  else if (id === 's-lang') { S.setDevice({ lang: e.target.value }); setLang(e.target.value); render(); }
  else if (e.target.dataset.act === 'notif') A.notif(e.target);
});
S.subscribe(() => { if ($('#modal').hidden) render(); });
S.onSave(schedulePush);

setLang(S.device().lang || ((navigator.language || 'es').startsWith('en') ? 'en' : 'es'));
S.runRecurring();
render();
lockScreen();
startupNotices();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
Cloud.init(onUser).then((ok) => { if (ok && !Cloud.user() && !S.device().skipAuth) { authForm(); S.setDevice({ skipAuth: true }); } });
