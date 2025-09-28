// scripts/components/listnings.js
// @ts-check

/**
 * !!!
 * Listings (public browse page)
 * !!!
 *
 * This file powers the homepage listings grid. It:
 * - Reads filters from the form (q, sort)
 * - Fetches public listings from the Noroff Auction API (no auth needed)
 * - Renders accessible cards into #listings-grid
 * - Supports "Load more" pagination
 * - Syncs state to URL (?q=&sort=&page=) for shareability
 *
 * Keeping things flat and readable so I can ship fast.
 */

/**
 * Noroff Auction API base + endpoint.
 * Using v2 which exposes /auction/listings with useful query flags.
 * Docs: Noroff API → Auction endpoints
 * (public GET does not require a token)
 */
const API_BASE = "https://v2.api.noroff.dev";
const LISTINGS_ENDPOINT = `${API_BASE}/auction/listings`;

/**
 * Shape of one listing (partial; only what I use now).
 * @typedef {Object} Listing
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string[]} media
 * @property {string} endsAt
 * @property {{ name: string, avatar?: string }} seller
 * @property {{ amount: number, bidderName?: string }[]=} bids
 */

/**
 * Query params used by this page.
 * @typedef {Object} QueryParams
 * @property {string} q
 * @property {"endingSoon"|"newest"|"highestBid"|"lowestBid"} sort
 * @property {number} page
 * @property {number} limit
 */

/* ===== DOM refs ===== */

const form = /** @type {HTMLFormElement|null} */ (
  document.getElementById("listing-filters")
);
const grid = /** @type {HTMLElement|null} */ (
  document.getElementById("listings-grid")
);
const statusEl = /** @type {HTMLElement|null} */ (
  document.getElementById("status")
);
const loadMoreBtn = /** @type {HTMLButtonElement|null} */ (
  document.getElementById("load-more")
);
const resetBtn = /** @type<HTMLButtonElement|null>*/ (
  document.getElementById("reset")
);

if (!grid) {
  console.warn("[listnings] #listings-grid not found; nothing to do.");
}

/* ===== State ===== */

let currentAbort = /** @type {AbortController|null} */ (null);

/** @type {QueryParams} */
let state = {
  q: "",
  sort: "endingSoon",
  page: 1,
  limit: 12, // keep initial payload small
};

/* ===== Helpers (formatting, URL, DOM) ===== */

/**
 * Turn a Date-ish string into a compact UI string.
 * @param {string} iso
 */
function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // Example: 28 Sep 14:05
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format credits.
 * @param {number|undefined} n
 */
function formatCredits(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "0 cr";
  return `${Math.round(n)} cr`;
}

/**
 * Extract current form/query params (falling back to defaults).
 * Also reflects them into the form controls when present.
 * @returns {QueryParams}
 */
function readParamsFromURLAndForm() {
  const url = new URL(location.href);
  const q = url.searchParams.get("q") ?? "";
  const sort = /** @type {QueryParams["sort"]} */ (
    url.searchParams.get("sort") || "endingSoon"
  );
  const page = Number(url.searchParams.get("page") || 1);

  // reflect into form if available
  if (form) {
    const qEl = /** @type {HTMLInputElement} */ (form.querySelector("#q"));
    const sortEl = /** @type {HTMLSelectElement} */ (
      form.querySelector("#sort")
    );
    if (qEl) qEl.value = q;
    if (sortEl) sortEl.value = sort;
  }

  return {
    q,
    sort,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    limit: state.limit,
  };
}

/**
 * Update URL without reloading (so the page is shareable).
 * @param {Partial<QueryParams>} patch
 */
function pushURL(patch) {
  const next = { ...state, ...patch };
  const url = new URL(location.href);
  url.searchParams.set("q", next.q);
  url.searchParams.set("sort", next.sort);
  url.searchParams.set("page", String(next.page));
  history.replaceState(null, "", url.toString());
}

/**
 * Clear grid content (for a fresh render).
 */
