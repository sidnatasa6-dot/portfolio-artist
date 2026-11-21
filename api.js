"use strict";

class HttpError extends Error {
  constructor(status) {
    super("HTTP " + status);
    this.name = "HttpError";
    this.status = status;
  }
}

async function fetchJson(url, options = {}) {
  const { timeoutMs = 8000, externalController } = options;
  const controller = externalController || new AbortController();

  let timedOut = false;
  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error("Сервер не відповів вчасно. Спробуйте ще раз.");
    }
    if (error.name === "AbortError") {
      throw error;
    }
    throw new Error("Немає з'єднання з сервером. Перевірте інтернет.");
  } finally {
    clearTimeout(timerId);
  }

  if (!response.ok) {
    throw new HttpError(response.status);
  }

  try {
    return await response.json();
  } catch {
    throw new Error("Сервер повернув некоректні дані (не у форматі JSON).");
  }
}

function describeError(error) {
  if (error instanceof HttpError) {
    if (error.status === 404) return "Нічого не знайдено (код 404).";
    if (error.status === 429) return "Забагато запитів. Зачекайте хвилину і спробуйте знову.";
    if (error.status >= 500) return "Помилка на боці сервісу. Спробуйте пізніше.";
    return "Сервіс відповів помилкою (код " + error.status + ").";
  }
  return error.message || "Сталася невідома помилка.";
}

const form = document.querySelector("#search-form");
const queryInput = document.querySelector("#query-input");
const formError = document.querySelector("#form-error");
const statusBox = document.querySelector("#status");
const placesList = document.querySelector("#places");
const resultBox = document.querySelector("#result");

const state = { status: "idle", message: "" };
let lastAction = null;

function setStatus(status, message = "") {
  state.status = status;
  state.message = message;
  renderStatus();
}

function renderStatus() {
  statusBox.replaceChildren();

  if (state.status === "loading") {
    statusBox.textContent = "Завантаження...";
  } else if (state.status === "empty") {
    statusBox.textContent = state.message;
  } else if (state.status === "error") {
    const text = document.createElement("p");
    text.textContent = state.message;

    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.textContent = "Повторити";
    retryBtn.addEventListener("click", () => {
      if (lastAction) lastAction();
    });

    statusBox.append(text, retryBtn);
  }
}

const WIKI_API = "https://" + "commons.wikimedia.org" + "/w/api.php";

let currentController = null;

async function searchArtworks(query) {
  lastAction = () => searchArtworks(query);

  if (currentController) {
    currentController.abort();
  }
  currentController = new AbortController();

  setStatus("loading");
  placesList.replaceChildren();
  resultBox.replaceChildren();

  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: "filetype:bitmap " + query + " painting",
      gsrnamespace: "6",
      gsrlimit: "6",
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "400",
      format: "json",
      origin: "*"
    });

    const data = await fetchJson(WIKI_API + "?" + params.toString(), {
      externalController: currentController
    });

    const pages = data.query ? Object.values(data.query.pages) : [];

    if (pages.length === 0) {
      setStatus("empty", "За запитом «" + query + "» творів мистецтва не знайдено.");
      return;
    }

    setStatus("success");
    renderArtworks(pages);
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus("error", describeError(error));
  }
}

function renderArtworks(pages) {
  const grid = document.createElement("div");
  grid.className = "api-grid";

  for (const item of pages) {
    const info = Array.isArray(item.imageinfo) ? item.imageinfo[0] : null;
    if (!info) continue;

    const meta = info.extmetadata || {};
    const rawTitle = meta.ObjectName
      ? meta.ObjectName.value
      : item.title.replace(/^File:/, "");
    const cleanTitle = rawTitle.replace(/<[^>]*>/g, "").slice(0, 80) || "Твір мистецтва";
    const rawArtist = meta.Artist
      ? meta.Artist.value.replace(/<[^>]*>/g, "").slice(0, 70)
      : "Музейний архів";
    const rawDate = meta.DateTimeOriginal
      ? meta.DateTimeOriginal.value.replace(/<[^>]*>/g, "").slice(0, 30)
      : "Класичний період";

    const card = document.createElement("article");
    card.className = "api-card";

    if (info.thumburl) {
      const img = document.createElement("img");
      img.src = info.thumburl;
      img.alt = "Картина «" + cleanTitle + "»";
      img.loading = "lazy";
      card.append(img);
    }

    const title = document.createElement("h3");
    title.textContent = cleanTitle;

    const artist = document.createElement("p");
    artist.textContent = "Автор: " + rawArtist;

    const date = document.createElement("p");
    date.textContent = "Період створення: " + rawDate;

    card.append(title, artist, date);
    grid.append(card);
  }

  resultBox.replaceChildren(grid);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = queryInput.value.trim();

  if (query.length < 2) {
    formError.textContent = "Введіть щонайменше 2 символи для пошуку.";
    queryInput.focus();
    return;
  }

  formError.textContent = "";
  searchArtworks(query);
});

queryInput.addEventListener("input", () => {
  const query = queryInput.value.trim();
  if (query.length >= 3) {
    formError.textContent = "";
    searchArtworks(query);
  }
});

searchArtworks("monet");
