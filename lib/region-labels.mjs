function regionKey(name) {
  const key = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (['jakarta', 'dki jakarta', 'daerah khusus ibukota jakarta', 'daerah khusus jakarta'].includes(key)) {
    return 'jakarta';
  }
  return key.replace(/^(?:kab(?:upaten)?\.?|kota)(?: (?:adm\.?|administrasi))? /, '');
}

export function findRegion(items, name = '') {
  if (!name) return;
  const exact = items.find((item) => item.name === name);
  if (exact) return exact;
  const key = regionKey(name);
  const matches = items.filter((item) => regionKey(item.name) === key);
  if (matches.length === 1) return matches[0];
}
