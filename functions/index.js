// GET / — serves index.html with absolute URLs for the current domain (canonical, Open Graph)
// and schema.org JSON-LD built from the product cards, so search engines see the catalog.
import { parseCatalog } from './api/checkout.js';

export function structuredData(catalog, origin) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${origin}/#org`, name: 'GPNM', alternateName: "God's Plan, Not Mine", url: `${origin}/`, logo: `${origin}/assets/gpnm-site-icon.png`, sameAs: ['https://www.facebook.com/Walakiiin'] },
      { '@type': 'WebSite', name: 'GPNM', url: `${origin}/`, publisher: { '@id': `${origin}/#org` }, inLanguage: 'en-PH' },
      {
        '@type': 'ItemList',
        name: 'GPNM collection',
        itemListElement: Object.entries(catalog).map(([name, p], i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Product',
            name,
            description: p.description,
            image: `${origin}/${p.image}`,
            color: p.colors.join(', '),
            brand: { '@type': 'Brand', name: 'GPNM' },
            offers: { '@type': 'Offer', price: p.price, priceCurrency: 'PHP', availability: 'https://schema.org/InStock', url: `${origin}/#shop` },
          },
        })),
      },
    ],
  };
}

export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(request);
  if (!res.ok || !res.headers.get('content-type')?.includes('text/html')) return res;
  const origin = new URL(request.url).origin;
  const html = await res.text();
  const ld = JSON.stringify(structuredData(parseCatalog(html), origin)).replace(/</g, '\\u003c');
  // CSS/JS are browser-cached for hours; tag them with the deploy's commit so new HTML never runs old code.
  const v = (env.CF_PAGES_COMMIT_SHA || '').slice(0, 8);
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(
    html.replaceAll('__ORIGIN__', origin)
      .replace('href="styles.css"', `href="styles.css?v=${v}"`)
      .replace('src="script.js"', `src="script.js?v=${v}"`)
      .replace('</head>', `<script type="application/ld+json">${ld}</script>\n</head>`),
    { status: res.status, headers },
  );
}
