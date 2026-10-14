import * as S from './store.js';
import { t, setLang, getLang, money, monthName, dayName } from './i18n.js';
import * as Ch from './charts.js';
import * as Cloud from './cloud.js';
import { ico, PICKABLE, iconName } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const V = { tab: 'home', sub: null, ym: S.today().slice(0, 7), from: null, to: null, q: '', rmode: 'month', year: new Date().getFullYear(), charts: {} };
const CURS = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS', 'PEN', 'CLP', 'BRL', 'UYU', 'BOB', 'CRC', 'DOP', 'GTQ', 'VES'];
const me = () => Cloud.user() || S.device().lastUser; // usuario actual (o el último en este dispositivo si estás sin conexión)
const M = (n, cur) => (S.device().hide ? '••••••' : money(n, cur || S.baseCur()));

const catName = (c) => (c ? c.name || t(c.key) : '—');
const accName = (a) => (a ? a.name || t(a.key) : '—');
const catById = (id) => S.get().categories.find((c) => c.id === id);
const accById = (id) => S.get().accounts.find((a) => a.id === id);
const cls = (type) => (type === 'income' ? 'inc' : type === 'expense' ? 'exp' : 'muted');
const sign = (type) => (type === 'income' ? '+' : type === 'expense' ? '−' : '↔');

function toast(msg, action) {
  const el = $('#toast'); el.textContent = msg;
  if (action) { const b = document.createElement('button'); b.textContent = action.label; b.className = 'btn sm'; b.style.cssText = 'margin-left:10px;width:auto'; b.onclick = () => { el.classList.remove('show'); action.fn(); }; el.appendChild(b); }
  el.classList.add('show'); el.style.pointerEvents = action ? 'auto' : 'none';
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), action ? 7000 : 3200);
}
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
  m.classList.toggle('vt', !!V.vt);
  m.hidden = false;
  m.onclick = (e) => { if (e.target === m) closeModal(); };
  mount && mount(m);
}
function closeModal() { const done = () => { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; render(); }; withVT(done); }
const fld = (label, inner) => `<label>${label}${inner}</label>`;
const opts = (list, sel, fn) => list.map((x) => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(fn(x))}</option>`).join('');

// ---------- navegación ----------
function renderNav() {
  const items = [['home', 'home', t('home')], ['moves', 'receipt', t('moves')], ['add', 'plus', ''], ['plan', 'calc', t('plan')], ['reports', 'chart', t('reports')]];
  $('#nav').innerHTML = items.map(([k, i, l]) => k === 'add' ? `<button class="fab" data-act="newTx" aria-label="${t('newMove')}">${ico('plus', 26)}</button>` : `<button class="${V.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${ico(i, 22)}<span>${l}</span></button>`).join('');
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function render() {
  document.title = 'NoxCount';
  const views = { home, moves, reports, plan, profile };
  const key = V.tab + '|' + V.sub + '|' + V.rmode + '|' + V.ym + '|' + V.psec, view = $('#view');
  view.innerHTML = (views[V.tab] || home)();
  view.classList.toggle('anim', key !== V.key && !reduced());
  V.key = key;
  renderNav();
  countUp();
}
// el saldo "corre" hacia su nuevo valor
function countUp() {
  const el = $('[data-count]'); if (!el) return;
  const to = Number(el.dataset.count), cur = el.dataset.cur, from = V.lastBal ?? 0;
  V.lastBal = to;
  if (reduced() || S.device().hide || from === to) return;
  const t0 = performance.now(), dur = 700;
  const step = (now) => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = money(from + (to - from) * e, cur); if (k < 1 && el.isConnected) requestAnimationFrame(step); else if (el.isConnected) el.textContent = money(to, cur); };
  requestAnimationFrame(step);
}
// transición de vista (fundido suave) y de elemento compartido (el botón "+" / la fila se transforma en la hoja)
function withVT(fn) { if (reduced() || !document.startViewTransition) return fn(); document.startViewTransition(fn); }
function sharedOpen(src, openFn) {
  if (reduced() || !document.startViewTransition || !src) return openFn();
  src.style.viewTransitionName = 'shared';
  V.vt = true;
  const vt = document.startViewTransition(() => { src.style.viewTransitionName = ''; openFn(); const sh = $('#modal .sheet'); if (sh) sh.style.viewTransitionName = 'shared'; });
  vt.finished.finally(() => { V.vt = false; src.style.viewTransitionName = ''; const sh = $('#modal .sheet'); if (sh) sh.style.viewTransitionName = ''; });
}

