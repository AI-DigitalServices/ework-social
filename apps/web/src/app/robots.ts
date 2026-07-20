import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/admin/',
          '/approve/',
          '/invite/',
          '/api/',
        ],
      },
    ],
    sitemap: 'https://www.eworksocial.com/sitemap.xml',
    host: 'https://www.eworksocial.com',
  };
}
