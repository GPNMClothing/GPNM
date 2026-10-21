// POST /api/checkout — prices the cart from index.html (never trusts client prices),
// saves the order to KV under a random id, and emails the admin a link to /order/<id>.
// Needs: KV binding ORDERS, env RESEND_API_KEY, ADMIN_EMAIL (comma-separated ok), TURNSTILE_SECRET_KEY,
// optional RESEND_FROM.

export const SIZES = ['S', 'M', 'L', 'XL', '2XL'];
export const MAX_ORDER_LINES = 20;
export const MAX_ITEM_QTY = 10;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const peso = n => '₱' + n.toLocaleString('en-PH');
export const orderNumber = id => id.slice(0, 8).toUpperCase();

// The product cards in index.html are the single source of truth for names, prices and colors.
export function parseCatalog(html) {
  const catalog = Object.create(null);
  for (const [, attrs] of html.matchAll(/<article class="product[^"]*"([^>]*)>/g)) {
    const attr = n => attrs.match(new RegExp('data-' + n + '="([^"]*)"'))?.[1] || '';
    const name = attr('name');
    const price = Number(attr('price'));
    const colors = attr('colors').split('/').map(s => s.trim()).filter(Boolean);
    if (!name || !Number.isSafeInteger(price) || price <= 0 || !colors.length) continue;
    catalog[name] = {
      price,
      colors,
      category: attr('category'),
      description: attr('description'),
      image: attr('gallery').split('|')[0].replace(/^[^:]+:(?!\/)/, ''), // first photo, minus any "Color:" prefix
    };
  }
  return catalog;
}
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function buildOrder(body, catalog) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid request.');
  const customer = { name: clean(body?.name, 100), address: clean(body?.address, 500), phone: clean(body?.phone, 30), facebook: clean(body?.facebook, 200) };
  if (!customer.name || !customer.address) throw new Error('Name and delivery address are required.');
  if (!/^\+?[0-9 ()-]{7,20}$/.test(customer.phone)) throw new Error('Enter a valid phone number.');
  if (!Array.isArray(body.items) || !body.items.length) throw new Error('Your cart is empty.');
  if (body.items.length > MAX_ORDER_LINES) throw new Error('Your cart can contain up to ' + MAX_ORDER_LINES + ' different items.');
  const items = body.items.map(i => {
    const p = catalog[i?.name];
    const qty = Number(i?.qty);
    if (!p || !p.colors.includes(i.color) || !SIZES.includes(i.size) || !Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY)
      throw new Error('Your cart has an item that is no longer available. Remove it and try again.');
    return { name: i.name, color: i.color, size: i.size, qty, price: p.price };
  });
  return { customer, items, total: items.reduce((s, i) => s + i.price * i.qty, 0), createdAt: new Date().toISOString() };
}

