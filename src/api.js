const API_BASE = import.meta.env.VITE_API_BASE || "https://musicstore.somee.com";

export function buildQuery(params) {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    usp.set(k, String(v));
  });
  return usp.toString();
}

export async function fetchLocales() {
  const res = await fetch(`${API_BASE}/api/locales`);
  if (!res.ok) throw new Error("Failed to load locales");
  return await res.json();
}

export async function fetchSongs({ locale, seed, likesAverage, page, pageSize }) {
  const qs = buildQuery({ locale, seed, likesAverage, page, pageSize });
  const res = await fetch(`${API_BASE}/api/songs?${qs}`);
  if (!res.ok) throw new Error("Failed to load songs");
  return await res.json();
}

export async function fetchSongDetails({ locale, seed, likesAverage, page, sequenceIndex }) {
  const qs = buildQuery({ locale, seed, likesAverage, page });
  const res = await fetch(`${API_BASE}/api/songs/${sequenceIndex}?${qs}`);
  if (!res.ok) throw new Error("Failed to load details");
  return await res.json();
}

export function coverUrl({ locale, seed, page, sequenceIndex }) {
  const qs = buildQuery({ locale, seed, page });
  return `${API_BASE}/api/songs/${sequenceIndex}/cover?${qs}`;
}

export function previewUrl({ locale, seed, page, sequenceIndex }) {
  const qs = buildQuery({ locale, seed, page });
  return `${API_BASE}/api/songs/${sequenceIndex}/preview.mp3?${qs}`;
}

export function exportUrl({ locale, seed, likesAverage, page, pageSize }) {
  const qs = buildQuery({ locale, seed, likesAverage, page, pageSize });
  return `${API_BASE}/api/export?${qs}`;
}