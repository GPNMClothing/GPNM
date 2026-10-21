// GET /sitemap.xml — the site is a single page.
export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
</urlset>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
