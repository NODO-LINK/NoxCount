import * as S from './store.js';
import { t, setLang, getLang, money, monthName, dayName } from './i18n.js';
import * as Ch from './charts.js';
import * as Cloud from './cloud.js';
import { ico, PICKABLE, iconName } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const V = { tab: 'home', sub: null, ym: S.today().slice(0, 7), from: null, to: null, q: '', rmode: 'month', year: new Date().getFullYear(), charts: {} };
const CURS = ['USD', 'EUR', 'GBP', 'MXN', 'COP', 'ARS', 'PEN', 'CLP', 'BRL', 'UYU', 'BOB', 'CRC', 'DOP', 'GTQ', 'VES'];
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
  const items = [['home', 'home', t('home')], ['moves', 'receipt', t('moves')], ['add', 'plus', ''], ['plan', 'calc', t('plan')], ['reports', 'chart', t('reports')], ['more', 'menu', t('more')]];
  $('#nav').innerHTML = items.map(([k, i, l]) => k === 'add' ? `<button class="fab" data-act="newTx" aria-label="${t('newMove')}">${ico('plus', 26)}</button>` : `<button class="${V.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${ico(i, 22)}<span>${l}</span></button>`).join('');
}
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function render() {
  document.title = 'NoxCount';
  const views = { home, moves, reports, plan, more };
  const key = V.tab + '|' + V.sub + '|' + V.rmode + '|' + V.ym, view = $('#view');
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
  s.debts.filter((d) => !d.paid && d.due && d.due <= lim).forEach((d) => out.push({ date: d.due, icon: d.dir === 'owe' ? 'up' : 'down', text: d.who, amount: d.amount }));
  s.recurring.filter((r) => r.next <= lim && r.type === 'expense').forEach((r) => out.push({ date: r.next, icon: 'repeat', text: r.note || catName(catById(r.categoryId)), amount: r.amount, rid: r.id }));
  return out.sort((a, b) => (a.date < b.date ? -1 : 1));
}

