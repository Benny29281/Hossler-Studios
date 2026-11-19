export const journeySlug = 'our-journey';
export const legacyJourneySlug = 'community';
export const journeyTitle = 'Our Journey';
export const journeyPath = '/pages/' + journeySlug;

export function publicPagePath(slug) {
  return slug === legacyJourneySlug ? journeyPath : '/pages/' + slug;
}
