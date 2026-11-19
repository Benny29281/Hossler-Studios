import regions from './regions-data.json';
import { findRegion } from './region-labels.mjs';

export const provinces = regions.map(({ id, name }) => ({ id, name }));
export const getProvince = (id) => regions.find((region) => region.id === id);

export function verifyAddressRegion(address) {
  const { districtCode } = address;
  if (!districtCode) return address;
  const province = getProvince(districtCode.slice(0, 2));
  const city = province?.cities.find(({ id }) => id === districtCode.slice(0, 5));
  const district = city?.districts.find(({ id }) => id === districtCode);
  if (!district?.postals.includes(address.postal) ||
      findRegion(provinces, address.province)?.id !== province.id ||
      findRegion(province.cities, address.city)?.id !== city.id ||
      findRegion(city.districts, address.district)?.id !== district.id) {
    throw Object.assign(new Error('Pilih kembali provinsi, kota, kecamatan, dan kode pos yang sesuai.'), { status: 400 });
  }
  return { ...address, province: province.name, city: city.name, district: district.name };
}