function availCard() {
  const st = S.get().settings, t0 = S.today(), ym = t0.slice(0, 7);
  const bsum = Object.values(S.get().budgets).reduce((a, b) => a + b, 0);
  const limit = bsum > 0 ? bsum : st.income > 0 ? st.income * (st.rule.n + st.rule.w) / 100 : 0;
  if (!limit) return '';
  const spent = S.sumTx(S.monthTx(ym), 'expense'), left = limit - spent, daysLeft = Number(S.monthEnd(ym).slice(8)) - Number(t0.slice(8)) + 1;
  return `<div class="card"><div class="row sp"><span class="muted">${t('availSpend')}</span><b>${M(Math.max(0, left))}</b></div>${bar(spent, limit)}
    <div class="sub" style="margin-top:8px">${left > 0 ? t('perDay', { a: M(left / daysLeft) }) : t('overLimit', { a: M(-left) })}</div></div>`;
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
  const spent = S.spentByCategory(ym);
  const bud = Object.entries(s.budgets).filter(([, v]) => v > 0).map(([id, v]) => ({ id, v, p: (spent[id] || 0) / v })).sort((a, b) => b.p - a.p).slice(0, 4);
  const d7 = S.sumTx(S.txInRange(S.addDays(S.today(), -6), S.today()), 'expense'), p7 = S.sumTx(S.txInRange(S.addDays(S.today(), -13), S.addDays(S.today(), -7)), 'expense');
  const delta = p7 ? `${d7 >= p7 ? '+' : ''}${Math.round(((d7 - p7) / p7) * 100)}%` : '—';
  const due = dueList();
  const favs = s.favorites.length ? `<div class="chips">${s.favorites.map((f) => `<button class="chip" data-act="favTx" data-id="${f.id}">${ico(catById(f.categoryId)?.icon || 'star', 16)} ${esc(f.name)} <b class="${cls(f.type)}">${M(f.amount, S.accCur(f.accountId))}</b></button>`).join('')}</div>` : '';
  return `<div class="row sp"><h1>NoxCount ${syncBadge()}</h1><span class="row" style="gap:2px">${Cloud.user() ? '' : `<button class="chip" data-act="cloudBtn">${ico('cloud', 16)} ${Cloud.configured() ? t('signIn') : t('localMode')}</button>`}<button class="eye" data-act="toggleHide" aria-label="${t('hide')}">${ico(S.device().hide ? 'eyeoff' : 'eye', 22)}</button></span></div>
  <div class="card hero"><div class="muted">${t('balance')} · ${S.baseCur()}</div><div class="big" data-count="${S.totalBalance()}" data-cur="${S.baseCur()}">${M(S.totalBalance())}</div></div>
  ${availCard()}
  ${favs}
  <div class="grid2"><div class="card"><div class="muted">${t('income')} · ${t('thisMonth')}</div><b class="inc">${M(inc)}</b></div><div class="card"><div class="muted">${t('expense')} · ${t('thisMonth')}</div><b class="exp">${M(exp)}</b></div></div>
  <h2>${t('weekly')}</h2><div class="card">${t('weeklyText', { a: M(d7), d: delta })}</div>
  ${insights()}
  <h2>${t('budgets')}</h2><div class="card">${bud.length ? bud.map((b) => progress(catName(catById(b.id)), catById(b.id)?.icon, spent[b.id] || 0, b.v)).join('') : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('goals')}</h2><div class="card">${s.goals.length ? s.goals.map((g) => progress(g.name, 'target', g.saved, g.target)).join('') : `<span class="muted">${t('nothing')}</span>`}</div>
  <h2>${t('upcoming')}</h2><div class="card">${due.length ? due.map((d) => `<div class="row sp" style="padding:6px 0"><span>${ico(d.icon, 15)} ${esc(d.text)}<br><small class="muted">${dayName(d.date)}</small></span><b>${M(d.amount)}</b></div>`).join('') : `<span class="muted">${t('nothing')}</span>`}</div>`;
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
  return `<h1>${t('moves')}</h1>
  <div class="search">${ico('search', 18)}<input id="f-q" type="search" placeholder="${t('search')}" value="${esc(V.q)}" autocomplete="off"></div>
  <div class="card"><div class="grid2" style="gap:8px"><div>${fld(t('from'), `<input type="date" id="f-from" value="${V.from}">`)}</div><div>${fld(t('to'), `<input type="date" id="f-to" value="${V.to}">`)}</div></div>
  <button class="btn ghost sm" data-act="thisMonth">${t('thisMonth')}</button></div>
  <div id="mlist">${movesList()}</div>`;
}

