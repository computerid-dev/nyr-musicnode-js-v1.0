// Mengubah data lagu dari API menjadi bentuk sederhana yang dipakai UI dan pemutar.
import { QUALITY_ORDER } from "./config.js";
import { decodeEntities } from "./format.js";

const HTTP_URL = /^https?:\/\//i;

function toHttps(url) {
  return url.replace(/^http:\/\//i, "https://");
}

function pickImage(images, preferred) {
  if (!Array.isArray(images) || images.length === 0) return "";
  const match = images.find((item) => item && item.quality === preferred && HTTP_URL.test(item.url || ""));
  const fallback = [...images].reverse().find((item) => item && HTTP_URL.test(item.url || ""));
  const chosen = match || fallback;
  return chosen ? toHttps(chosen.url) : "";
}

export function normalizeSong(raw) {
  if (!raw || typeof raw !== "object" || !raw.id) return null;

  const streams = {};
  const links = Array.isArray(raw.downloadUrl) ? raw.downloadUrl : [];
  links.forEach((item) => {
    if (item && QUALITY_ORDER.includes(item.quality) && HTTP_URL.test(item.url || "")) {
      streams[item.quality] = toHttps(item.url);
    }
  });
  if (Object.keys(streams).length === 0) return null; // tidak ada tautan audio, tidak bisa diputar

  const artists = raw.artists || {};
  const primary = Array.isArray(artists.primary) ? artists.primary : [];
  const all = Array.isArray(artists.all) ? artists.all : [];
  const names = (primary.length ? primary : all)
    .map((artist) => decodeEntities(artist && artist.name))
    .filter(Boolean);

  return {
    id: String(raw.id),
    title: decodeEntities(raw.name) || "Tanpa judul",
    artist: names.slice(0, 3).join(", ") || "Artis tidak diketahui",
    album: decodeEntities(raw.album && raw.album.name) || "",
    year: raw.year ? String(raw.year) : "",
    duration: Number.isFinite(raw.duration) ? raw.duration : 0,
    explicit: Boolean(raw.explicitContent),
    coverSmall: pickImage(raw.image, "150x150"),
    coverLarge: pickImage(raw.image, "500x500"),
    streams
  };
}
