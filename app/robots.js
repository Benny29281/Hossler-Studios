export default function robots() {
  const base = process.env.APP_URL;
  if (!base || process.env.INDEX_STORE !== '1') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: ['/admin','/api','/account','/cart','/checkout','/orders'] }, sitemap: new URL('/sitemap.xml', base).href };
}
