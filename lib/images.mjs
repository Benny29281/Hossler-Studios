export const aceTeeImage = '/images/ace-of-hearts.webp';
export const hosslerLogo = '/images/hossler-studios-logo.webp';

const campaignPhotos = [
  { src: '/images/home-crew.webp', mobile: '/images/home-crew-mobile.webp', alt: 'Tiga orang di antara rak kain di gudang Hossler' },
  { src: '/images/home-poker-tee.webp', mobile: '/images/home-poker-tee-mobile.webp', alt: 'Tampak belakang Poker Tees putih dengan bordir hati merah di gudang' },
];

export function homeSlides(settings) {
  return [settings.homeSlideOne, settings.homeSlideTwo].map((src, index) => {
    if (!src) return campaignPhotos[index];
    return campaignPhotos.find((photo) => photo.src === src) ?? { src, alt: 'Foto kampanye Hossler Studios' };
  });
}
