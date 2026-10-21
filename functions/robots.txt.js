// GET /robots.txt — order pages and the API stay out of search results.
export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  return new Response(`User-agent: *\nAllow: /\nDisallow: /order/\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