// Admin notification email. Table layout + inline styles so it renders in Gmail/Outlook/Apple Mail.
export function orderEmail(order, id, url, origin) {
  const c = order.customer;
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  const date = new Date(order.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
  const font = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif";
  const label = `${font};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#8a8983`;
  const rows = order.items.map(i => `
    <tr>
      <td style="padding:16px 0;border-bottom:1px solid #e6e4de;${font}">
        <div style="font-size:15px;font-weight:600;color:#0a0a0a">${esc(i.name)}</div>
        <div style="font-size:13px;color:#6b6a64;padding-top:4px">${esc(i.color)} &nbsp;·&nbsp; Size ${esc(i.size)} &nbsp;·&nbsp; Qty ${i.qty}</div>
      </td>
      <td align="right" valign="top" style="padding:16px 0;border-bottom:1px solid #e6e4de;${font};font-size:15px;font-weight:600;color:#0a0a0a;white-space:nowrap">${peso(i.price * i.qty)}</td>
    </tr>`).join('');
  const detail = (name, value) => value ? `
    <tr><td style="padding:0 0 14px">
      <div style="${label}">${name}</div>
      <div style="${font};font-size:15px;line-height:1.5;color:#0a0a0a;padding-top:4px">${value}</div>
    </td></tr>` : '';
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"></head>
<body style="margin:0;padding:0;background:#ebe9e3">
<div style="display:none;max-height:0;overflow:hidden">${esc(c.name)} ordered ${count} item${count === 1 ? '' : 's'} — ${peso(order.total)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ebe9e3"><tr><td align="center" style="padding:32px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#f6f5f1;border-radius:20px;overflow:hidden">
    <tr><td style="background:#0a0a0a;padding:28px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td><img src="${origin}/assets/gpnm-logo-white.png" width="64" alt="GPNM" style="display:block;border:0;height:auto"></td>
        <td align="right" style="${label};color:#a5a49d">${esc(date)}</td>
      </tr></table>
      <div style="${font};font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#a5a49d;padding-top:36px">New order received</div>
      <div style="${font};font-size:40px;line-height:1;font-weight:900;letter-spacing:-1px;color:#f2f1ec;padding-top:8px">#${orderNumber(id)}</div>
      <div style="${font};font-size:16px;color:#d9d8d2;padding-top:12px">${esc(c.name)} &nbsp;·&nbsp; ${count} item${count === 1 ? '' : 's'} &nbsp;·&nbsp; <strong style="color:#f2f1ec">${peso(order.total)}</strong></div>
    </td></tr>
    <tr><td style="padding:32px 32px 8px">
      <div style="${label};padding-bottom:4px">Items</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
        <tr>
          <td style="padding:18px 0 0;${font};font-size:13px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#0a0a0a">Total</td>
          <td align="right" style="padding:18px 0 0;${font};font-size:22px;font-weight:800;color:#0a0a0a">${peso(order.total)}</td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:24px 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e6e4de;border-radius:14px"><tr><td style="padding:22px 22px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detail('Customer', esc(c.name))}
          ${detail('Phone', `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}" style="color:#0a0a0a">${esc(c.phone)}</a>`)}
          ${detail('Delivery address', esc(c.address).replace(/\r?\n/g, '<br>'))}
          ${detail('Facebook', esc(c.facebook))}
        </table>
      </td></tr></table>
    </td></tr>
    <tr><td align="center" style="padding:28px 32px 36px">
      <a href="${url}" style="display:inline-block;background:#0a0a0a;color:#f2f1ec;${font};font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;text-decoration:none;padding:16px 32px;border-radius:999px">View full order &nbsp;↗</a>
      <div style="${font};font-size:12px;color:#8a8983;padding-top:16px">No online payment was taken. Contact the customer to confirm payment and delivery.</div>
    </td></tr>
  </table>
  <div style="${font};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#8a8983;padding-top:20px">GPNM &nbsp;·&nbsp; God's plan, not mine</div>
</td></tr></table>
</body></html>`;
}

// Anti-abuse: request size cap, honeypot field, Turnstile check, and a per-IP hourly order limit.
export const MAX_BODY_BYTES = 20_000;
export const MAX_ORDERS_PER_IP_PER_HOUR = 5;

export async function verifyTurnstile(token, ip, secret, fetchFn = fetch) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Turnstile verification failed (' + res.status + ').');
  return (await res.json()).success === true;
}

export async function onRequestPost({ request, env }) {
  const fail = (error, status = 400) => Response.json({ error }, { status });
  const adminEmails = String(env?.ADMIN_EMAIL || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!env?.TURNSTILE_SECRET_KEY || !env?.RESEND_API_KEY || !adminEmails.length ||
      typeof env?.ORDERS?.get !== 'function' || typeof env?.ORDERS?.put !== 'function' || typeof env?.ASSETS?.fetch !== 'function') {
    console.error('Checkout environment is missing a required secret or binding.');
    return fail('Checkout is temporarily unavailable. Please message us on Messenger.', 503);
  }
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json'))
    return fail('Send your order as JSON.', 415);
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return fail('Your order is too large.', 413);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return fail('Your order is too large.', 413);
  let body;
  try { body = JSON.parse(raw); } catch { return fail('Invalid request.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail('Invalid request.');
  if (body.website) return fail('Invalid request.'); // honeypot: hidden field only bots fill in

  const ip = request.headers.get('CF-Connecting-IP') || '';
  let verified;
  try { verified = await verifyTurnstile(body['cf-turnstile-response'], ip, env.TURNSTILE_SECRET_KEY); }
  catch (e) {
    console.error('Turnstile verification request failed', e);
    return fail('The security check is temporarily unavailable. Please try again.', 503);
  }
  if (!verified) return fail('Please complete the security check and try again.', 403);

  // KV counters are eventually consistent, so bursts can exceed this limit slightly.
  const rateKey = 'rl:' + ip;
  let recent = 0;
  try { recent = Number(ip && (await env.ORDERS.get(rateKey))) || 0; }
  catch (e) {
    console.error('Could not read order rate limit', e);
    return fail('Checkout is temporarily unavailable. Please try again.', 503);
  }
  if (recent >= MAX_ORDERS_PER_IP_PER_HOUR)
    return fail('Too many orders from your connection. Please try again later or message us on Messenger.', 429);

  let html;
  try {
    const catalogResponse = await env.ASSETS.fetch(new URL('/', request.url));
    if (!catalogResponse.ok) throw new Error('Catalog request failed (' + catalogResponse.status + ').');
    html = await catalogResponse.text();
  } catch (e) {
    console.error('Could not load the product catalog', e);
    return fail('Checkout is temporarily unavailable. Please try again.', 503);
  }

  let order;
  try { order = buildOrder(body, parseCatalog(html)); }
  catch (e) { return fail(e.message); }

  const id = crypto.randomUUID();
  const url = new URL('/order/' + id, request.url).href;
  try { await env.ORDERS.put(id, JSON.stringify(order)); }
  catch (e) {
    console.error('Could not save the order', e);
    return fail('We could not save your order. Please try again or message us on Messenger.', 503);
  }
  if (ip) {
    try { await env.ORDERS.put(rateKey, String(recent + 1), { expirationTtl: 3600 }); }
    catch (e) { console.error('Could not update order rate limit', e); }
  }

  const { customer: c } = order;
  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM || 'GPNM Orders <onboarding@resend.dev>',
        to: adminEmails,
        subject: 'New order #' + orderNumber(id) + ' — ' + c.name + ' — ' + peso(order.total),
        html: orderEmail(order, id, url, new URL(request.url).origin),
      }),
    });
  } catch (e) {
    console.error('Resend request failed', e);
    return Response.json({ error: 'Your order was saved, but we could not notify the shop. Please message us on Messenger: ' + url, url }, { status: 502 });
  }
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    console.error('Resend failed', res.status, detail);
    return Response.json({ error: 'Your order was saved, but we could not notify the shop. Please message us on Messenger: ' + url, url }, { status: 502 });
  }
  return Response.json({ url });
}