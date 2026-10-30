// Pembuat elemen DOM. Semua teks dari API dipasang lewat textContent (bukan innerHTML).
import { formatTime } from "./format.js";

export function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs) Object.entries(options.attrs).forEach(([key, value]) => node.setAttribute(key, value));
  children.forEach((child) => node.appendChild(child));
  return node;
}

export function createSongCard(song, onPlay) {
  const cover = el("img", {
    className: "card__cover",
    attrs: { alt: "", loading: "lazy", width: "150", height: "150" }
  });
  if (song.coverSmall) cover.src = song.coverSmall;

  const meta = el("div", { className: "card__meta" });
  if (song.duration > 0) meta.appendChild(el("span", { className: "badge", text: formatTime(song.duration) }));
  if (song.year) meta.appendChild(el("span", { className: "badge", text: song.year }));
  if (song.explicit) meta.appendChild(el("span", { className: "badge badge--danger", text: "EXPLICIT" }));

  const body = el("div", { className: "card__body" }, [
    el("h3", { className: "card__title", text: song.title }),
    el("p", { className: "card__artist", text: song.artist })
  ]);
  if (song.album) body.appendChild(el("p", { className: "card__album", text: song.album }));
  body.appendChild(meta);

  const button = el("button", { className: "btn btn--green btn--sm card__action", text: "PUTAR", attrs: { type: "button" } });
  button.addEventListener("click", onPlay);

  const card = el("article", { className: "card" }, [cover, body, button]);
  card.dataset.id = song.id;
  return card;
}

export function setStatus(node, message, kind = "info") {
  if (!message) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.textContent = message;
  node.classList.toggle("status--error", kind === "error");
}

export function markPlaying(container, currentId, isPlaying) {
  container.querySelectorAll(".card").forEach((card) => {
    const isCurrent = card.dataset.id === currentId;
    card.classList.toggle("card--active", isCurrent);
    const button = card.querySelector(".card__action");
    if (button) button.textContent = isCurrent ? (isPlaying ? "SEDANG DIPUTAR" : "DIJEDA") : "PUTAR";
  });
}
