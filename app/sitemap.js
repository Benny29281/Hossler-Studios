import { collections, pages, products } from '../lib/shop.mjs';
import { publicPagePath } from '../lib/content.mjs';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  const base = process.env.APP_URL || 'http://localhost:3000';
  const [items, groups, content] = await Promise.all([products(), collections(), pages()]);
  return ['/', '/products', ...items.map(({slug}) => '/products/' + slug),
    ...groups.map(({slug}) => '/collections/' + slug), ...content.map(({slug}) => publicPagePath(slug))]
    .map((path) => ({ url: new URL(path, base).href }));
}