function reports() {
  const modeTabs = `<div class="seg noprint"><label><input type="radio" name="rmode" value="month" ${V.rmode === 'month' ? 'checked' : ''} data-act="rmode" data-id="month"><span>${t('monthly')}</span></label><label><input type="radio" name="rmode" value="year" ${V.rmode === 'year' ? 'checked' : ''} data-act="rmode" data-id="year"><span>${t('annual')}</span></label></div>`;
  V.charts = {};
  return `<h1>${t('reports')}</h1>${modeTabs}${V.rmode === 'year' ? yearReport() : monthReport()}<button class="btn noprint" data-act="print">${ico('file', 18)} ${t('print')}</button>`;
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

// ---------- calculadora de presupuesto: "cuánto cobras" -> reparto por categoría ----------
const NEEDS = { e_rent: 0.38, e_food: 0.27, e_transport: 0.13, e_services: 0.14, e_health: 0.08 };
const WANTS = { e_leisure: 0.35, e_shop: 0.35, e_edu: 0.15, e_other: 0.15 };
const RULES = { bal: [50, 30, 20, 'ruleBal'], high: [60, 20, 20, 'ruleHigh'], save: [40, 30, 30, 'ruleSave'] };
function planCalc(income, rule) {
  const cats = S.get().categories.filter((c) => c.type === 'expense');
  const split = (list, base, total) => { const sw = list.reduce((a, c) => a + (base[c.id] ?? 0.1), 0) || 1; return list.map((c) => ({ id: c.id, amount: Math.round(total * (base[c.id] ?? 0.1) / sw) })); };
  const nT = income * rule.n / 100, wT = income * rule.w / 100, sT = income * rule.s / 100;
  return { needs: { total: nT, items: split(cats.filter((c) => NEEDS[c.id]), NEEDS, nT) }, wants: { total: wT, items: split(cats.filter((c) => !NEEDS[c.id]), WANTS, wT) }, savings: sT };
}
const ruleKey = (r) => Object.entries(RULES).find(([, v]) => v[0] === r.n && v[1] === r.w && v[2] === r.s)?.[0] || 'custom';
function planPreview(income) {
  const r = S.get().settings.rule;
  if (!(income > 0)) return `<div class="muted" style="margin:10px 0">${t('planHint')}</div>`;
  const c = planCalc(income, r), row = (cls2, label, pct, amt, items) => `<div class="legend2"><div class="row sp"><span class="row" style="gap:8px"><i class="sw ${cls2}"></i><b>${label}</b> <span class="muted">${pct}%</span></span><b>${M(amt)}</b></div>${(items || []).map((i) => `<div class="row sp sub"><span class="row" style="gap:6px">${ico(catById(i.id)?.icon, 14)}${esc(catName(catById(i.id)))}</span><span>${M(i.amount)}</span></div>`).join('')}</div>`;
  return `<div class="split"><i class="s1" style="width:${r.n}%"></i><i class="s2" style="width:${r.w}%"></i><i class="s3" style="width:${r.s}%"></i></div>
    ${row('s1', t('needs'), r.n, c.needs.total, c.needs.items)}${row('s2', t('wants'), r.w, c.wants.total, c.wants.items)}${row('s3', t('savingsG'), r.s, c.savings)}`;
}
function planCalcCard() {
  const s = S.get(), st = s.settings, k = V.customRule ? 'custom' : ruleKey(st.rule), inc = V.planIncome ?? (st.income || '');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return `<h2>${t('planTitle')}</h2><div class="card">
    ${fld(`${t('incomeQ')} (${S.baseCur()})`, `<div class="row"><input id="inc-in" class="bigin" type="text" inputmode="decimal" autocomplete="off" placeholder="0" value="${inc}">${SR ? `<button type="button" class="btn sm ghost" data-act="incMic" aria-label="${t('speak')}">${ico('mic', 18)}</button>` : ''}</div>`)}
    <div class="seg" style="flex-wrap:wrap">${[...Object.entries(RULES).map(([id, v]) => [id, t(v[3])]), ['custom', t('ruleCustom')]].map(([id, l]) => `<label style="min-width:46%"><input type="radio" name="rule" value="${id}" ${k === id ? 'checked' : ''} data-act="rule" data-id="${id}"><span>${l}</span></label>`).join('')}</div>
    ${k === 'custom' ? `<div class="grid2" style="gap:8px">${[['n', 'needs'], ['w', 'wants'], ['s', 'savingsG']].map(([f, l]) => `<label>${t(l)} %<input type="number" min="0" max="100" data-rule="${f}" value="${st.rule[f]}"></label>`).join('')}</div>` : ''}
    <div id="plan-prev">${planPreview(calcNum(inc))}</div>
    <div class="toggle"><span>${t('schedIncome')}</span><input type="checkbox" id="plan-sched"></div>
    <div class="grid2" style="gap:8px">${fld(t('account'), `<select id="plan-acc">${opts(s.accounts, s.accounts[0]?.id, accName)}</select>`)}${fld(t('payDay'), `<input id="plan-day" type="number" min="1" max="28" value="${st.incomeDay || 1}">`)}</div>
    <div class="toggle"><span>${t('makeGoal')}</span><input type="checkbox" id="plan-goal" checked></div>
    <button class="btn" data-act="applyPlan">${ico('sparkles', 18)} ${t('applyPlan')}</button></div>`;
}
const calcNum = (v) => { const n = typeof v === 'number' ? v : calc(v); return n > 0 ? n : 0; };
function plan() {
  const s = S.get(), sp = S.spentByCategory(V.ym);
  const ex = s.categories.filter((c) => c.type === 'expense');
  return `<h1>${t('plan')}</h1>${planCalcCard()}${monthNav()}
  <h2>${t('budgets')}</h2><div class="card">${ex.map((c) => { const b = s.budgets[c.id] || 0; return `<div class="item" data-act="editBudget" data-id="${c.id}"><div class="ico">${ico(c.icon)}</div><div class="grow">${esc(catName(c))}${b ? `<div class="row sp"><span class="muted">${M(sp[c.id] || 0)} ${t('of')} ${M(b)}</span></div>${bar(sp[c.id] || 0, b)}` : `<div class="muted" style="font-size:.8rem">${M(sp[c.id] || 0)} · ${t('add')} ${t('budget').toLowerCase()}</div>`}</div></div>`; }).join('')}</div>
  <h2>${t('goals')}</h2><div class="card">${s.goals.map((g) => `<div class="item" data-act="editGoal" data-id="${g.id}"><div class="ico">${ico('target')}</div><div class="grow">${progress(g.name, '', g.saved, g.target)}</div></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}
  <button class="btn ghost" style="margin-top:10px" data-act="newGoal">+ ${t('goals')}</button></div>`;
}

function more() {
  const s = S.get();
  const back = `<button class="btn ghost sm" data-act="sub" data-id="">${ico('left', 16)} ${t('more')}</button>`;
  if (!V.sub) {
    return `<h1>${t('more')}</h1><div class="card menu">${[['accounts', 'wallet'], ['favorites', 'star'], ['debts', 'swap'], ['recurring', 'repeat'], ['categories', 'tag'], ['settings', 'sliders']].map(([k, i]) => `<div class="item" data-act="sub" data-id="${k}"><div class="ico">${ico(i)}</div><div class="grow">${t(k)}</div><span class="chev">${ico('right', 18)}</span></div>`).join('')}</div>`;
  }
  if (V.sub === 'accounts') {
    return `${back}<h1>${t('accounts')}</h1><div class="card">${s.accounts.map((a) => `<div class="item" data-act="editAcc" data-id="${a.id}"><div class="ico">${ico({ cash: 'cash', bank: 'bank', wallet: 'phone' }[a.kind])}</div><div class="grow">${esc(accName(a))}<br><small class="muted">${t(a.kind)} · ${a.currency || S.baseCur()}</small></div><b>${M(S.accountBalance(a), a.currency)}</b></div>`).join('')}
    <button class="btn" style="margin-top:10px" data-act="newAcc">+ ${t('accounts')}</button></div>`;
  }
  if (V.sub === 'debts') {
    const row = (d) => `<div class="item" data-act="editDebt" data-id="${d.id}"><div class="ico">${ico(d.dir === 'owe' ? 'up' : 'down')}</div><div class="grow"><span style="${d.paid ? 'text-decoration:line-through' : ''}">${esc(d.who)}</span><br><small class="muted">${d.paid ? t('paid') : d.due ? t('due') + ' ' + dayName(d.due) : t('pending')}</small></div><b class="${d.dir === 'owe' ? 'exp' : 'inc'}">${M(d.amount)}</b></div>`;
    const tot = (dir) => s.debts.filter((d) => d.dir === dir && !d.paid).reduce((a, d) => a + d.amount, 0);
    return `${back}<h1>${t('debts')}</h1><div class="grid2"><div class="card"><span class="muted">${t('iOwe')}</span><br><b class="exp">${M(tot('owe'))}</b></div><div class="card"><span class="muted">${t('theyOwe')}</span><br><b class="inc">${M(tot('owed'))}</b></div></div>
    <div class="card" style="margin-top:12px">${s.debts.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newDebt">+ ${t('debts')}</button></div>`;
  }
  if (V.sub === 'recurring') {
    const row = (r) => { const due = r.next <= S.today(); return `<div class="item" data-act="editRec" data-id="${r.id}"><div class="ico">${ico(catById(r.categoryId)?.icon || 'repeat')}</div><div class="grow">${esc(r.note || catName(catById(r.categoryId)))}<br><small class="muted">${t(r.freq + 'F')} · ${dayName(r.next)}${r.auto ? ' · auto' : ''}</small></div><div style="text-align:right"><b class="${cls(r.type)}">${M(r.amount)}</b>${due && !r.auto ? `<br><button class="btn sm" data-act="confirmRec" data-id="${r.id}">${t('confirm')}</button>` : ''}</div></div>`; };
    return `${back}<h1>${t('recurring')}</h1><div class="card">${s.recurring.map(row).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newRec">+ ${t('recurring')}</button></div>`;
  }
  if (V.sub === 'categories') {
    const block = (type) => `<h2>${t(type)}</h2><div class="card">${s.categories.filter((c) => c.type === type).map((c) => `<div class="item" data-act="editCat" data-id="${c.id}"><div class="ico">${ico(c.icon)}</div><div class="grow">${esc(catName(c))}</div></div>`).join('')}<button class="btn ghost" style="margin-top:10px" data-act="newCat" data-id="${type}">+ ${t('add')}</button></div>`;
    return `${back}<h1>${t('categories')}</h1>${block('expense')}${block('income')}`;
  }
  if (V.sub === 'favorites') {
    return `${back}<h1>${t('favorites')}</h1><p class="muted">${t('favHint')}</p><div class="card">${s.favorites.map((f) => `<div class="item" data-act="editFav" data-id="${f.id}"><div class="ico">${ico(catById(f.categoryId)?.icon || 'star')}</div><div class="grow">${esc(f.name)}<br><small class="muted">${esc(accName(accById(f.accountId)))}</small></div><b class="${cls(f.type)}">${M(f.amount, S.accCur(f.accountId))}</b></div>`).join('') || `<span class="muted">${t('nothing')}</span>`}<button class="btn" style="margin-top:10px" data-act="newFav">+ ${t('favAdd')}</button></div>`;
  }
  if (V.sub === 'settings') {
    const d = S.device(), n = d.notif || {}, u = Cloud.user(), enc = S.isEncrypted(), base = S.baseCur();
    const tg = (k, l) => `<div class="toggle"><span>${l}</span><input type="checkbox" data-act="notif" data-id="${k}" ${n[k] ? 'checked' : ''}></div>`;
    const used = [...new Set(s.accounts.map((a) => a.currency || base))].filter((c) => c !== base);
    const rateRows = used.map((c) => `<label>${t('rateHelp', { c, b: base })}<input type="number" step="any" min="0" data-rate="${c}" value="${s.settings.rates[c] || ''}" placeholder="0.00"></label>`).join('');
    const bioOk = !!window.PublicKeyCredential && !enc && d.pin;
    return `${back}<h1>${t('settings')}</h1>
    <div class="card">${fld(t('language'), `<select id="s-lang"><option value="es" ${getLang() === 'es' ? 'selected' : ''}>Español</option><option value="en" ${getLang() === 'en' ? 'selected' : ''}>English</option></select>`)}
    <div class="toggle"><span>${t('hide')}</span><input type="checkbox" data-act="hideT" ${d.hide ? 'checked' : ''}></div></div>
    <h2>${t('currency')}</h2><div class="card">${fld(t('baseCur'), `<select id="s-base">${CURS.map((c) => `<option ${c === base ? 'selected' : ''}>${c}</option>`).join('')}</select>`)}${rateRows ? `<h2 style="margin-top:4px">${t('rates')}</h2>${rateRows}` : ''}</div>
    <h2>${t('pin')}</h2><div class="card">${d.pin ? `<button class="btn danger" data-act="rmPin">${t('removePin')}</button>` : `<button class="btn ghost" data-act="setPin">${t('setPin')}</button>`}
    ${bioOk ? `<button class="btn ghost" style="margin-top:8px" data-act="${d.bio ? 'bioOff' : 'bioOn'}">${d.bio ? t('bioRemove') : t('bioSet')}</button>` : ''}</div>
    <h2>${t('encrypt')}</h2><div class="card"><p class="muted" style="margin-top:0">${t('encWarn')}</p>${enc ? `<div class="row" style="margin-bottom:8px;gap:6px">${ico("check", 16)}${t("encActive")}</div><button class="btn danger" data-act="encOff">${t('encOff')}</button>` : d.pin ? `<button class="btn ghost" data-act="encOn">${t('encOn')}</button>` : `<span class="muted">${t('needPin')}</span>`}</div>
    <h2>${t('notifs')}</h2><div class="card">${tg('due', t('nDue'))}${tg('budget', t('nBudget'))}${tg('summary', t('nSummary'))}${tg('remind', t('remind'))}${fld(t('remindAt'), `<input type="time" id="s-remind" value="${d.remindTime || '20:00'}">`)}</div>
    <h2>${t('cloud')}</h2><div class="card">${cloudCard(u)}</div>
    <h2></h2><button class="btn danger" data-act="reset">${t('reset')}</button>`;
  }
  return '';
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
    S.update((s) => { s.tx = s.tx.filter((x) => x.id !== old.id); });
    closeModal();
    toast(t('deleted'), { label: t('undo'), fn: () => S.update((s) => { s.tx.push(old); }) });
  },
  favTx: (el) => {
    const f = S.get().favorites.find((x) => x.id === el.dataset.id); if (!f) return;
    const rec = { id: S.uid(), type: f.type, amount: f.amount, date: S.today(), accountId: f.accountId, categoryId: f.categoryId, note: f.name, tags: [], created: Date.now() };
    S.update((s) => { s.tx.push(rec); }); toast(t('favRegistered', { n: f.name })); checkBudget(rec);
  },
  rule: (el) => { const r = RULES[el.dataset.id]; V.customRule = !r; S.update((st) => { if (r) st.settings.rule = { n: r[0], w: r[1], s: r[2] }; }); },
  incMic: () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return toast(t('voiceNo'));
    const r = new SR(); r.lang = getLang() === 'es' ? 'es-ES' : 'en-US';
    r.onresult = (ev) => { const v = parseVoice(ev.results[0][0].transcript); if (v.amount > 0) { $('#inc-in').value = v.amount; $('#inc-in').dispatchEvent(new Event('input', { bubbles: true })); $('#inc-in').dispatchEvent(new Event('change', { bubbles: true })); } else toast(t('voiceFail')); };
    r.onerror = () => toast(t('voiceFail'));
    try { r.start(); } catch { toast(t('voiceNo')); }
  },
  applyPlan: () => {
    const income = calcNum($('#inc-in').value), st = S.get().settings, r = st.rule;
    if (!income) { $('#inc-in').focus(); return toast(t('needIncome')); }
    if (r.n + r.w + r.s !== 100) return toast(t('sum100'));
    const c = planCalc(income, r), acc = $('#plan-acc').value, day = Math.min(28, Math.max(1, parseInt($('#plan-day').value) || 1));
    S.update((s) => {
      s.settings.income = income; s.settings.incomeDay = day;
      [...c.needs.items, ...c.wants.items].forEach((i) => { i.amount > 0 ? (s.budgets[i.id] = i.amount) : delete s.budgets[i.id]; });
      if ($('#plan-goal').checked && c.savings > 0) { const g = s.goals.find((x) => x.auto); const target = Math.round(c.savings * 12); g ? (g.target = target) : s.goals.push({ id: S.uid(), name: t('goalMonthly'), target, saved: 0, auto: true }); }
      if ($('#plan-sched').checked) {
        const now = new Date(), ym = S.today().slice(0, 7); let next = `${ym}-${S.pad(day)}`; if (next < S.today()) next = `${S.addMonthsYM(ym, 1)}-${S.pad(day)}`;
        const rec = { type: 'income', amount: income, accountId: acc, categoryId: 'i_salary', note: t('salaryNote'), freq: 'monthly', next, auto: false, plan: true };
        const old = s.recurring.find((x) => x.plan); old ? Object.assign(old, rec) : s.recurring.push({ id: S.uid(), ...rec });
      }
    });
    toast(t('planApplied'));
  },
  newFav: () => favForm(), editFav: (el) => favForm(S.get().favorites.find((f) => f.id === el.dataset.id)),
  toggleHide: () => { S.setDevice({ hide: !S.device().hide }); render(); pushWidget(); },
  hideT: (el) => { S.setDevice({ hide: el.checked }); render(); pushWidget(); },
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
  authOpen: () => authForm(),
  skipAuth: () => { S.setDevice({ skipAuth: true }); closeModal(); },
  saveCfg: () => { try { Cloud.saveConfig($('#cfg-text').value); S.setDevice({ skipAuth: false }); toast(t('cfgSaved')); setTimeout(() => location.reload(), 700); } catch (e) { toast(t('cfgBad', { e: e.message })); } },
  rmCfg: () => { Cloud.clearConfig(); location.reload(); },
  cloudBtn: () => { if (Cloud.configured() && Cloud.ready()) return authForm(); V.tab = 'more'; V.sub = 'settings'; render(); },
  signOut: async () => { await Cloud.signOut(); render(); },
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
  simpleForm(t('debts'), `<div class="seg">${['owe', 'owed'].map((k) => `<label><input type="radio" name="dir" value="${k}" ${(d?.dir || 'owe') === k ? 'checked' : ''}><span>${t(k === 'owe' ? 'iOwe' : 'theyOwe')}</span></label>`).join('')}</div>` + fld(t('who'), `<input name="w" required value="${esc(d?.who || '')}">`) + fld(t('amount'), `<input name="a" type="number" step="0.01" min="0.01" required value="${d?.amount || ''}">`) + fld(t('due'), `<input name="d" type="date" value="${d?.due || ''}">`) + `<div class="toggle"><span>${t('paid')}</span><input type="checkbox" name="p" ${d?.paid ? 'checked' : ''}></div>`, (fd) => {
    S.update((s) => { const rec = { id: d?.id || S.uid(), dir: fd.get('dir'), who: fd.get('w').trim(), amount: num(fd.get('a')), due: fd.get('d') || '', paid: fd.get('p') === 'on' }; const i = s.debts.findIndex((x) => x.id === rec.id); i >= 0 ? (s.debts[i] = rec) : s.debts.push(rec); });
  }, d && (() => { S.update((s) => { s.debts = s.debts.filter((x) => x.id !== d.id); }); }));
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

