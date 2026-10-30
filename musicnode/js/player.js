// Pemutar audio: antrian, kualitas, ulang, seek, volume. Memancarkan event ke UI.
import { DEFAULT_QUALITY, QUALITY_ORDER } from "./config.js";

export function resolveQuality(song, preferred) {
  if (song.streams[preferred]) return preferred;
  const start = QUALITY_ORDER.indexOf(preferred);
  for (let i = start - 1; i >= 0; i -= 1) if (song.streams[QUALITY_ORDER[i]]) return QUALITY_ORDER[i];
  for (let i = start + 1; i < QUALITY_ORDER.length; i += 1) if (song.streams[QUALITY_ORDER[i]]) return QUALITY_ORDER[i];
  return null;
}

export class Player extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = "metadata";
    this.queue = [];
    this.index = -1;
    this.preferredQuality = DEFAULT_QUALITY;
    this.activeQuality = null;
    this.repeat = "off"; // off | all | one
    this.bindAudioEvents();
  }

  emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }

  get current() {
    return this.queue[this.index] || null;
  }

  get isPlaying() {
    return !this.audio.paused && !this.audio.ended;
  }

  bindAudioEvents() {
    const audio = this.audio;
    audio.addEventListener("play", () => this.emit("statechange"));
    audio.addEventListener("pause", () => this.emit("statechange"));
    audio.addEventListener("timeupdate", () => this.emit("timeupdate"));
    audio.addEventListener("loadedmetadata", () => this.emit("timeupdate"));
    audio.addEventListener("durationchange", () => this.emit("timeupdate"));
    audio.addEventListener("ended", () => this.handleEnded());
    audio.addEventListener("error", () => {
      this.emit("error", "Lagu tidak bisa diputar. Coba kualitas lain atau lagu berikutnya.");
    });
  }

  playFromList(list, startIndex) {
    this.queue = list; // referensi sama dengan daftar hasil, jadi ikut bertambah saat "muat lagi"
    this.playIndex(startIndex);
  }

  playIndex(index) {
    const song = this.queue[index];
    if (!song) return;
    const quality = resolveQuality(song, this.preferredQuality);
    if (!quality) {
      this.emit("error", "Lagu ini tidak punya tautan audio.");
      return;
    }
    this.index = index;
    this.activeQuality = quality;
    this.audio.src = song.streams[quality];
    this.emit("songchange", song);
    this.startPlayback();
  }

  startPlayback() {
    const attempt = this.audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch((error) => {
        if (error && error.name === "AbortError") return;
        this.emit("error", "Pemutaran diblokir atau gagal. Tekan PUTAR untuk mencoba lagi.");
      });
    }
  }

  toggle() {
    if (!this.current) return;
    if (this.audio.paused) this.startPlayback();
    else this.audio.pause();
  }

  next() {
    if (this.queue.length === 0) return;
    if (this.index + 1 < this.queue.length) this.playIndex(this.index + 1);
    else if (this.repeat === "all") this.playIndex(0);
  }

  prev() {
    if (this.queue.length === 0) return;
    if (this.audio.currentTime > 3 || this.index <= 0) {
      this.audio.currentTime = 0;
      return;
    }
    this.playIndex(this.index - 1);
  }

  handleEnded() {
    if (this.repeat === "one") {
      this.audio.currentTime = 0;
      this.startPlayback();
    } else if (this.index + 1 < this.queue.length) {
      this.playIndex(this.index + 1);
    } else if (this.repeat === "all") {
      this.playIndex(0);
    } else {
      this.emit("statechange");
    }
  }

  cycleRepeat() {
    this.repeat = this.repeat === "off" ? "all" : this.repeat === "all" ? "one" : "off";
    return this.repeat;
  }

  seekFraction(fraction) {
    const duration = this.audio.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    this.audio.currentTime = Math.min(Math.max(fraction, 0), 1) * duration;
  }

  setVolume(fraction) {
    this.audio.volume = Math.min(Math.max(fraction, 0), 1);
  }

  setQuality(quality) {
    this.preferredQuality = quality;
    const song = this.current;
    if (!song) return;
    const resolved = resolveQuality(song, quality);
    if (!resolved || resolved === this.activeQuality) return;

    const resumeAt = this.audio.currentTime;
    const wasPlaying = this.isPlaying;
    this.activeQuality = resolved;
    this.audio.src = song.streams[resolved];
    this.audio.addEventListener(
      "loadedmetadata",
      () => {
        if (Number.isFinite(resumeAt)) this.audio.currentTime = resumeAt;
        if (wasPlaying) this.startPlayback();
      },
      { once: true }
    );
    this.emit("songchange", song);
  }
}
