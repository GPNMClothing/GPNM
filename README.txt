GPNM OFFICIAL WEBSITE

Preview the storefront by opening index.html in a modern browser. Product browsing, filters, search, galleries, and the cart run in the browser. The checkout API and order confirmation pages run as Cloudflare Pages Functions in functions/.

Files:
- index.html: storefront structure and product catalog
- styles.css: responsive design and animations
- script.js: navigation, catalog interactions, product details, cart, and checkout request
- functions/: Cloudflare Pages handlers for metadata, robots.txt, sitemap.xml, checkout, and order details
- assets/ and models/: campaign and product imagery
- test/checkout.test.mjs: checkout validation tests

Cloudflare Pages setup:
- Use the repository root as the project directory and set the static output directory to the current folder; no build command is required.
- Create a KV namespace and bind it as ORDERS.
- Set TURNSTILE_SECRET_KEY, RESEND_API_KEY, and ADMIN_EMAIL in the Pages environment. ADMIN_EMAIL accepts comma-separated recipients.
- Set RESEND_FROM to a sender address verified with Resend before production use.
- The production Turnstile site key in script.js must match the deployed domain and TURNSTILE_SECRET_KEY.
- Checkout records orders in KV and emails the shop. It does not take online payments; the shop confirms payment and delivery directly.

For a static preview, checkout requests cannot create orders. Use Cloudflare Pages local development to exercise Functions and configure the local KV binding and secrets.

Run the built-in Node.js tests with npm test. The project has no runtime dependencies.