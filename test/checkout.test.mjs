// Run: node --test test/checkout.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCatalog, buildOrder, orderEmail, verifyTurnstile } from '../functions/api/checkout.js';

const catalog = parseCatalog(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
const customer = { name: 'Juan Dela Cruz', address: '123 Rizal St, Manila', phone: '0917 123 4567' };

test('catalog is read from index.html', () => {
  const tee = catalog['For God Graphic Tee'];
  assert.deepEqual([tee.price, tee.colors, tee.category], [750, ['Black', 'White'], 'tees']);
  assert.equal(tee.image, 'assets/products/for-god-tee-back.jpg');
  assert.match(tee.description, /Matthew 19:26/);
  assert.equal(Object.keys(catalog).length, 6);
});

test('order is priced server-side, ignoring client prices', () => {
  const order = buildOrder({ ...customer, items: [{ name: 'GPNM Cap', color: 'Black', size: 'M', qty: 2, price: 1 }] }, catalog);
  assert.equal(order.total, 1500);
  assert.equal(order.customer.facebook, '');
});

test('admin email escapes customer input and shows the order', () => {
  const order = buildOrder({ ...customer, name: '<script>x</script>', items: [{ name: 'GPNM Cap', color: 'Black', size: 'M', qty: 2 }] }, catalog);
  const html = orderEmail(order, 'abcdef12-0000', 'https://gpnm.test/order/abcdef12-0000', 'https://gpnm.test');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('#ABCDEF12') && html.includes('₱1,500') && html.includes('https://gpnm.test/order/abcdef12-0000'));
});

test('turnstile token is verified with siteverify', async () => {
  let sent;
  const fakeFetch = async (url, init) => { sent = Object.fromEntries(init.body); return Response.json({ success: sent.response === 'good' }); };
  assert.equal(await verifyTurnstile('good', '1.2.3.4', 's3cret', fakeFetch), true);
  assert.deepEqual(sent, { secret: 's3cret', response: 'good', remoteip: '1.2.3.4' });
  assert.equal(await verifyTurnstile('bad', '', 's3cret', fakeFetch), false);
  assert.equal(await verifyTurnstile(undefined, '', 's3cret', fakeFetch), false);
});

test('invalid input is rejected', () => {
  const ok = { name: 'GPNM Cap', color: 'Black', size: 'M', qty: 1 };
  assert.throws(() => buildOrder({ ...customer, items: [] }, catalog), /empty/);
  assert.throws(() => buildOrder({ ...customer, phone: 'call me', items: [ok] }, catalog), /phone/);
  assert.throws(() => buildOrder({ ...customer, name: ' ', items: [ok] }, catalog), /required/);
  for (const bad of [{ name: 'Fake' }, { color: 'Pink' }, { size: '5XL' }, { qty: 0 }, { qty: 1.5 }, { qty: 11 }])
    assert.throws(() => buildOrder({ ...customer, items: [{ ...ok, ...bad }] }, catalog), /no longer available/);
});
