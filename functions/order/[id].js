// GET /order/<id> — the order details page linked from the admin email and shown to the customer after checkout.
import { esc, peso, orderNumber } from '../api/checkout.js';

export async function onRequestGet({ params, env }) {
  const order = /^[0-9a-f-]{36}$/.test(params.id) && (await env.ORDERS.get(params.id, 'json'));
  if (!order) return new Response('Order not found', { status: 404 });
  const { customer: c } = order;
  const fb = c.facebook && (/^https?:\/\//i.test(c.facebook) ? `<a href="${esc(c.facebook)}" target="_blank" rel="noopener">${esc(c.facebook)}</a>` : esc(c.facebook));
  const date = new Date(order.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'long', timeStyle: 'short' });

  return new Response(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Order #${orderNumber(params.id)} — GPNM</title>
<link rel="icon" href="/assets/gpnm-site-icon.ico" sizes="any">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<style>
.order{max-width:720px;margin:0 auto;padding:clamp(40px,8vw,96px) 20px}
.order h1{font-size:clamp(48px,9vw,88px);margin-bottom:12px}
.order dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 24px;margin:32px 0}
.order dt{color:var(--muted);font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.order dd{margin:0;overflow-wrap:anywhere;white-space:pre-line}
.order dd a{text-decoration:underline}
.order table{width:100%;border-collapse:collapse;margin-bottom:32px}
.order th,.order td{padding:12px 8px;border-bottom:1px solid var(--line);text-align:left}
.order th{color:var(--muted);font-size:12px;letter-spacing:.1em;text-transform:uppercase}
.order .num{text-align:right}
.order tfoot td{font-weight:700;border:0}
</style>
</head>
<body>
<main class="order">
<p class="eyebrow">GPNM / Order received</p>
<h1>Order #${orderNumber(params.id)}</h1>
<p>${date}. Save this page — we'll contact you to confirm payment and delivery.</p>
<dl>
<dt>Name</dt><dd>${esc(c.name)}</dd>
<dt>Phone</dt><dd><a href="tel:${esc(c.phone.replace(/[^0-9+]/g, ''))}">${esc(c.phone)}</a></dd>
<dt>Address</dt><dd>${esc(c.address)}</dd>
${fb ? `<dt>Facebook</dt><dd>${fb}</dd>` : ''}
</dl>
<table>
<thead><tr><th>Item</th><th>Qty</th><th class="num">Subtotal</th></tr></thead>
<tbody>${order.items.map(i => `<tr><td>${esc(i.name)}<br><small>${esc(i.color)} / ${esc(i.size)} · ${peso(i.price)}</small></td><td>${i.qty}</td><td class="num">${peso(i.price * i.qty)}</td></tr>`).join('')}</tbody>
<tfoot><tr><td colspan="2">Total</td><td class="num">${peso(order.total)}</td></tr></tfoot>
</table>
<a class="text-arrow" href="/">Back to GPNM <span aria-hidden="true">↗</span></a>
</main>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' } });
}
