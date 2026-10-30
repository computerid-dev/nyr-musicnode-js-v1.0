// Pemanggil backend. Semua request ke /api (dijaga proxy.js di server).
import { API_BASE, PAGE_SIZE } from "./config.js";
import { normalizeSong } from "./song.js";

export class ApiError extends Error {}

async function request(path, params) {
  const url = new URL(API_BASE + path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)));

  let response;
  try {
    response = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError("Tidak bisa terhubung ke server. Cek koneksi internet.");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 403) throw new ApiError("Akses ditolak: link tidak resmi.");
  if (!response.ok || !body || body.success === false) {
    const detail = body && typeof body.message === "string" ? body.message : `kode ${response.status}`;
    throw new ApiError(`Server mengembalikan kesalahan (${detail}).`);
  }
  return body.data;
}

export async function searchSongs(query, page) {
  const data = await request("/search/songs", { query, page, limit: PAGE_SIZE });
  const rawResults = data && Array.isArray(data.results) ? data.results : [];
  return {
    total: data && Number.isFinite(data.total) ? data.total : 0,
    rawCount: rawResults.length,
    songs: rawResults.map(normalizeSong).filter(Boolean)
  };
}