function clearGrid() {
  if (!grid) return;
  grid.innerHTML = "";
}

/**
 * Toggle loading status messaging (accessible)
 * @param {boolean} isLoading
 * @param {string=} message
 */
function setLoading(isLoading, message = "") {
  if (!statusEl || !grid) return;
  grid.setAttribute("aria-busy", String(isLoading));
  if (isLoading) {
    statusEl.hidden = false;
    statusEl.textContent = message || "Loading listings…";
  } else {
    statusEl.textContent = message || "";
    statusEl.hidden = !statusEl.textContent;
  }
}

/* ===== API ===== */

/**
 * Build API search URL with my local state mapped to Noroff params.
 * Notes:
 * - _active=true → only listings that haven’t ended
 * - _seller=true → include seller object
 * - _bids=true → include bids array (to compute highest bid)
 * - pagination via limit & offset
 * @param {QueryParams} params
 */
function buildApiUrl(params) {
  const url = new URL(LISTINGS_ENDPOINT);
  url.searchParams.set("_active", "true");
  url.searchParams.set("_seller", "true");
  url.searchParams.set("_bids", "true");
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("limit", String(params.limit));
  url.searchParams.set("page", String(params.page));

  if (params.q) url.searchParams.set("q", params.q);

  // map local sort → API-friendly approach
  // v2 API supports generic sort on fields; if not, we sort client-side after fetch.
  // To keep it safe in the exam window, do client-side sort for "highest/lowest bid".
  switch (params.sort) {
    case "newest":
      url.searchParams.set("sort", "created");
      url.searchParams.set("sortOrder", "desc");
      break;
    case "endingSoon":
      url.searchParams.set("sort", "endsAt");
      url.searchParams.set("sortOrder", "asc");
      break;
    // highest/lowest handled client-side
  }

  return url.toString();
}

/**
 * Fetch a page of listings.
 * @param {QueryParams} params
 * @returns {Promise<Listing[]>}
 */
