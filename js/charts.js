// Gráficos SVG sin dependencias
export const PALETTE = ['#8b7bff', '#3ddc97', '#ffb454', '#4dc3ff', '#ff6b81', '#c58bff', '#7be0d6', '#f2e36b', '#9aa3c7'];

export function donut(data) {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return '';
  const R = 40, C = 2 * Math.PI * R;
  let off = 0;
  const arcs = data.map((d) => {
    const len = (d.value / total) * C;
    const s = `<circle r="${R}" cx="60" cy="60" fill="none" stroke="${d.color}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
    off += len;
    return s;
  }).join('');
  return `<svg viewBox="0 0 120 120" class="donut" role="img">${arcs}</svg>`;
}

export function bars(rows) {
  const W = 320, H = 150, pad = 22;
  const max = Math.max(1, ...rows.flatMap((r) => [r.inc, r.exp]));
  const bw = (W - pad) / rows.length;
  let out = '';
  rows.forEach((r, i) => {
    const x = pad + i * bw;
    const hi = (r.inc / max) * (H - 30), he = (r.exp / max) * (H - 30);
    out += `<rect x="${x + bw * 0.12}" y="${H - 18 - hi}" width="${bw * 0.34}" height="${hi}" rx="3" fill="var(--inc)"/>`;
    out += `<rect x="${x + bw * 0.52}" y="${H - 18 - he}" width="${bw * 0.34}" height="${he}" rx="3" fill="var(--exp)"/>`;
    out += `<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle" class="ax">${r.label}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img">${out}</svg>`;
}

export function line(points) {
  const W = 320, H = 150, px = 8, py = 18;
  if (points.length < 2) return '';
  const vs = points.map((p) => p.v);
  const lo = Math.min(...vs), hi = Math.max(...vs), span = hi - lo || 1;
  const xy = points.map((p, i) => [px + (i / (points.length - 1)) * (W - 2 * px), py + (1 - (p.v - lo) / span) * (H - 2 * py - 10)]);
  const d = xy.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L${xy[xy.length - 1][0]} ${H - 18} L${xy[0][0]} ${H - 18} Z`;
  const labels = points.map((p, i) => (i % 2 === 0 || points.length < 7 ? `<text x="${xy[i][0]}" y="${H - 4}" text-anchor="middle" class="ax">${p.label}</text>` : '')).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img"><path d="${area}" fill="var(--accent)" opacity=".15"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${xy.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--accent)"/>`).join('')}${labels}</svg>`;
}