// ---------- nube ----------
function cloudCard(u) {
  if (!Cloud.configured()) {
    return `<p class="muted" style="margin-top:0">${t('cfgHelp')}</p><textarea id="cfg-text" rows="6" placeholder='apiKey: "...", authDomain: "...", projectId: "...", appId: "..."'></textarea>
      <button class="btn" data-act="saveCfg">${ico('cloud', 18)} ${t('cfgSave')}</button><p class="sub" style="margin-bottom:0">${t('cfgSteps')}</p>`;
  }
  const rm = Cloud.fromFile() ? '' : `<button class="btn ghost" style="margin-top:8px" data-act="rmCfg">${t('cfgRemove')}</button>`;
  if (u) return `<div class="row" style="gap:6px">${ico('check', 16)}${t('signedIn')}: ${esc(u.email || '')}</div><div class="muted" style="margin:6px 0">${syncText()}</div><button class="btn ghost" data-act="signOut">${t('signOut')}</button>${rm}`;
  return `${Cloud.ready() ? '' : `<p class="exp" style="margin-top:0">${t('cfgFail')}</p>`}<button class="btn" data-act="authOpen">${t('signIn')}</button>${rm}`;
}

let syncState = 'off';
const syncText = () => ({ ok: t('synced'), busy: t('syncing'), off: t('offline') }[syncState] || '');
const syncBadge = () => (Cloud.user() ? `<small class="muted" style="font-weight:400">${ico('cloud', 14)} ${syncText()}</small>` : '');
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
  modal(`<h1>${ico('cloud', 22)} ${t('cloud')}</h1><form id="af">${fld(t('email'), '<input name="e" type="email" required autocomplete="email">')}${fld(t('password'), '<input name="p" type="password" minlength="6" required autocomplete="current-password">')}
  <button class="btn" type="submit">${t('signIn')}</button><button class="btn ghost" type="button" id="su" style="margin-top:8px">${t('signUp')}</button><button class="btn ghost" type="button" id="gg" style="margin-top:8px">${t('google')}</button><button class="btn ghost" type="button" data-act="skipAuth" style="margin-top:8px">${t('skip')}</button></form><div id="aerr" class="exp"></div>`, (m) => {
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
  if (e.target.id === 'inc-in') { V.planIncome = e.target.value; $('#plan-prev').innerHTML = planPreview(calcNum(e.target.value)); }
  if (e.target.id === 'f-q') { V.q = e.target.value; $('#mlist').innerHTML = movesList(); }
});
document.addEventListener('change', (e) => {
  const id = e.target.id;
  if (id === 'f-from' || id === 'f-to') { V.from = $('#f-from').value || V.from; V.to = $('#f-to').value || V.to; render(); }
  else if (id === 'inc-in') { S.update((st) => { st.settings.income = calcNum(e.target.value); }); }
  else if (e.target.dataset.rule) { S.update((st) => { st.settings.rule[e.target.dataset.rule] = Math.max(0, Math.min(100, parseInt(e.target.value) || 0)); }); }
  else if (id === 's-lang') { S.setDevice({ lang: e.target.value }); setLang(e.target.value); render(); }
  else if (id === 's-base') { S.update((s) => { s.settings.base = e.target.value; s.settings.rates = {}; }); render(); }
  else if (id === 's-remind') S.setDevice({ remindTime: e.target.value, lastRemind: null });
  else if (e.target.dataset.rate) S.update((s) => { const v = parseFloat(e.target.value); v > 0 ? (s.settings.rates[e.target.dataset.rate] = v) : delete s.settings.rates[e.target.dataset.rate]; });
  else if (e.target.dataset.act === 'notif') A.notif(e.target);
});
S.subscribe(() => { if ($('#modal').hidden && $('#lock').hidden) render(); pushWidget(); });
S.onSave(schedulePush);

setLang(S.device().lang || ((navigator.language || 'es').startsWith('en') ? 'en' : 'es'));
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
(async () => {
  await lockScreen();
  S.runRecurring();
  render();
  startupNotices();
  checkReminder(); setInterval(checkReminder, 60000);
  pushWidget();
  Cloud.init(onUser).then((ok) => { if (ok && !Cloud.user() && !S.device().skipAuth) authForm(); else if (!ok && Cloud.configured()) render(); });
})();
