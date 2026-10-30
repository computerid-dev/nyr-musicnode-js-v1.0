import { searchSongs, ApiError } from "./api.js";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH, PAGE_SIZE, QUALITY_ORDER } from "./config.js";
import { formatTime, validateQuery } from "./format.js";
import { Player } from "./player.js";
import { createSongCard, el, markPlaying, setStatus } from "./ui.js";

const $ = (id) => document.getElementById(id);
const dom = {
  form: $("search-form"), input: $("search-input"), searchBtn: $("search-btn"),
  status: $("status"), results: $("results"), moreBtn: $("more-btn"),
  player: $("player"), cover: $("player-cover"), title: $("player-title"), artist: $("player-artist"),
  toggle: $("btn-toggle"), prev: $("btn-prev"), next: $("btn-next"), repeat: $("btn-repeat"),
  seek: $("seek"), seekFill: $("seek-fill"), timeCurrent: $("time-current"), timeTotal: $("time-total"),
  quality: $("quality"), volume: $("volume"), volumeFill: $("volume-fill"),
  download: $("download-link"), message: $("player-message")
};

const player = new Player();
const state = { query: "", page: 0, hasMore: false, songs: [], loading: false };

const REPEAT_LABELS = { off: "ULANG: MATI", all: "ULANG: SEMUA", one: "ULANG: SATU" };

/* ---------- pencarian ---------- */
function setBusy(isBusy) {
  state.loading = isBusy;
  dom.searchBtn.disabled = isBusy;
  dom.moreBtn.disabled = isBusy;
}

function appendCards(songs) {
  const startIndex = state.songs.length;
  songs.forEach((song, offset) => {
    const index = startIndex + offset;
    dom.results.appendChild(createSongCard(song, () => player.playFromList(state.songs, index)));
  });
  state.songs.push(...songs);
  syncPlayingMarks();
}

async function runSearch(rawQuery, append) {
  if (state.loading) return;

  let query = state.query;
  let page = 0;
  if (append) {
    page = state.page + 1;
  } else {
    const check = validateQuery(rawQuery, MIN_QUERY_LENGTH, MAX_QUERY_LENGTH);
    if (!check.ok) {
      setStatus(dom.status, check.message, "error");
      return;
    }
    query = check.value;
    dom.input.value = query;
  }

  setBusy(true);
  setStatus(dom.status, "Memuat...", "info");

  try {
    const { total, rawCount, songs } = await searchSongs(query, page);

    if (!append) {
      state.query = query;
      state.songs = []; // antrian pemutar lama tetap jalan sampai lagu baru dipilih
      dom.results.replaceChildren();
    }

    const known = new Set(state.songs.map((song) => song.id));
    const fresh = songs.filter((song) => !known.has(song.id));
    appendCards(fresh);

    state.page = page;
    state.hasMore = rawCount > 0 && (page + 1) * PAGE_SIZE < total;

    if (state.songs.length === 0) {
      setStatus(dom.status, `Tidak ada hasil untuk "${query}". Coba kata kunci lain.`, "info");
    } else {
      setStatus(dom.status, `${state.songs.length} lagu ditampilkan untuk "${query}".`, "info");
    }
  } catch (error) {
    const message = error instanceof ApiError ? error.message : "Terjadi kesalahan tak terduga.";
    setStatus(dom.status, message, "error");
  } finally {
    setBusy(false);
    dom.moreBtn.hidden = !state.hasMore;
  }
}

dom.form.addEventListener("submit", (event) => {
  event.preventDefault();
  runSearch(dom.input.value, false);
});
dom.moreBtn.addEventListener("click", () => runSearch(state.query, true));
document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    dom.input.value = chip.dataset.query || "";
    runSearch(dom.input.value, false);
  });
});

/* ---------- pemutar ---------- */
function syncPlayingMarks() {
  const current = player.current;
  markPlaying(dom.results, current ? current.id : "", player.isPlaying);
}

function setFill(fillNode, fraction) {
  fillNode.style.width = `${Math.min(Math.max(fraction, 0), 1) * 100}%`;
}

function showPlayerMessage(message) {
  dom.message.hidden = !message;
  dom.message.textContent = message || "";
}

function fillQualityOptions(song) {
  dom.quality.replaceChildren();
  QUALITY_ORDER.filter((quality) => song.streams[quality]).forEach((quality) => {
    const option = el("option", { text: quality.toUpperCase(), attrs: { value: quality } });
    dom.quality.appendChild(option);
  });
  dom.quality.value = player.activeQuality || "";
}

function updateMediaSession(song) {
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album,
    artwork: song.coverLarge ? [{ src: song.coverLarge, sizes: "500x500", type: "image/jpeg" }] : []
  });
}

player.addEventListener("songchange", (event) => {
  const song = event.detail;
  dom.player.hidden = false;
  dom.title.textContent = song.title;
  dom.artist.textContent = song.artist;
  dom.cover.src = song.coverSmall || "";
  dom.download.href = song.streams[player.activeQuality] || "#";
  fillQualityOptions(song);
  showPlayerMessage("");
  updateMediaSession(song);
  syncPlayingMarks();
  updatePlayerHeight();
});

player.addEventListener("statechange", () => {
  dom.toggle.textContent = player.isPlaying ? "JEDA" : "PUTAR";
  syncPlayingMarks();
});

player.addEventListener("timeupdate", () => {
  const { currentTime, duration } = player.audio;
  const known = Number.isFinite(duration) && duration > 0;
  dom.timeCurrent.textContent = formatTime(currentTime);
  dom.timeTotal.textContent = formatTime(known ? duration : 0);
  const fraction = known ? currentTime / duration : 0;
  setFill(dom.seekFill, fraction);
  dom.seek.value = String(Math.round(fraction * 1000));
});

player.addEventListener("error", (event) => showPlayerMessage(event.detail));

dom.toggle.addEventListener("click", () => player.toggle());
dom.prev.addEventListener("click", () => player.prev());
dom.next.addEventListener("click", () => player.next());
dom.repeat.addEventListener("click", () => {
  dom.repeat.textContent = REPEAT_LABELS[player.cycleRepeat()];
});
dom.seek.addEventListener("input", () => player.seekFraction(Number(dom.seek.value) / 1000));
dom.volume.addEventListener("input", () => {
  const fraction = Number(dom.volume.value) / 100;
  player.setVolume(fraction);
  setFill(dom.volumeFill, fraction);
});
dom.quality.addEventListener("change", () => {
  player.setQuality(dom.quality.value);
  const song = player.current;
  if (song) dom.download.href = song.streams[player.activeQuality] || "#";
});

if ("mediaSession" in navigator) {
  const actions = {
    play: () => player.toggle(),
    pause: () => player.toggle(),
    previoustrack: () => player.prev(),
    nexttrack: () => player.next()
  };
  Object.entries(actions).forEach(([name, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(name, handler);
    } catch {
      /* aksi tidak didukung browser ini */
    }
  });
}

/* ---------- tinggi pemutar -> ruang kosong di bawah halaman ---------- */
function updatePlayerHeight() {
  const height = dom.player.hidden ? 0 : dom.player.offsetHeight;
  document.documentElement.style.setProperty("--player-h", `${height}px`);
}
if ("ResizeObserver" in window) new ResizeObserver(updatePlayerHeight).observe(dom.player);
window.addEventListener("resize", updatePlayerHeight);

setFill(dom.volumeFill, 1);