async function fetchListings(params) {
  // cancel any in-flight request when user spams controls
  if (currentAbort) currentAbort.abort();
  currentAbort = new AbortController();

  const url = buildApiUrl(params);

  const res = await fetch(url, {
    method: "GET",
    signal: currentAbort.signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text || res.statusText}`);
  }

  /** @type {{ data: Listing[] }} */
  const payload = await res.json();
  let items = payload?.data || [];

  // client-side sorting for bids if requested
  if (params.sort === "highestBid" || params.sort === "lowestBid") {
    const byBid = (l /** @type{Listing}*/) => {
      const max = Math.max(0, ...(l.bids || []).map((b) => b.amount));
      return max;
    };
    items = items.sort((a, b) => {
      const da = byBid(a);
      const db = byBid(b);
      return params.sort === "highestBid" ? db - da : da - db;
    });
  }

  return items;
}

/* ===== Rendering ===== */

/**
 * Safely pick an image URL from the listing's media array.
 * Media in Noroff v2 can be strings OR objects like { url: string }.
 * Falls back to a local placeholder if nothing usable is found.
 * @param {Listing} l
 * @returns {string}
 */
function pickImage(l) {
  const m = l?.media;
  if (Array.isArray(m) && m.length) {
    const first = m[0];
    const candidate =
      typeof first === "string"
        ? first
        : first?.url || first?.src || first?.href || "";

    // basic sanity: allow http(s) or site-relative paths
    if (
      candidate &&
      (/^https?:\/\//i.test(candidate) || candidate.startsWith("/"))
    ) {
      return candidate;
    }
  }
  return "/assets/placeholder.svg";
}

/**
 * Compute highest bid quickly.
 * @param {Listing} l
 */
function highestBid(l) {
  if (!l.bids || l.bids.length === 0) return 0;
  return l.bids.reduce((max, b) => (b.amount > max ? b.amount : max), 0);
}

/**
 * Create a card element for one listing.
 * Card is neutral; styling comes from your global styles (grid/grid--cards etc.).
 * @param {Listing} l
 */
function renderCard(l) {
  const a = document.createElement("a");
  a.className = "card card--listing";
  a.href = `/pages/listing.html?id=${encodeURIComponent(l.id)}`;
  a.setAttribute("aria-label", `${l.title}`);

  a.innerHTML = `
    <figure class="card__media">
      <img src="${escapeHtml(pickImage(l))}" alt="" loading="lazy" />
    </figure>
    <div class="card__body">
      <h2 class="card__title">${escapeHtml(l.title)}</h2>
      <dl class="card__meta">
        <div>
          <dt>Ends</dt>
          <dd>${formatDate(l.endsAt)}</dd>
        </div>
        <div>
          <dt>Highest bid</dt>
          <dd>${formatCredits(highestBid(l))}</dd>
        </div>
        <div>
          <dt>Seller</dt>
          <dd>${escapeHtml(l.seller?.name || "—")}</dd>
        </div>
      </dl>
    </div>
  `;
  return a;
}

/**
 * Basic HTML escaper for user content.
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Render a batch of listings (append mode).
 * @param {Listing[]} items
 */
function appendCards(items) {
  if (!grid) return;
  const frag = document.createDocumentFragment();
  for (const l of items) frag.appendChild(renderCard(l));
  grid.appendChild(frag);
}

/* ===== Controllers (events + flow) ===== */

/**
 * Load the current page (append or replace based on page number).
 * Keeps the button visibility in sync.
 * @param {boolean} replace
 */
async function loadPage(replace = false) {
  try {
    setLoading(true, state.page === 1 ? "Loading listings…" : "Loading more…");

    const items = await fetchListings(state);

    if (replace) clearGrid();
    appendCards(items);

    // Heuristic: if we got less than limit, probably no more pages
    const hasMore = items.length >= state.limit;
    if (loadMoreBtn) loadMoreBtn.hidden = !hasMore;

    if (!items.length && state.page === 1) {
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = "No listings found. Try another search.";
      }
    } else {
      if (statusEl) statusEl.hidden = true;
    }
  } catch (err) {
    console.error(err);
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.textContent =
        "Could not load listings right now. Please try again.";
    }
    if (loadMoreBtn) loadMoreBtn.hidden = true;
  } finally {
    setLoading(false);
  }
}

/**
 * Apply filters from the form and refresh results.
 * @param {SubmitEvent} e
 */
function onApply(e) {
  e.preventDefault();
  if (!form) return;

  const q =
    /** @type {HTMLInputElement} */ (form.querySelector("#q"))?.value || "";
  const sort =
    /** @type {HTMLSelectElement} */ (form.querySelector("#sort"))?.value ||
    "endingSoon";

  state = { ...state, q, sort: /** @type any */ (sort), page: 1 };
  pushURL({ q: state.q, sort: state.sort, page: state.page });
  loadPage(true);
}

/**
 * Reset filters to defaults and refresh.
 */
function onReset() {
  state = { ...state, q: "", sort: "endingSoon", page: 1 };
  if (form) {
    const qEl = /** @type {HTMLInputElement} */ (form.querySelector("#q"));
    const sortEl = /** @type {HTMLSelectElement} */ (
      form.querySelector("#sort")
    );
    if (qEl) qEl.value = "";
    if (sortEl) sortEl.value = "endingSoon";
  }
  pushURL({ q: "", sort: "endingSoon", page: 1 });
  loadPage(true);
}

/**
 * Load next page (append).
 */
function onLoadMore() {
  state = { ...state, page: state.page + 1 };
  pushURL({ page: state.page });
  loadPage(false);
}

/* ===== Init ===== */

(function init() {
  if (!grid) return;

  // start from URL (keeps links shareable)
  state = readParamsFromURLAndForm();

  // wire events
  if (form) form.addEventListener("submit", onApply);
  if (resetBtn) resetBtn.addEventListener("click", onReset);
  if (loadMoreBtn) loadMoreBtn.addEventListener("click", onLoadMore);

  // first load replaces grid
  loadPage(true);
})();
