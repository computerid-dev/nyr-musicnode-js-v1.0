// Fungsi murni (tanpa DOM): dekode teks, format waktu, validasi input.
const NAMED_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text) {
  if (typeof text !== "string") return "";
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const isHex = code[1].toLowerCase() === "x";
      const value = parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(value) && value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : match;
    }
    const key = code.toLowerCase();
    return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : match;
  });
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function validateQuery(raw, min, max) {
  const value = String(raw || "").replace(/\s+/g, " ").trim();
  if (value.length < min) return { ok: false, value, message: `Tulis minimal ${min} karakter untuk mencari.` };
  if (value.length > max) return { ok: false, value, message: `Pencarian terlalu panjang (maksimal ${max} karakter).` };
  return { ok: true, value, message: "" };
}
