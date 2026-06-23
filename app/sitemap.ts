import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://shareway.pro';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/trenes', '/autobuses', '/transfers', '/contacto', '/aviso-legal', '/privacidad', '/cookies'];

  return paths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7
  }));
}
