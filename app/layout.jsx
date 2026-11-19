import './globals.css';
import { identity, store, cart } from '../lib/shop.mjs';
import { aceTeeImage } from '../lib/images.mjs';
import { SiteFooter, SiteHeader, CookieNotice, Analytics } from '../components/client.jsx';

export const metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'Hossler Studios — Independent Streetwear', template: '%s | Hossler Studios' },
  description: "Hossler Studios, brand streetwear independen. Temukan Poker Tees'26, drop perdana kami.",
  openGraph: { title: 'Hossler Studios', description: "Independent streetwear · Poker Tees'26", images: [aceTeeImage] },
  icons: { icon: '/icon.svg' },
};

export default async function Layout({ children }) {
  const [actor, settings] = await Promise.all([identity(), store()]);
  const items = await cart(actor.owner);
  return <html lang="id">
    <body>
      <a className="skip" href="#content">Lewati ke konten</a>
      <SiteHeader items={items} account={actor.user?.role} />
      <main id="content">{children}</main>
      <SiteFooter instagram={settings.instagram} />
      <CookieNotice />
      <Analytics ga={process.env.NEXT_PUBLIC_GA_ID} pixel={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
    </body>
  </html>;
}