// ---------- vistas ----------
function topbar(title, extra = '') {
  return `<div class="top"><h1>${title}</h1><span class="row" style="gap:4px">${extra}<button class="avatar" data-act="profile" aria-label="${t('profile')}">${ico('user', 20)}</button></span></div>`;
}
function monthNav() {
  return `<div class="mnav noprint"><button data-act="mPrev" aria-label="prev">${ico('left', 18)}</button><b>${monthName(V.ym)}</b><button data-act="mNext" aria-label="next">${ico('right', 18)}</button></div>`;
}
function txRow(x) {
  const c = catById(x.categoryId), a = accById(x.accountId), b = accById(x.toAccountId);
  const title = x.type === 'transfer' ? `${accName(a)} → ${accName(b)}` : catName(c);
  return `<div class="item" data-act="editTx" data-id="${x.id}"><div class="ico">${ico(x.type === 'transfer' ? 'swap' : c ? c.icon : 'tag')}</div>
    <div class="grow"><div class="ellip">${esc(title)}</div><div class="muted ellip" style="font-size:.8rem">${esc(x.note || '')} ${(x.tags || []).map((g) => `<span class="tag">#${esc(g)}</span>`).join('')}${x.type !== 'transfer' ? ' · ' + esc(accName(a)) : ''}</div></div>
    <b class="${cls(x.type)}">${sign(x.type)}${M(x.amount, S.accCur(x.accountId))}</b></div>`;
}

function bar(val, max) {
  const p = max ? Math.min(100, (val / max) * 100) : 0;
  return `<div class="bar"><i class="${val > max ? 'over' : p >= 80 ? 'near' : ''}" style="width:${p}%"></i></div>`;
}
function progress(label, icon, val, max) {
  return `<div style="margin:10px 0"><div class="row sp"><span class="row" style="gap:6px">${icon ? ico(icon, 16) : ''}${esc(label)}</span><span class="muted">${M(val)} ${t('of')} ${M(max)}</span></div>${bar(val, max)}</div>`;
}
function dueList() {
  const s = S.get(), lim = S.addDays(S.today(), 7), out = [];
  s.debts.filter((d) => debtLeft(d) > 0.005 && d.due && d.due <= lim).forEach((d) => out.push({ date: d.due, icon: d.dir === 'owe' ? 'up' : 'down', text: d.who, amount: debtLeft(d) }));
  s.recurring.filter((r) => r.next <= lim && r.type === 'expense').forEach((r) => out.push({ date: r.next, icon: 'repeat', text: r.note || catName(catById(r.categoryId)), amount: r.amount, rid: r.id }));
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function availCard() {
  const t0 = S.today(), ym = t0.slice(0, 7);
  const bsum = Object.values(S.get().budgets).reduce((a, b) => a + b, 0);
  const limit = bsum;
  if (!limit) return '';
  const spent = S.sumTx(S.monthTx(ym), 'expense'), left = limit - spent, daysLeft = Number(S.monthEnd(ym).slice(8)) - Number(t0.slice(8)) + 1;
  return `<div class="card"><div class="row sp"><span class="muted">${t('availSpend')}</span><b>${M(Math.max(0, left))}</b></div>${bar(spent, limit)}
    <div class="sub" style="margin-top:8px">${left > 0 ? t('perDay', { a: M(left / daysLeft) }) : t('overLimit', { a: M(-left) })}</div></div>`;
}
function summaryBlock() {
  const t0 = S.today();
  const d7 = S.sumTx(S.txInRange(S.addDays(t0, -6), t0), 'expense'), p7 = S.sumTx(S.txInRange(S.addDays(t0, -13), S.addDays(t0, -7)), 'expense');
  const delta = p7 ? `${d7 >= p7 ? '+' : ''}${Math.round(((d7 - p7) / p7) * 100)}%` : '—';
  return `<h2>${t('overview')}</h2><div class="card">${t('weeklyText', { a: M(d7), d: delta })}</div>${insights().replace(/^<h2>.*?<\/h2>/, '')}`;
}
function insights() {
  const t0 = S.today(), ym = t0.slice(0, 7);
  const day = Number(t0.slice(8)), dim = Number(S.monthEnd(ym).slice(8));
  const spentM = S.sumTx(S.monthTx(ym), 'expense');
  const proj = spentM / day * dim;
  const avg = S.sumTx(S.txInRange(S.addDays(t0, -29), t0), 'expense') / 30;
  const bal = S.totalBalance();
  const left = avg > 0 ? Math.max(0, Math.floor(bal / avg)) : null;
  return `<h2>${t('projection')}</h2><div class="card"><div>${t('projText', { a: `<b>${M(proj)}</b>` })}</div>
    <div class="row sp" style="margin-top:10px"><span class="muted">${t('dailyAvg')}</span><b>${M(avg)}</b></div>
    <div class="row sp" style="margin-top:6px"><span class="muted">${t('daysLeft')}</span><b>${left === null ? '—' : left + ' ' + t('days')}</b></div></div>`;
}

function home() {
  const s = S.get(), ym = S.today().slice(0, 7), mt = S.monthTx(ym);
  const inc = S.sumTx(mt, 'income'), exp = S.sumTx(mt, 'expense');
  const recent = S.txInRange('1900-01-01', '2999-12-31').slice(0, 5);
  const favs = s.favorites.length ? `<h2>${t('favorites')}</h2><div class="chips">${s.favorites.map((f) => `<button class="chip" data-act="favTx" data-id="${f.id}">${ico(catById(f.categoryId)?.icon || 'star', 16)} ${esc(f.name)} <b class="${cls(f.type)}">${M(f.amount, S.accCur(f.accountId))}</b></button>`).join('')}</div>` : '';
  const brand = `<span class="brand"><span class="logo-mark" ${V.vtLogin ? 'style="view-transition-name:logo"' : ''}>${ico('moon', 26)}</span>NoxCount</span>`;
  const eye = `<button class="eye" data-act="toggleHide" aria-label="${t('hide')}">${ico(S.device().hide ? 'eyeoff' : 'eye', 22)}</button>`;
  return `${topbar(brand, eye)}
  <div class="card hero" ${V.vtLogin ? 'style="view-transition-name:authcard"' : ''}><div class="muted">${t('balance')} · ${S.baseCur()}</div><div class="big" data-count="${S.totalBalance()}" data-cur="${S.baseCur()}">${M(S.totalBalance())}</div></div>
  ${availCard()}
  <div class="grid2"><div class="card"><div class="muted">${t('income')} · ${t('thisMonth')}</div><b class="inc">${M(inc)}</b></div><div class="card"><div class="muted">${t('expense')} · ${t('thisMonth')}</div><b class="exp">${M(exp)}</b></div></div>
  ${favs}
  <h2>${t('recent')}</h2><div class="card">${recent.map(txRow).join('') || `<span class="muted">${t('nothing')}</span>`}${recent.length ? `<button class="btn ghost sm" style="margin-top:10px" data-act="tab" data-id="moves">${t('seeAll')}</button>` : ''}</div>`;
}

function movesList() {
  const q = V.q.trim().toLowerCase();
  let list = S.txInRange(V.from, V.to);
  if (q) list = list.filter((x) => { const hay = [x.note, catName(catById(x.categoryId)), ...(x.tags || []).map((g) => '#' + g), String(x.amount)].join(' ').toLowerCase(); return q.split(/\s+/).every((w) => hay.includes(w)); });
  let last = '';
  const rows = list.map((x) => { const h = x.date !== last ? `<div class="day">${dayName(x.date)}</div>` : ''; last = x.date; return h + txRow(x); }).join('');
  return `<div class="grid2"><div class="card"><span class="muted">${t('income')}</span><br><b class="inc">${M(S.sumTx(list, 'income'))}</b></div><div class="card"><span class="muted">${t('expense')}</span><br><b class="exp">${M(S.sumTx(list, 'expense'))}</b></div></div>
  <div class="card" style="margin-top:12px">${rows || `<span class="muted">${t('nothing')}</span>`}</div>`;
}
function moves() {
  if (!V.from) { V.from = V.ym + '-01'; V.to = S.monthEnd(V.ym); }
  return `${topbar(t('moves'))}
  <div class="search">${ico('search', 18)}<input id="f-q" type="search" placeholder="${t('search')}" value="${esc(V.q)}" autocomplete="off"></div>
  <div class="card"><div class="grid2" style="gap:8px"><div>${fld(t('from'), `<input type="date" id="f-from" value="${V.from}">`)}</div><div>${fld(t('to'), `<input type="date" id="f-to" value="${V.to}">`)}</div></div>
  <button class="btn ghost sm" data-act="thisMonth">${t('thisMonth')}</button></div>
  <div id="mlist">${movesList()}</div>`;
}

function reports() {
  const modeTabs = `<div class="seg noprint"><label><input type="radio" name="rmode" value="month" ${V.rmode === 'month' ? 'checked' : ''} data-act="rmode" data-id="month"><span>${t('monthly')}</span></label><label><input type="radio" name="rmode" value="year" ${V.rmode === 'year' ? 'checked' : ''} data-act="rmode" data-id="year"><span>${t('annual')}</span></label></div>`;
  V.charts = {};
  return `${topbar(t('reports'))}${modeTabs}${V.rmode === 'year' ? yearReport() : monthReport()}<button class="btn noprint" data-act="print">${ico('file', 18)} ${t('print')}</button>`;
}
function monthReport() {
  const ym = V.ym, mt = S.monthTx(ym), prev = S.addMonthsYM(ym, -1), pt = S.monthTx(prev);
  const sp = S.spentByCategory(ym);
  const data = Object.entries(sp).sort((a, b) => b[1] - a[1]).map(([id, value], i) => ({ label: catName(catById(id)), icon: catById(id)?.icon || 'tag', value, color: Ch.PALETTE[i % Ch.PALETTE.length] }));
  const total = data.reduce((a, d) => a + d.value, 0);
  const rows = [], pts = [];
  for (let i = 5; i >= 0; i--) { const m = S.addMonthsYM(ym, -i), x = S.monthTx(m); rows.push({ label: monthName(m).slice(0, 3), inc: S.sumTx(x, 'income'), exp: S.sumTx(x, 'expense'), m }); }
  for (let i = 11; i >= 0; i--) { const m = S.addMonthsYM(ym, -i); pts.push({ label: monthName(m).slice(0, 3), v: S.totalBalance(S.monthEnd(m)), m }); }
  V.charts.cat = data.map((d) => `${d.label}: ${M(d.value)} (${Math.round((d.value / total) * 100)}%)`);
  V.charts.bars = rows.map((r) => `${monthName(r.m)} — ${t('income')}: ${M(r.inc)} · ${t('expense')}: ${M(r.exp)}`);
  V.charts.line = pts.map((p) => `${monthName(p.m)} — ${t('balance')}: ${M(p.v)}`);
  const cmp = (cur, old) => { const d = cur - old; return old ? `${d >= 0 ? '+' : ''}${Math.round((d / old) * 100)}%` : '—'; };
  const ci = S.sumTx(mt, 'income'), ce = S.sumTx(mt, 'expense'), pi = S.sumTx(pt, 'income'), pe = S.sumTx(pt, 'expense');
  // por etiqueta
  const tags = {};
  mt.filter((x) => x.type === 'expense').forEach((x) => (x.tags || []).forEach((g) => { tags[g] = (tags[g] || 0) + S.baseAmount(x); }));
  const tagRows = Object.entries(tags).sort((a, b) => b[1] - a[1]).map(([g, v]) => `<div class="row sp" style="padding:4px 0"><span class="tag" style="font-size:.85rem">#${esc(g)}</span><b>${M(v)}</b></div>`).join('');
  // por cuenta
  const accRows = S.get().accounts.map((a) => { const x = mt.filter((y) => y.accountId === a.id); const i = S.sumTx(x, 'income'), e = S.sumTx(x, 'expense'); return i || e ? `<div class="row sp" style="padding:4px 0"><span>${esc(accName(a))}</span><span><span class="inc">${M(i)}</span> / <span class="exp">${M(e)}</span></span></div>` : ''; }).join('');
  const top = mt.filter((x) => x.type === 'expense').sort((a, b) => S.baseAmount(b) - S.baseAmount(a)).slice(0, 5);
  return `${monthNav()}
  ${summaryBlock()}
  <h2>${t('byCategory')}</h2><div class="card"><div class="row">${total ? `${Ch.donut(data, 'cat')}<div class="legend grow">${data.map((d) => `<div><i style="background:${d.color}"></i><span class="grow ellip row" style="gap:6px">${ico(d.icon, 15)}${esc(d.label)}</span><b>${Math.round((d.value / total) * 100)}%</b></div>`).join('')}</div>` : `<span class="muted">${t('nothing')}</span>`}</div><div class="detail muted" id="d-cat"></div></div>
  <h2>${t('byMonth')}</h2><div class="card">${Ch.bars(rows, 'bars')}<div class="detail muted" id="d-bars"></div></div>
  <h2>${t('trend')}</h2><div class="card">${Ch.line(pts, 'line')}<div class="detail muted" id="d-line"></div></div>
  <h2>${t('compare')}</h2><div class="card">
    <div class="row sp"><span>${t('income')}</span><span><b class="inc">${M(ci)}</b> <small class="muted">${cmp(ci, pi)} ${t('vs')}</small></span></div>
    <div class="row sp" style="margin-top:8px"><span>${t('expense')}</span><span><b class="exp">${M(ce)}</b> <small class="muted">${cmp(ce, pe)} ${t('vs')}</small></span></div>
    <div class="row sp" style="margin-top:8px"><span>${t('total')}</span><b>${M(ci - ce)}</b></div></div>
  <h2>${t('topExp')}</h2><div class="card">${top.length ? top.map(txRow).join('') : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('byTag')}</h2><div class="card">${tagRows || `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('byAcc')}</h2><div class="card">${accRows || `<span class="muted">${t('nothing')}</span>`}</div>`;
}
function yearReport() {
  const y = V.year, rows = [];
  for (let m = 1; m <= 12; m++) { const ym = `${y}-${S.pad(m)}`, x = S.monthTx(ym); const inc = S.sumTx(x, 'income'), exp = S.sumTx(x, 'expense'); rows.push({ ym, label: monthName(ym).slice(0, 3), inc, exp, net: inc - exp }); }
  V.charts.ybars = rows.map((r) => `${monthName(r.ym)} — ${t('income')}: ${M(r.inc)} · ${t('expense')}: ${M(r.exp)} · ${t('net')}: ${M(r.net)}`);
  const ti = rows.reduce((a, r) => a + r.inc, 0), te = rows.reduce((a, r) => a + r.exp, 0);
  return `<div class="mnav noprint"><button data-act="yPrev" aria-label="prev">${ico('left', 18)}</button><b>${y}</b><button data-act="yNext" aria-label="next">${ico('right', 18)}</button></div>
  <div class="card">${Ch.bars(rows, 'ybars')}<div class="detail muted" id="d-ybars"></div></div>
  <div class="grid2"><div class="card"><span class="muted">${t('income')}</span><br><b class="inc">${M(ti)}</b></div><div class="card"><span class="muted">${t('expense')}</span><br><b class="exp">${M(te)}</b></div></div>
  <div class="card" style="margin-top:12px"><div class="row sp"><b>${t('net')}</b><b class="${ti - te >= 0 ? 'inc' : 'exp'}">${M(ti - te)}</b></div></div>
  <div class="card">${rows.map((r) => `<div class="row sp" style="padding:5px 0;border-bottom:1px solid var(--line)"><span style="text-transform:capitalize">${monthName(r.ym).split(' ')[0]}</span><span><span class="inc">${M(r.inc)}</span> · <span class="exp">${M(r.exp)}</span> · <b>${M(r.net)}</b></span></div>`).join('')}</div>`;
}

function budgetsCard() {
  const s = S.get(), sp = S.spentByCategory(V.ym), ex = s.categories.filter((c) => c.type === 'expense');
  return `<h2>${t('budgets')}</h2><div class="card">${ex.map((c) => { const b = s.budgets[c.id] || 0; return `<div class="item" data-act="editBudget" data-id="${c.id}"><div class="ico">${ico(c.icon)}</div><div class="grow">${esc(catName(c))}${b ? `<div class="row sp"><span class="muted">${M(sp[c.id] || 0)} ${t('of')} ${M(b)}</span></div>${bar(sp[c.id] || 0, b)}` : `<div class="muted" style="font-size:.8rem">${M(sp[c.id] || 0)} · ${t('add')} ${t('budget').toLowerCase()}</div>`}</div></div>`; }).join('')}</div>`;
}
function goalsCard() {
  const s = S.get();
  return `<div class="card">${s.goals.map((g) => `<div class="item" data-act="editGoal" data-id="${g.id}"><div class="ico">${ico('target')}</div><div class="grow">${progress(g.name, '', g.saved, g.target)}</div></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}
  <button class="btn ghost" style="margin-top:10px" data-act="newGoal">+ ${t('goals')}</button></div>`;
}
function recurringCard() {
  const s = S.get();
  const row = (r) => { const due = r.next <= S.today(); return `<div class="item" data-act="editRec" data-id="${r.id}"><div class="ico">${ico(catById(r.categoryId)?.icon || 'repeat')}</div><div class="grow">${esc(r.note || catName(catById(r.categoryId)))}<br><small class="muted">${t(r.freq + 'F')} · ${dayName(r.next)}${r.auto ? ' · auto' : ''}</small></div><div style="text-align:right"><b class="${cls(r.type)}">${M(r.amount)}</b>${due && !r.auto ? `<br><button class="btn sm" data-act="confirmRec" data-id="${r.id}">${t('confirm')}</button>` : ''}</div></div>`; };
  return `<h2>${t('recurring')}</h2><div class="card">${s.recurring.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn ghost" style="margin-top:10px" data-act="newRec">+ ${t('recurring')}</button></div>`;
}
// pagado de una deuda: suma de abonos (según el movimiento real); si está marcada como pagada, cuenta completa
const r2 = (n) => Math.round(n * 100) / 100;
function debtPayments(d) {
  return (d.payments || []).map((p) => { const x = S.get().tx.find((y) => y.id === p.txId); return { ...p, date: x ? x.date : p.date, value: x ? S.baseAmount(x) : p.amountBase }; }).sort((a, b) => (a.date < b.date ? 1 : -1));
}
const debtPaid = (d) => (d.paid ? d.amount : Math.min(d.amount, r2(debtPayments(d).reduce((a, p) => a + p.value, 0))));
const debtLeft = (d) => r2(d.amount - debtPaid(d));
function debtsCard() {
  const s = S.get();
  const row = (d) => { const paid = debtPaid(d), left = debtLeft(d), done = left <= 0.005;
    return `<div class="item" data-act="debtOpen" data-id="${d.id}"><div class="ico">${ico(d.dir === 'owe' ? 'up' : 'down')}</div><div class="grow"><div class="row sp"><span class="ellip" style="${done ? 'text-decoration:line-through' : ''}">${esc(d.who)}</span><b class="${d.dir === 'owe' ? 'exp' : 'inc'}">${M(done ? d.amount : left)}</b></div>${bar(paid, d.amount)}<small class="muted">${done ? t('paid') : `${t('paidSoFar')} ${M(paid)} · ${d.due ? t('due') + ' ' + dayName(d.due) : t('pending')}`}</small></div></div>`; };
  const grp = (dir) => { const L = s.debts.filter((d) => d.dir === dir), total = L.reduce((a, d) => a + d.amount, 0), paid = L.reduce((a, d) => a + debtPaid(d), 0); return { total, paid, left: r2(total - paid) }; };
  const card = (dir, label, cl) => { const g = grp(dir); return `<div class="card"><span class="muted">${label}</span><br><b class="${cl}">${M(g.left)}</b>${g.total ? `${bar(g.paid, g.total)}<div class="sub" style="margin-top:6px">${t('paidOf', { a: M(g.paid), b: M(g.total) })}</div>` : ''}</div>`; };
  return `<h2>${t('debts')}</h2><div class="grid2">${card('owe', t('iOwe'), 'exp')}${card('owed', t('theyOwe'), 'inc')}</div>
  <div class="card" style="margin-top:12px">${s.debts.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn ghost" style="margin-top:10px" data-act="newDebt">+ ${t('debts')}</button></div>`;
}

// detalle de una deuda: avance, abonos y acciones
function debtView(id) {
  const d = S.get().debts.find((x) => x.id === id); if (!d) return closeModal();
  const paid = debtPaid(d), left = debtLeft(d), done = left <= 0.005, pays = d.paid && !(d.payments || []).length ? [] : debtPayments(d), pct = d.amount ? Math.round((paid / d.amount) * 100) : 0;
  modal(`<div class="row sp"><h1>${ico(d.dir === 'owe' ? 'up' : 'down', 22)} ${esc(d.who)}</h1><button class="avatar" data-act="close" aria-label="${t('cancel')}">${ico('x', 18)}</button></div>
    <div class="card"><div class="row sp"><span class="muted">${t(d.dir === 'owe' ? 'iOwe' : 'theyOwe')}</span><b>${M(d.amount)}</b></div>${bar(paid, d.amount)}
      <div class="row sp sub" style="margin-top:6px"><span>${t('paidSoFar')}: ${M(paid)} (${pct}%)</span><span>${done ? t('settled') : `${t('remaining')}: ${M(left)}`}</span></div>${d.due ? `<div class="sub" style="margin-top:4px">${t('due')}: ${dayName(d.due)}</div>` : ''}</div>
    <h2>${t('payments')}</h2><div class="card">${pays.map((p) => `<div class="item" data-act="payDel" data-id="${d.id}" data-pid="${p.id}"><div class="ico">${ico(d.dir === 'owe' ? 'up' : 'down')}</div><div class="grow">${dayName(p.date)}</div><b>${M(p.value)}</b><span class="chev">${ico('trash', 16)}</span></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}</div>
    ${done ? '' : `<button class="btn" data-act="payAdd" data-id="${d.id}">${ico('plus', 18)} ${t('addPay')}</button><button class="btn ghost" style="margin-top:8px" data-act="paySettle" data-id="${d.id}">${t('settle')} (${M(left)})</button>`}
    <button class="btn ghost" style="margin-top:8px" data-act="editDebt" data-id="${d.id}">${ico('sliders', 18)} ${t('edit')}</button>`);
}
// formulario de abono: genera un movimiento (egreso si debes, ingreso si te deben) y mueve el saldo de la cuenta
function payForm(id, prefill = '') {
  const s = S.get(), d = s.debts.find((x) => x.id === id); if (!d) return;
  const left = debtLeft(d), label = t(d.dir === 'owe' ? 'payFrom' : 'payInto');
  modal(`<h1>${t('addPay')}</h1><p class="muted" style="margin-top:0">${esc(d.who)} · ${t('remaining')}: <b>${M(left)}</b></p><form id="pf">
    ${fld(`${t('payAmount')} (${S.baseCur()})`, `<input name="a" id="pay-a" type="text" inputmode="decimal" autocomplete="off" required value="${prefill}" placeholder="0.00">`)}
    ${fld(t('date'), `<input name="d" type="date" required value="${S.today()}">`)}
    ${fld(label, `<select name="acc">${opts(s.accounts, s.accounts[0]?.id, (a) => `${accName(a)} (${a.currency || S.baseCur()})`)}</select>`)}
    <div id="pay-err" class="exp" style="min-height:1.2em"></div>
    <button class="btn" type="submit">${t('save')}</button><button class="btn ghost" type="button" data-act="debtOpen" data-id="${d.id}" style="margin-top:8px">${t('cancel')}</button></form>`, (m) => {
    $('#pf', m).addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(e.target), amt = calc(fd.get('a'));
      if (!(amt > 0)) { $('#pay-err', m).textContent = t('amount'); return; }
      if (amt > left + 0.005) { $('#pay-err', m).textContent = t('payOver', { a: M(left) }); return; }
      addPayment(d.id, amt, fd.get('d'), fd.get('acc'));
      debtView(d.id);
    });
  });
}
function addPayment(did, amount, date, accId) {
  const st = S.get(), d = st.debts.find((x) => x.id === did), type = d.dir === 'owe' ? 'expense' : 'income';
  const cat = st.categories.find((c) => c.id === (type === 'expense' ? 'e_other' : 'i_other')) || st.categories.find((c) => c.type === type);
  const tx = { id: S.uid(), type, amount: r2(amount / S.rate(S.accCur(accId))), date, accountId: accId, categoryId: cat && cat.id, note: t('debtNote', { n: d.who }), tags: ['deuda'], created: Date.now(), debtId: did };
  S.update((s) => { s.tx.push(tx); const dd = s.debts.find((x) => x.id === did); (dd.payments = dd.payments || []).push({ id: S.uid(), txId: tx.id, date, amountBase: amount }); });
}

function plan() {
  const sec = V.psec || 'budget';
  const tabs = `<div class="seg">${[['budget', 'secBudget'], ['goals', 'secGoals'], ['pay', 'secPay']].map(([k, l]) => `<label><input type="radio" name="psec" value="${k}" ${sec === k ? 'checked' : ''} data-act="psec" data-id="${k}"><span>${t(l)}</span></label>`).join('')}</div>`;
  const body = sec === 'goals' ? goalsCard() : sec === 'pay' ? recurringCard() + debtsCard() : monthNav() + budgetsCard();
  return `${topbar(t('plan'))}${tabs}${body}`;
}

function profile() {
  const s = S.get(), u = me();
  const back = `<button class="btn ghost sm" data-act="sub" data-id="">${ico('left', 16)} ${t('profile')}</button>`;
  if (!V.sub) {
    const item = (k, i, label, sub) => `<div class="item" data-act="sub" data-id="${k}"><div class="ico">${ico(i)}</div><div class="grow">${label}${sub ? `<br><small class="muted">${sub}</small>` : ''}</div><span class="chev">${ico('right', 18)}</span></div>`;
    const ini = ((u && u.email) || '?').slice(0, 1).toUpperCase();
    return `<div class="top"><button class="btn ghost sm" data-act="tab" data-id="home">${ico('left', 16)} ${t('home')}</button></div>
    <div class="card row" style="gap:14px"><div class="acc-avatar">${esc(ini)}</div><div class="grow"><b class="ellip" style="display:block">${esc((u && u.email) || '')}</b><span class="sub row" style="gap:5px">${ico('cloud', 13)} ${syncText() || t('myData')}</span></div></div>
    <h2>${t('myMoney')}</h2><div class="card menu">${item('accounts', 'wallet', t('accounts'), `${s.accounts.length}`)}${item('categories', 'tag', t('categories'), `${s.categories.length}`)}${item('favorites', 'star', t('favorites'), `${s.favorites.length}`)}</div>
    <h2>${t('settings')}</h2><div class="card menu">${item('settings', 'sliders', t('settings'), `${t('secAccount')} · ${t('secSecurity')} · ${t('secPrefs')}`)}</div>`;
  }
  if (V.sub === 'accounts') {
    return `${back}<h1>${t('accounts')}</h1><div class="card">${s.accounts.map((a) => `<div class="item" data-act="editAcc" data-id="${a.id}"><div class="ico">${ico({ cash: 'cash', bank: 'bank', wallet: 'phone' }[a.kind])}</div><div class="grow">${esc(accName(a))}<br><small class="muted">${t(a.kind)} · ${a.currency || S.baseCur()}</small></div><b>${M(S.accountBalance(a), a.currency)}</b></div>`).join('')}
    <button class="btn" style="margin-top:10px" data-act="newAcc">+ ${t('accounts')}</button></div>`;
  }
  if (V.sub === 'categories') {
    const block = (type) => `<h2>${t(type)}</h2><div class="card">${s.categories.filter((c) => c.type === type).map((c) => `<div class="item" data-act="editCat" data-id="${c.id}"><div class="ico">${ico(c.icon)}</div><div class="grow">${esc(catName(c))}</div></div>`).join('')}<button class="btn ghost" style="margin-top:10px" data-act="newCat" data-id="${type}">+ ${t('add')}</button></div>`;
    return `${back}<h1>${t('categories')}</h1>${block('expense')}${block('income')}`;
  }
  if (V.sub === 'favorites') {
    return `${back}<h1>${t('favorites')}</h1><p class="muted">${t('favHint')}</p><div class="card">${s.favorites.map((f) => `<div class="item" data-act="editFav" data-id="${f.id}"><div class="ico">${ico(catById(f.categoryId)?.icon || 'star')}</div><div class="grow">${esc(f.name)}<br><small class="muted">${esc(accName(accById(f.accountId)))}</small></div><b class="${cls(f.type)}">${M(f.amount, S.accCur(f.accountId))}</b></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newFav">+ ${t('favAdd')}</button></div>`;
  }
  if (V.sub === 'settings') return settingsView(back);
  return '';
}

function settingsView(back) {
  const s = S.get(), d = S.device(), n = d.notif || {}, u = me(), enc = S.isEncrypted(), base = S.baseCur();
  const tg = (k, l) => `<div class="toggle"><span>${l}</span><input type="checkbox" data-act="notif" data-id="${k}" ${n[k] ? 'checked' : ''}></div>`;
  const used = [...new Set(s.accounts.map((a) => a.currency || base))].filter((c) => c !== base);
  const rateRows = used.map((c) => `<label>${t('rateHelp', { c, b: base })}<input type="number" step="any" min="0" data-rate="${c}" value="${s.settings.rates[c] || ''}" placeholder="0.00"></label>`).join('');
  const bioOk = !!window.PublicKeyCredential && !enc && d.pin;
  return `${back}<h1>${t('settings')}</h1>
  <h2>${t('secAccount')}</h2><div class="card"><div class="row" style="gap:6px">${ico('user', 16)}<b class="ellip">${esc((u && u.email) || '')}</b></div><div class="muted" style="margin:6px 0 10px">${syncText()}</div>
    <button class="btn ghost" data-act="signOut">${ico('logout', 18)} ${t('signOut')}</button>${Cloud.configured() && !Cloud.fromFile() ? `<button class="btn ghost" style="margin-top:8px" data-act="rmCfg">${t('cfgRemove')}</button>` : ''}</div>
  <h2>${t('secSecurity')}</h2><div class="card">${d.pin ? `<button class="btn danger" data-act="rmPin">${ico('lock', 18)} ${t('removePin')}</button>` : `<button class="btn ghost" data-act="setPin">${ico('lock', 18)} ${t('setPin')}</button>`}
    ${bioOk ? `<button class="btn ghost" style="margin-top:8px" data-act="${d.bio ? 'bioOff' : 'bioOn'}">${ico('finger', 18)} ${d.bio ? t('bioRemove') : t('bioSet')}</button>` : ''}
    <hr><b>${t('encrypt')}</b><p class="muted" style="margin:6px 0 10px">${t('encWarn')}</p>${enc ? `<div class="row" style="margin-bottom:8px;gap:6px">${ico('check', 16)}${t('encActive')}</div><button class="btn danger" data-act="encOff">${t('encOff')}</button>` : d.pin ? `<button class="btn ghost" data-act="encOn">${t('encOn')}</button>` : `<span class="muted">${t('needPin')}</span>`}</div>
  <h2>${t('secPrefs')}</h2><div class="card">${fld(t('language'), `<select id="s-lang"><option value="es" ${getLang() === 'es' ? 'selected' : ''}>Español</option><option value="en" ${getLang() === 'en' ? 'selected' : ''}>English</option></select>`)}
    <div class="toggle"><span>${t('hide')}</span><input type="checkbox" data-act="hideT" ${d.hide ? 'checked' : ''}></div>
    <hr>${fld(t('baseCur'), `<select id="s-base">${CURS.map((c) => `<option ${c === base ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}${rateRows ? `<b>${t('rates')}</b>${rateRows}` : ''}
    <hr><b>${t('notifs')}</b>${tg('due', t('nDue'))}${tg('budget', t('nBudget'))}${tg('summary', t('nSummary'))}${tg('remind', t('remind'))}${fld(t('remindAt'), `<input type="time" id="s-remind" value="${d.remindTime || '20:00'}">`)}</div>
  <h2>${t('secData')}</h2><button class="btn danger" data-act="reset">${ico('trash', 18)} ${t('reset')}</button>`;
}

// ---------- formularios ----------
// calculadora segura: solo dígitos y operadores
function calc(str) {
  const x = String(str).replace(/,/g, '.').replace(/[x×]/gi, '*').replace(/÷/g, '/').trim();
  if (!x || !/^[0-9+\-*/().\s]+$/.test(x)) return NaN;
  try { const v = Function('"use strict";return (' + x + ')')(); return Number.isFinite(v) ? Math.round(v * 100) / 100 : NaN; } catch { return NaN; }
}
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// "gasté 20 en comida" / "spent 20 on food" / "ingreso 500 sueldo"
function parseVoice(txt) {
  const n = norm(txt), m = n.match(/(\d+(?:[.,]\d+)?)/);
  const type = /(ingres|cobr|gane|recib|sueldo|salario|income|earned|received|salary|got paid)/.test(n) ? 'income' : 'expense';
  let cat = null;
  for (const c of S.get().categories.filter((c) => c.type === type)) {
    const name = norm(catName(c));
    if (n.includes(name) || name.split(/[\s/]+/).some((w) => w.length >= 4 && n.includes(w))) { cat = c.id; break; }
  }
  return { amount: m ? parseFloat(m[1].replace(',', '.')) : null, type, cat, note: txt };
}

function txForm(x) {
  const s = S.get();
  const cur = x || { type: 'expense', amount: '', date: S.today(), accountId: s.accounts[0]?.id, categoryId: '', note: '', tags: [] };
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  modal(`<div class="row sp"><h1>${x ? t('editMove') : t('newMove')}</h1>${SR && !x ? `<button type="button" class="btn sm" id="mic">${ico('mic', 16)} ${t('voice')}</button>` : ''}</div><form id="txf">
    <div class="seg">${['expense', 'income', 'transfer'].map((k) => `<label><input type="radio" name="type" value="${k}" ${cur.type === k ? 'checked' : ''}><span>${t(k)}</span></label>`).join('')}</div>
    ${fld(t('amount'), `<input name="amount" id="amt" type="text" inputmode="decimal" autocomplete="off" required value="${cur.amount}" placeholder="0.00">`)}<small class="muted" id="calc-prev" style="display:block;margin:-6px 0 8px">${t('calcHint')}</small>
    ${fld(t('date'), `<input name="date" type="date" required value="${cur.date}">`)}
    ${fld(t('account'), `<select name="accountId">${opts(s.accounts, cur.accountId, (a) => `${accName(a)} (${a.currency || S.baseCur()})`)}</select>`)}
    <div id="to-wrap">${fld(t('toAccount'), `<select name="toAccountId">${opts(s.accounts, cur.toAccountId, (a) => `${accName(a)} (${a.currency || S.baseCur()})`)}</select>`)}</div>
    <div id="toamt-wrap" hidden>${fld('<span id="toamt-l"></span>', `<input name="toAmount" type="number" step="0.01" min="0" value="${cur.toAmount ?? ''}">`)}</div>
    <div id="cat-wrap">${fld(t('category'), `<select name="categoryId"></select>`)}</div>
    ${fld(t('note'), `<input name="note" value="${esc(cur.note)}">`)}
    ${fld(t('tags'), `<input name="tags" value="${esc((cur.tags || []).join(', '))}">`)}
    <img class="rcp" id="rcp" alt="" hidden>
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
      const keep = f.categoryId.value || cur.categoryId;
      f.categoryId.innerHTML = list.map((c) => `<option value="${c.id}" ${c.id === keep ? 'selected' : ''}>${esc(catName(c))}</option>`).join('');
      // transferencia entre monedas distintas: pedir monto recibido
      const cf = S.accCur(f.accountId.value), ct = S.accCur(f.toAccountId.value), diff = ty === 'transfer' && cf !== ct;
      $('#toamt-wrap', m).hidden = !diff;
      if (diff) { $('#toamt-l', m).textContent = t('toAmount', { c: ct }); f.toAmount.required = true; if (!f.toAmount.value) { const a = calc(f.amount.value); if (a > 0) f.toAmount.value = Math.round(a * S.rate(cf) / S.rate(ct) * 100) / 100; } } else f.toAmount.required = false;
    };
    f.querySelectorAll('[name=type],[name=accountId],[name=toAccountId]').forEach((r) => r.addEventListener('change', sync));
    sync();
    $('#amt', m).addEventListener('input', (e) => { const v = e.target.value, c = calc(v); $('#calc-prev', m).textContent = /[+\-*/x×÷]/.test(v.replace(/^-/, '')) && c === c ? `= ${c}` : t('calcHint'); });
    x && S.getReceipt(x.id).then((d) => { if (d) { const im = $('#rcp', m); im.src = d; im.hidden = false; } });
    const mic = $('#mic', m);
    if (mic) mic.onclick = () => {
      const r = new SR(); r.lang = getLang() === 'es' ? 'es-ES' : 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      mic.classList.add('rec');
      r.onresult = (ev) => {
        const txt = ev.results[0][0].transcript, v = parseVoice(txt);
        if (!(v.amount > 0)) return toast(t('voiceFail'));
        f.querySelector(`[name=type][value=${v.type}]`).checked = true; sync();
        f.amount.value = v.amount; f.note.value = v.note;
        if (v.cat) f.categoryId.value = v.cat;
        toast(t('voiceHeard', { s: txt }));
      };
      r.onerror = () => toast(t('voiceFail'));
      r.onend = () => { mic.classList.remove('rec'); };
      try { r.start(); } catch { toast(t('voiceNo')); }
    };
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(f), type = fd.get('type'), amount = calc(fd.get('amount'));
      if (!(amount > 0)) { f.amount.focus(); return toast(t('amount')); }
      if (type === 'transfer' && fd.get('accountId') === fd.get('toAccountId')) return toast(t('account'));
      const rec = { id: x?.id || S.uid(), type, amount, date: fd.get('date'), accountId: fd.get('accountId'), note: fd.get('note').trim(), tags: fd.get('tags').split(',').map((g) => g.trim().replace(/^#/, '')).filter(Boolean), created: x?.created || Date.now() };
      if (x && x.debtId) rec.debtId = x.debtId;
      if (type === 'transfer') { rec.toAccountId = fd.get('toAccountId'); if (S.accCur(rec.accountId) !== S.accCur(rec.toAccountId)) rec.toAmount = Math.round(parseFloat(fd.get('toAmount')) * 100) / 100; } else rec.categoryId = fd.get('categoryId');
      const file = fd.get('receipt');
      if (file && file.size) { const data = await shrink(file); if (data && !(await S.setReceipt(rec.id, data))) toast('Sin espacio para el recibo'); }
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
  if (b && (S.spentByCategory(tx.date.slice(0, 7))[tx.categoryId] || 0) > b) notify('budget', 'NoxCount', t('overBudget', { c: catName(catById(tx.categoryId)) }));
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
    const sync = () => { f.categoryId.innerHTML = s.categories.filter((c) => c.type === f.type.value).map((c) => `<option value="${c.id}" ${c.id === cur.categoryId ? 'selected' : ''}>${esc(catName(c))}</option>`).join(''); };
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
  tab: (el) => withVT(() => { V.tab = el.dataset.id; V.sub = null; if (V.tab === 'moves') { V.from = null; } render(); window.scrollTo(0, 0); }),
  sub: (el) => withVT(() => { V.sub = el.dataset.id || null; render(); }),
  close: closeModal,
  mPrev: () => { V.ym = S.addMonthsYM(V.ym, -1); render(); },
  mNext: () => { V.ym = S.addMonthsYM(V.ym, 1); render(); },
  thisMonth: () => { V.from = null; render(); },
  print: () => window.print(),
  newTx: (el) => sharedOpen(el, () => txForm()),
  editTx: (el) => sharedOpen(el, () => txForm(S.get().tx.find((x) => x.id === el.dataset.id))),
  delTx: (el) => {
    const old = S.get().tx.find((x) => x.id === el.dataset.id); if (!old) return;
    let link = null;
    S.update((s) => {
      s.tx = s.tx.filter((x) => x.id !== old.id);
      s.debts.forEach((d) => { const k = (d.payments || []).find((p) => p.txId === old.id); if (k) { link = { did: d.id, k }; d.payments = d.payments.filter((p) => p !== k); } });
    });
    closeModal();
    toast(t('deleted'), { label: t('undo'), fn: () => S.update((s) => { s.tx.push(old); if (link) { const d = s.debts.find((x) => x.id === link.did); if (d) (d.payments = d.payments || []).push(link.k); } }) });
  },
  favTx: (el) => {
    const f = S.get().favorites.find((x) => x.id === el.dataset.id); if (!f) return;
    const rec = { id: S.uid(), type: f.type, amount: f.amount, date: S.today(), accountId: f.accountId, categoryId: f.categoryId, note: f.name, tags: [], created: Date.now() };
    S.update((s) => { s.tx.push(rec); }); toast(t('favRegistered', { n: f.name })); checkBudget(rec);
  },
  newFav: () => favForm(), editFav: (el) => favForm(S.get().favorites.find((f) => f.id === el.dataset.id)),
  toggleHide: () => { S.setDevice({ hide: !S.device().hide }); render(); pushWidget(); },
  hideT: (el) => { S.setDevice({ hide: el.checked }); render(); pushWidget(); },
  profile: () => withVT(() => { V.tab = 'profile'; V.sub = null; render(); window.scrollTo(0, 0); }),
  psec: (el) => withVT(() => { V.psec = el.dataset.id; render(); }),
  rmode: (el) => withVT(() => { V.rmode = el.dataset.id; render(); }),
  yPrev: () => { V.year--; render(); }, yNext: () => { V.year++; render(); },
  bioOn: async () => { try { const id = await bioRegister(); S.setDevice({ bio: id }); render(); } catch { toast(t('bioFail')); } },
  bioOff: () => { S.setDevice({ bio: null }); render(); },
  encOn: () => pinPrompt(async (pin) => { await S.enableEncryption(pin); S.setDevice({ bio: null }); render(); }),
  encOff: () => pinPrompt(async () => { await S.disableEncryption(); render(); }),
  editBudget: (el) => { const c = catById(el.dataset.id); simpleForm(`${ico(c.icon, 22)} ${esc(catName(c))}`, fld(t('budget') + ' / ' + t('thisMonth').toLowerCase(), `<input name="v" type="number" step="0.01" min="0" value="${S.get().budgets[c.id] || ''}" placeholder="0">`), (fd) => { S.update((s) => { const v = num(fd.get('v')); v > 0 ? (s.budgets[c.id] = v) : delete s.budgets[c.id]; }); }); },
  newGoal: () => simpleForm(t('goals'), fld(t('goalName'), '<input name="n" required>') + fld(t('target'), '<input name="g" type="number" step="0.01" min="1" required>'), (fd) => { S.update((s) => s.goals.push({ id: S.uid(), name: fd.get('n').trim(), target: num(fd.get('g')), saved: 0 })); }),
  editGoal: (el) => { const g = S.get().goals.find((x) => x.id === el.dataset.id); simpleForm(`${ico('target', 22)} ${esc(g.name)}`, fld(t('goalName'), `<input name="n" required value="${esc(g.name)}">`) + fld(t('target'), `<input name="g" type="number" step="0.01" min="1" required value="${g.target}">`) + fld(t('saved'), `<input name="sv" type="number" step="0.01" min="0" value="${g.saved}">`) + fld(t('contribute'), '<input name="add" type="number" step="0.01" placeholder="+0.00">'), (fd) => { S.update((s) => { const x = s.goals.find((y) => y.id === g.id); x.name = fd.get('n').trim(); x.target = num(fd.get('g')); x.saved = Math.max(0, num(fd.get('sv')) + num(fd.get('add'))); }); }, () => { S.update((s) => { s.goals = s.goals.filter((y) => y.id !== g.id); }); }); },
  newAcc: () => accForm(), editAcc: (el) => accForm(accById(el.dataset.id)),
  debtOpen: (el) => debtView(el.dataset.id),
  payAdd: (el) => payForm(el.dataset.id),
  paySettle: (el) => { const d = S.get().debts.find((x) => x.id === el.dataset.id); payForm(el.dataset.id, d ? String(debtLeft(d)) : ''); },
  payDel: (el) => {
    if (!confirm(t('payDelConfirm'))) return;
    const did = el.dataset.id, pid = el.dataset.pid;
    S.update((st) => { const d = st.debts.find((x) => x.id === did); const p = (d.payments || []).find((x) => x.id === pid); if (!p) return; d.payments = d.payments.filter((x) => x.id !== pid); st.tx = st.tx.filter((x) => x.id !== p.txId); });
    debtView(did);
  },
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
  setPin: () => S.isEncrypted() ? toast(t('encLocked')) : simpleForm(t('pin'), fld(t('pinNew'), '<input name="p" type="password" inputmode="numeric" pattern="[0-9]{4,6}" minlength="4" maxlength="6" required>'), async (fd) => { S.setDevice({ pin: await hash(fd.get('p')) }); render(); }),
  rmPin: () => { if (S.isEncrypted()) return toast(t('encLocked')); S.setDevice({ pin: null, bio: null }); render(); },
  reset: () => { if (confirm(t('resetConfirm'))) { S.reset(); render(); } },
  saveCfg: () => { try { Cloud.saveConfig($('#cfg-text').value); toast(t('cfgSaved')); setTimeout(() => location.reload(), 700); } catch (e) { toast(t('cfgBad', { e: e.message })); } },
  rmCfg: () => { Cloud.clearConfig(); location.reload(); },
  reload: () => location.reload(),
  onbNext: () => { onbSave(); onbFinish(); },
  onbSkip: () => { S.update((st) => { st.settings.onboarded = true; }); onbClose(); },
  signOut: async () => {
    if (!confirm(t('signOutConfirm'))) return;
    try { await Promise.race([Cloud.push(S.get()), new Promise((_, rj) => setTimeout(rj, 5000))]); } catch { if (!confirm(t('signOutLoss'))) return; }
    try { await Cloud.signOut(); } catch {}
    S.wipe(); S.setDevice({ owner: null, lastUser: null }); location.reload();
  },
};
function favForm(f) {
  const s = S.get(), cur = f || { type: 'expense', name: '', amount: '', accountId: s.accounts[0]?.id, categoryId: '' };
  modal(`<h1>${ico('star', 22)} ${t('favorites')}</h1><form id="sf"><div class="seg">${['expense', 'income'].map((k) => `<label><input type="radio" name="type" value="${k}" ${cur.type === k ? 'checked' : ''}><span>${t(k)}</span></label>`).join('')}</div>
    ${fld(t('name'), `<input name="n" required value="${esc(cur.name)}" placeholder="Café">`)}${fld(t('amount'), `<input name="a" type="text" inputmode="decimal" required value="${cur.amount}">`)}
    ${fld(t('account'), `<select name="accountId">${opts(s.accounts, cur.accountId, (a) => `${accName(a)} (${a.currency || S.baseCur()})`)}</select>`)}${fld(t('category'), '<select name="categoryId"></select>')}
    <button class="btn" type="submit">${t('save')}</button>${f ? `<button class="btn danger" type="button" id="sf-del" style="margin-top:8px">${t('delete')}</button>` : ''}<button class="btn ghost" type="button" data-act="close" style="margin-top:8px">${t('cancel')}</button></form>`, (m) => {
    const fm = $('#sf', m);
    const sync = () => { fm.categoryId.innerHTML = s.categories.filter((c) => c.type === fm.type.value).map((c) => `<option value="${c.id}" ${c.id === cur.categoryId ? 'selected' : ''}>${esc(catName(c))}</option>`).join(''); };
    fm.querySelectorAll('[name=type]').forEach((r) => r.addEventListener('change', sync)); sync();
    fm.addEventListener('submit', (e) => {
      e.preventDefault(); const fd = new FormData(fm), a = calc(fd.get('a')); if (!(a > 0)) return;
      const rec = { id: f?.id || S.uid(), type: fd.get('type'), name: fd.get('n').trim(), amount: a, accountId: fd.get('accountId'), categoryId: fd.get('categoryId') };
      S.update((st) => { const i = st.favorites.findIndex((y) => y.id === rec.id); i >= 0 ? (st.favorites[i] = rec) : st.favorites.push(rec); }); closeModal();
    });
    f && $('#sf-del', m).addEventListener('click', () => { S.update((st) => { st.favorites = st.favorites.filter((y) => y.id !== f.id); }); closeModal(); });
  });
}
function accForm(a) {
  const base = S.baseCur(), curs = [...new Set([base, ...CURS, a?.currency].filter(Boolean))];
  simpleForm(t('accounts'), fld(t('name'), `<input name="n" required value="${esc(a ? accName(a) : '')}">`) + fld(t('type'), `<select name="k">${['cash', 'bank', 'wallet'].map((k) => `<option value="${k}" ${a?.kind === k ? 'selected' : ''}>${t(k)}</option>`).join('')}</select>`) + fld(t('currency'), `<select name="c">${curs.map((c) => `<option ${c === (a?.currency || base) ? 'selected' : ''}>${c}</option>`).join('')}</select>`) + fld(t('initial'), `<input name="i" type="number" step="0.01" value="${a?.initial ?? 0}">`), (fd) => {
    S.update((s) => { const rec = { id: a?.id || S.uid(), name: fd.get('n').trim(), kind: fd.get('k'), currency: fd.get('c'), initial: num(fd.get('i')) }; const i = s.accounts.findIndex((x) => x.id === rec.id); i >= 0 ? (s.accounts[i] = rec) : s.accounts.push(rec); });
  }, a && (() => { if (S.get().tx.some((x) => x.accountId === a.id || x.toAccountId === a.id) || S.get().accounts.length < 2) { toast(t('inUse')); return false; } S.update((s) => { s.accounts = s.accounts.filter((x) => x.id !== a.id); }); }));
}
function debtForm(d) {
  simpleForm(t('debts'), `<div class="seg">${['owe', 'owed'].map((k) => `<label><input type="radio" name="dir" value="${k}" ${(d?.dir || 'owe') === k ? 'checked' : ''}><span>${t(k === 'owe' ? 'iOwe' : 'theyOwe')}</span></label>`).join('')}</div>` + fld(t('who'), `<input name="w" required value="${esc(d?.who || '')}">`) + fld(t('amount'), `<input name="a" type="number" step="0.01" min="0.01" required value="${d?.amount || ''}">`) + fld(t('due'), `<input name="d" type="date" value="${d?.due || ''}">`) + `<div class="toggle"><span>${t('markPaidNoMove')}</span><input type="checkbox" name="p" ${d?.paid ? 'checked' : ''}></div>`, (fd) => {
    const amount = num(fd.get('a')), already = d ? r2(debtPayments(d).reduce((a, p) => a + p.value, 0)) : 0;
    if (d && amount < already) { toast(t('debtLess', { a: M(already) })); return false; }
    S.update((s) => { const rec = { id: d?.id || S.uid(), dir: fd.get('dir'), who: fd.get('w').trim(), amount, due: fd.get('d') || '', paid: fd.get('p') === 'on', payments: d?.payments || [] }; const i = s.debts.findIndex((x) => x.id === rec.id); i >= 0 ? (s.debts[i] = rec) : s.debts.push(rec); });
  }, d && (() => { S.update((s) => { s.debts = s.debts.filter((x) => x.id !== d.id); s.tx.forEach((x) => { if (x.debtId === d.id) delete x.debtId; }); }); }));
}
function catForm(c, type) {
  const cur = c ? iconName(c.icon) : 'tag';
  const picker = `<div class="picker">${PICKABLE.map((n) => `<label><input type="radio" name="i" value="${n}" ${n === cur ? 'checked' : ''}><span>${ico(n, 22)}</span></label>`).join('')}</div>`;
  simpleForm(t('categories'), fld(t('name'), `<input name="n" required value="${esc(c ? catName(c) : '')}">`) + `<label>${t('icon')}</label>` + picker, (fd) => {
    S.update((s) => { if (c) { const x = s.categories.find((y) => y.id === c.id); x.name = fd.get('n').trim(); x.icon = fd.get('i'); } else s.categories.push({ id: S.uid(), name: fd.get('n').trim(), icon: fd.get('i'), type }); });
  }, c && (() => { const s = S.get(); if (s.tx.some((x) => x.categoryId === c.id) || s.recurring.some((x) => x.categoryId === c.id)) { toast(t('inUse')); return false; } S.update((st) => { st.categories = st.categories.filter((x) => x.id !== c.id); delete st.budgets[c.id]; }); }));
}

// ---------- PIN, huella y desbloqueo ----------
async function hash(p) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('nox:' + p)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
// Huella/Face ID con WebAuthn (verificación del sistema en este dispositivo)
async function bioRegister() {
  const cred = await navigator.credentials.create({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'NoxCount' }, user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'noxcount', displayName: 'NoxCount' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' }, timeout: 60000 } });
  return toB64(cred.rawId);
}
async function bioAuth(id) {
  await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)), allowCredentials: [{ type: 'public-key', id: fromB64(id) }], userVerification: 'required', timeout: 60000 } });
}
// pide el PIN actual y ejecuta cb(pin) si es correcto
function pinPrompt(cb) {
  simpleForm(t('pin'), fld(t('enterPin'), '<input name="p" type="password" inputmode="numeric" maxlength="6" required autofocus>'), async (fd) => {
    const p = fd.get('p');
    if ((await hash(p)) !== S.device().pin) { toast(t('wrongPin')); return false; }
    await cb(p);
  });
}
// pantalla de bloqueo; se resuelve cuando la app queda desbloqueada
function lockScreen() {
  return new Promise((resolve) => {
    const el = $('#lock'), d = S.device(), enc = S.isEncrypted();
    if (!d.pin && !enc) { el.hidden = true; return resolve(); }
    el.hidden = false;
    el.innerHTML = `<h1 class="brand">${ico('moon', 30)} NoxCount</h1><form id="lf"><p class="muted">${t('enterPin')}</p><input id="pin" type="password" inputmode="numeric" maxlength="6" autofocus autocomplete="off"><div id="pin-err" class="exp" style="min-height:1.4em"></div><button class="btn" type="submit" style="max-width:200px">OK</button>${d.bio && !enc ? `<br><button class="btn ghost" type="button" id="bio" style="max-width:260px;margin-top:8px">${ico('finger', 18)} ${t('bioUse')}</button>` : ''}</form>`;
    const done = () => { el.hidden = true; el.innerHTML = ''; resolve(); };
    $('#lf').addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = $('#pin').value;
      const ok = enc ? await S.unlock(v) : (await hash(v)) === d.pin;
      if (ok) done(); else { $('#pin-err').textContent = t('wrongPin'); $('#pin').value = ''; }
    });
    const b = $('#bio');
    if (b) { b.onclick = async () => { try { await bioAuth(d.bio); done(); } catch { $('#pin-err').textContent = t('bioFail'); } }; b.click(); }
  });
}

// ---------- acceso obligatorio (registro / inicio de sesión) ----------
let syncState = 'off';
const syncText = () => ({ ok: t('synced'), busy: t('syncing'), off: t('offline') }[syncState] || '');
let pushT;
function schedulePush() {
  if (!Cloud.user()) return;
  syncState = 'busy'; clearTimeout(pushT);
  pushT = setTimeout(async () => { try { await Cloud.push(S.get()); syncState = 'ok'; } catch { syncState = 'off'; } if (V.tab === 'profile') render(); }, 1200);
}
function authShell(inner) { const el = $('#auth'); el.hidden = false; el.innerHTML = `<div class="authwrap">${inner}</div>`; }
const logoBig = (named) => `<div class="logo-big" ${named ? 'style="view-transition-name:logo"' : ''}>${ico('moon', 56)}</div>`;
function authSplash() { authShell(`${logoBig()}<h1 class="c">NoxCount</h1><p class="muted c">${t('loading')}</p>`); }
function authFail(msg) { authShell(`${logoBig()}<h1 class="c">NoxCount</h1><p class="exp c">${esc(msg)}</p><button class="btn" data-act="reload">${t('retry')}</button>`); }
function setupScreen() {
  authShell(`${logoBig()}<h1 class="c">${t('setupTitle')}</h1><p class="muted c">${t('setupHint')}</p><div class="card"><p class="muted" style="margin-top:0">${t('cfgHelp')}</p>
    <textarea id="cfg-text" rows="6" placeholder='apiKey: "...", authDomain: "...", projectId: "...", appId: "..."'></textarea>
    <button class="btn" data-act="saveCfg">${ico('cloud', 18)} ${t('cfgSave')}</button><p class="sub" style="margin-bottom:0">${t('cfgSteps')}</p></div>`);
}
function authErr(e) {
  const c = Cloud.errCode(e);
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(c)) return t('errCreds');
  if (c === 'auth/email-already-in-use') return t('errExists');
  if (c === 'auth/weak-password') return t('errWeak');
  if (c === 'auth/network-request-failed') return t('errNet');
  if (c === 'auth/operation-not-allowed') return t('errOp');
  if (c === 'auth/unauthorized-domain') return t('errDomain');
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  return t('errGeneric') + (c ? ` (${c})` : '');
}
function authScreen(msg = '') {
  V.authShown = true;
  const mode = V.authMode || 'login', email = ($('#a-email') && $('#a-email').value) || '';
  authShell(`${logoBig(true)}<h1 class="c">NoxCount</h1><p class="muted c">${t('loginSub')}</p>
  <form id="af" class="card authcard" style="view-transition-name:authcard">
    <div class="seg">${[['login', 'tabLogin'], ['signup', 'signUp']].map(([k, l]) => `<label><input type="radio" name="mode" value="${k}" ${mode === k ? 'checked' : ''}><span>${t(l)}</span></label>`).join('')}</div>
    ${fld(t('email'), `<input id="a-email" name="e" type="email" required autocomplete="email" value="${esc(email)}">`)}
    ${fld(t('password'), `<input name="p" type="password" minlength="6" required autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}">`)}
    <div id="aerr" class="exp" style="min-height:1.3em">${esc(msg)}</div>
    <button class="btn" type="submit">${mode === 'login' ? t('signIn') : t('signUp')}</button>
    <button class="btn ghost" type="button" id="gg" style="margin-top:8px">${ico('globe', 18)} ${t('google')}</button>
    ${mode === 'login' ? `<button class="linkb" type="button" id="fg">${t('forgot')}</button>` : ''}</form>`);
  const f = $('#af'), err = (e) => { const a = $('#aerr'); a.className = 'exp'; a.textContent = authErr(e); }, busy = (b) => f.querySelectorAll('button').forEach((x) => { x.disabled = b; });
  f.querySelectorAll('[name=mode]').forEach((r) => r.addEventListener('change', () => { V.authMode = r.value; authScreen(); }));
  f.addEventListener('submit', async (e) => { e.preventDefault(); busy(true); try { await (mode === 'login' ? Cloud.signIn : Cloud.signUp)(f.e.value.trim(), f.p.value); } catch (er) { err(er); busy(false); } });
  $('#gg').onclick = async () => { busy(true); try { await Cloud.google(); } catch (er) { err(er); busy(false); } };
  const fg = $('#fg');
  if (fg) fg.onclick = async () => { const em = f.e.value.trim(); if (!em) return err({ code: '' }), ($('#aerr').textContent = t('needEmail')); try { await Cloud.resetPassword(em); $('#aerr').className = 'inc'; $('#aerr').textContent = t('resetSent'); } catch (er) { err(er); } };
}
let entered = false;
async function enter(u, fromLogin, offline) {
  if (entered) return; entered = true;
  const d = S.device();
  let merged = false;
  try {
    if (!offline) {
      const remote = await Cloud.pull();
      if (d.owner === u.uid) { if (remote && remote.updatedAt > S.get().updatedAt) S.replace(remote.state); else await Cloud.push(S.get()); }
      else if (!d.owner) { // datos de este dispositivo anteriores al registro
        if (remote) { if (S.hasData()) { S.replace(S.merge(remote.state, S.get())); merged = true; } else S.replace(remote.state); }
        else merged = S.hasData();
        await Cloud.push(S.get());
      } else { S.wipe(); if (remote) S.replace(remote.state); } // otra cuenta usó antes este dispositivo
      syncState = 'ok';
      Cloud.listen((st) => { if (st.updatedAt > S.get().updatedAt) S.replace(st); });
    }
  } catch (e) {
    if (d.owner !== u.uid) { entered = false; try { await Cloud.signOut(); } catch {} return authScreen(t('errNet')); }
    syncState = 'off';
  }
  S.setDevice({ owner: u.uid, lastUser: { uid: u.uid, email: u.email } });
  showDashboard(fromLogin && V.authShown, merged);
}
function showDashboard(anim, merged) {
  const go = () => { const a = $('#auth'); a.hidden = true; a.innerHTML = ''; V.tab = 'home'; V.sub = null; S.runRecurring(); render(); };
  if (anim && !reduced() && document.startViewTransition) { V.vtLogin = true; document.startViewTransition(go).finished.finally(() => { V.vtLogin = false; render(); }); } else go();
  startupNotices(); checkReminder(); setInterval(checkReminder, 60000); pushWidget();
  if (merged) setTimeout(() => toast(t('merged')), 700);
  if (!S.get().settings.onboarded) setTimeout(onboarding, anim ? 900 : 100);
}
function onUser(u) { if (u) enter(u, true, false); else if (!entered) authScreen(); }

// ---------- guía inicial de 3 pasos ----------
function onboarding() { V.onb = { bal: {} }; renderOnb(); }
function onbSave() { document.querySelectorAll('[data-obal]').forEach((i) => { V.onb.bal[i.dataset.obal] = i.value; }); }
function renderOnb() {
  const o = V.onb, el = $('#onb'), st = S.get(), base = S.baseCur();
  el.hidden = false;
  el.innerHTML = `<div class="sheet onb"><div class="row sp"><span class="sub">${t('hello')}</span><button class="linkb" data-act="onbSkip">${t('skip')}</button></div>
    <h1>${t('onbAccQ')}</h1><p class="muted">${t('onbAccHint')}</p>${st.accounts.map((a) => `<label>${esc(accName(a))} (${a.currency || base})<input data-obal="${a.id}" type="number" step="0.01" inputmode="decimal" value="${o.bal[a.id] ?? (a.initial || '')}" placeholder="0"></label>`).join('')}
    <button class="btn" data-act="onbNext" style="margin-top:6px">${t('start')}</button></div>`;
  const first = el.querySelector('input'); if (first && !reduced()) first.focus({ preventScroll: true });
}
function onbClose() { const el = $('#onb'); el.hidden = true; el.innerHTML = ''; render(); }
function onbFinish() {
  const o = V.onb;
  S.update((s) => {
    s.accounts.forEach((a) => { const v = o.bal[a.id]; if (v !== undefined && v !== '') a.initial = num(v); });
    s.settings.onboarded = true;
  });
  onbClose();
}

// ---------- avisos al abrir ----------
function startupNotices() {
  const d = S.device(), n = d.notif || {}, t0 = S.today();
  if (n.due && d.lastDue !== t0) {
    const soon = dueList().filter((x) => x.date <= S.addDays(t0, 3));
    if (soon.length) { S.setDevice({ lastDue: t0 }); notify('due', 'NoxCount', t('dueSoon', { n: soon.map((x) => x.text).join(', ') })); }
  }
  if (n.summary) {
    const dt = new Date(), wk = `${dt.getFullYear()}-W${Math.floor((dt - new Date(dt.getFullYear(), 0, 1)) / 6048e5)}`;
    if (d.lastWeek !== wk) {
      S.setDevice({ lastWeek: wk });
      if (d.lastWeek) { const e = S.sumTx(S.txInRange(S.addDays(t0, -6), t0), 'expense'); notify('summary', 'NoxCount', t('weeklyShort', { a: M(e) })); }
    }
  }
}

// ---------- recordatorio diario ----------
function checkReminder() {
  const d = S.device();
  if (!(d.notif || {}).remind || S.isLocked()) return;
  const now = new Date(), hhmm = `${S.pad(now.getHours())}:${S.pad(now.getMinutes())}`, t0 = S.today();
  if (hhmm >= (d.remindTime || '20:00') && d.lastRemind !== t0 && !S.get().tx.some((x) => x.date === t0)) {
    S.setDevice({ lastRemind: t0 }); notify('remind', 'NoxCount', t('remindText'));
  }
}

// ---------- widget de Android (solo en la app nativa con Capacitor) ----------
function pushWidget() {
  const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NoxWidget;
  if (!P || S.isLocked()) return;
  const hide = S.device().hide || S.isEncrypted(), ym = S.today().slice(0, 7), mt = S.monthTx(ym), mask = '••••••';
  P.update({ balance: hide ? mask : money(S.totalBalance(), S.baseCur()), income: hide ? mask : money(S.sumTx(mt, 'income'), S.baseCur()), expense: hide ? mask : money(S.sumTx(mt, 'expense'), S.baseCur()), month: monthName(ym) }).catch(() => {});
}

// ---------- arranque ----------
document.addEventListener('click', (e) => {
  const c = e.target.closest('[data-chart]');
  if (c) { const txt = (V.charts[c.dataset.chart] || [])[+c.dataset.i], box = $('#d-' + c.dataset.chart); if (box && txt) box.textContent = txt; return; }
  const el = e.target.closest('[data-act]');
  if (el && el.dataset.act !== 'notif' && A[el.dataset.act]) A[el.dataset.act](el);
});
document.addEventListener('input', (e) => {
  if (e.target.id === 'f-q') { V.q = e.target.value; $('#mlist').innerHTML = movesList(); }
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'f-from' || id === 'f-to') { V.from = $('#f-from').value || V.from; V.to = $('#f-to').value || V.to; render(); }
  else if (id === 's-lang') { S.setDevice({ lang: e.target.value }); setLang(e.target.value); render(); }
  else if (id === 's-base') { S.update((s) => { s.settings.base = e.target.value; s.settings.rates = {}; }); render(); }
  else if (id === 's-remind') S.setDevice({ remindTime: e.target.value, lastRemind: null });
  else if (e.target.dataset.rate) S.update((s) => { const v = parseFloat(e.target.value); v > 0 ? (s.settings.rates[e.target.dataset.rate] = v) : delete s.settings.rates[e.target.dataset.rate]; });
  else if (e.target.dataset.act === 'notif') A.notif(e.target);
});
S.subscribe(() => { if ($('#modal').hidden && $('#lock').hidden && $('#auth').hidden && $('#onb').hidden) render(); pushWidget(); });
S.onSave(schedulePush);

setLang(S.device().lang || ((navigator.language || 'es').startsWith('en') ? 'en' : 'es'));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
(async () => {
  await lockScreen();
  if (!Cloud.configured()) return setupScreen();
  authSplash();
  const ok = await Cloud.init(onUser);
  if (!ok) { const last = S.device().lastUser; if (last && S.device().owner === last.uid) enter(last, false, true); else authFail(`${t('needConn')} ${t('cfgFail')}`); }
})();
