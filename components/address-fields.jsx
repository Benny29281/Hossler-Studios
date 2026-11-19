'use client';

import { useEffect, useState } from 'react';
import { findRegion } from '../lib/region-labels.mjs';

const empty = [];
const requests = new Map();

function loadRegions(id) {
  if (!requests.has(id)) {
    const url = id ? '/api/regions?province=' + encodeURIComponent(id) : '/api/regions';
    requests.set(id, fetch(url).then((response) => {
      if (!response.ok) throw new Error('Data wilayah belum bisa dimuat.');
      return response.json();
    }).catch((error) => {
      requests.delete(id);
      throw error;
    }));
  }
  return requests.get(id);
}

function useRegions(id, retry) {
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (id === undefined) return;
    let active = true;
    loadRegions(id).then(
      (items) => { if (active) setResult({ id, retry, items }); },
      () => { if (active) setResult({ id, retry, error: true }); },
    );
    return () => { active = false; };
  }, [id, retry]);
  return result && result.id === id && result.retry === retry ? result : null;
}

function RegionSelect({ label, name, options, value, placeholder, disabled, onChange }) {
  return <label>{label}
    <select name={name} required value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
      <option value="">{placeholder}</option>
      {value && !options.some((option) => option.value === value) && <option value={value}>{value} (tersimpan)</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}

const namedOptions = (items) => items.map(({ name }) => ({ label: name, value: name }));

export function AddressFields({ value = {}, onRegionChange }) {
  const [region, setRegion] = useState(value);
  const [retry, setRetry] = useState(0);
  const provinceResult = useRegions('', retry);
  const provinces = provinceResult?.items ?? empty;
  const province = findRegion(provinces, region.province);
  const cityResult = useRegions(province?.id, retry);
  const cities = cityResult?.items ?? empty;
  const city = findRegion(cities, region.city);
  const districts = city?.districts ?? empty;
  const district = findRegion(districts, region.district);
  const postals = district?.postals ?? empty;
  const error = provinceResult?.error || cityResult?.error;

  function select(changes) {
    setRegion((previous) => ({ ...previous, ...changes }));
    onRegionChange?.(changes.postal);
  }

  return <div className="fields">
    <label>Nama penerima<input name="name" maxLength={100} autoComplete="name" defaultValue={value.name} required /></label>
    <label>Nomor WhatsApp<input name="phone" type="tel" maxLength={24} autoComplete="tel" defaultValue={value.phone} required /></label>
    {error && <div className="full feedback bad" role="status">Data wilayah belum bisa dimuat. <button className="plain" type="button"
      onClick={() => setRetry((attempt) => attempt + 1)}>Coba lagi</button></div>}
    <RegionSelect label="Provinsi" name="province" options={namedOptions(provinces)} value={region.province}
      placeholder={provinceResult ? 'Pilih provinsi' : 'Memuat provinsi…'} disabled={!provinceResult?.items && !region.province}
      onChange={(name) => select({ province: name, city: '', district: '', postal: '' })} />
    <RegionSelect label="Kota / Kabupaten" name="city" options={namedOptions(cities)} value={region.city}
      placeholder={province && !cityResult ? 'Memuat kota / kabupaten…' : 'Pilih kota / kabupaten'} disabled={!cities.length && !region.city}
      onChange={(name) => select({ city: name, district: '', postal: '' })} />
    <RegionSelect label="Kecamatan" name="district" options={namedOptions(districts)} value={region.district}
      placeholder="Pilih kecamatan" disabled={!districts.length && !region.district}
      onChange={(name) => {
        const codes = findRegion(districts, name)?.postals;
        select({ district: name, postal: codes?.length === 1 ? codes[0] : '' });
      }} />
    <RegionSelect label="Kode pos" name="postal" options={postals.map((code) => ({ value: code, label: code }))} value={region.postal}
      placeholder="Pilih kode pos" disabled={!postals.length && !region.postal}
      onChange={(code) => select({ postal: code })} />
    {district && postals.includes(region.postal) && <input type="hidden" name="districtCode" value={district.id} />}
    <label className="full">Alamat lengkap<textarea name="detail" autoComplete="street-address" required minLength={8} maxLength={400} rows={3} defaultValue={value.detail} /></label>
  </div>;
}
