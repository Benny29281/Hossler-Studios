import { getProvince, provinces } from '../../../lib/regions.mjs';

export function GET(request) {
  const id = request.nextUrl.searchParams.get('province');
  const options = { headers: { 'Cache-Control': 'public, max-age=3600' } };
  if (id === null) return Response.json(provinces, options);
  const province = getProvince(id);
  if (!province) return Response.json({ error: 'Provinsi tidak ditemukan.' }, { status: 404 });
  return Response.json(province.cities, options);
}
