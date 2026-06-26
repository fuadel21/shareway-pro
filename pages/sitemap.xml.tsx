import type { GetServerSideProps } from 'next';
import { popularRoutes } from '@/lib/routes';

const SITE_URL = 'https://shareway.pro';

function generateSitemap() {
  const staticPages = ['', '/trenes', '/autobuses', '/traslados', '/contacto'];
  const routePages = popularRoutes.map((route) => `/rutas/${route.slug}`);
  const pages = [...staticPages, ...routePages];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url>
    <loc>${SITE_URL}${page}</loc>
    <changefreq>weekly</changefreq>
    <priority>${page === '' ? '1.0' : page.startsWith('/rutas') ? '0.8' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'text/xml');
  res.write(generateSitemap());
  res.end();

  return { props: {} };
};

export default function Sitemap() {
  return null;
}
