// @ts-check

/**
 * <Prasis Header - logged in site> - header for site with logo and primary nav-meny.
 *
 * Responsibility:
 * Enforces auth on logged in pages, and redirect to login if no access-token stored.
 * Make and render the semantic header/nav structure, including ID/CLASS.
 * Highlighting where user is on the page (as long as the user is within the nav-options).
 * Show live car count from local storage, sum of qty.
 * Should show profile + logout. Should be no loggin.
 *
 * Usage (private page):
 *      <prasis-header mode="private"></prasis-header>
 *      <prasis-header mode="private"> login-url="/pages/login/login.html"></prasis-header>
 *
 * Dependencies
 * - LocalStorage:
 *      - accessToken (presence = logged in)
 *      - userDetails = { name, emial }
 *      - prasis:cart [{ listingId, qty }, ...]
 *
 * events
 * - Listens for:
 *      - windows "storage" (cross tab changes)
 *      - custom CART_EVENT ("prasis:cart-change") for in-app updates
 *
 */

import {
  ACCESS_TOKEN_KEY,
  API_KEY_STORAGE,
  CART_STORAGE_KEY,
  CART_EVENT,
} from "../constants.js";

class PrasisHeader extends HTMLElement {
  _navId = `nav-${Math.random().toString(36).slice(2, 9)}`;

  connectedCallback() {
    this.enforceAuthIfRequired(); // go away if missing token
    this.render(); // write the markup itself
    this.highlightActiveLink(); // mark where theuser are
    this.updateAuthNav(); // show profile/or nogout
    this.updateCartBadge(); // show cart count

    this.addEventListener("click", this.handleHeaderClick);
    window.addEventListener("storage", this.handleStorage);
    window.addEventListener(CART_EVENT, this.handleCartEvent);
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.handleHeaderClick);
    window.removeEventListener("storage", this.handleStorage);
    window.removeEventListener(CART_EVENT, this.handleCartEvent);

    document.removeEventListener("click", this.handleDocClick, {
      capture: true,
    });
    document.removeEventListener("keydown", this.handleKeydown);
  }

  /** throw to login if not loged in or no token stored */
  enforceAuthIfRequired() {
    const isPrivate =
      this.getAttribute("mode") === "private" ||
      this.hasAttribute("require-auth");
    if (!isPrivate) return;

    if (!localStorage.getItem(ACCESS_TOKEN_KEY)) {
      const loginUrl =
        this.getAttribute("login-url") || "/pages/login/login.html";
      const redirect = encodeURIComponent(location.pathname + location.search);
      location.href = `${loginUrl}?redirect=${redirect}`;
    }
  }

  /**
   * Render sematic HTML. No styling here.-
   */
  render() {
    const logoSrc = this.getAttribute("logo-src") || "/assets/prasis_logo.svg";
    const homeHref = this.getAttribute("home-href") || "/index.html";

    this.innerHTML = /* html */ `
              <header class="site-header" role="banner" data-component="header">
                  <div class="container site-header__inner">
                      <div class="site-header__left">
                            <a class="logo site-header__logo" href="${homeHref}" aria-label="Prasis home">
                                <img class="logo__img" src="${logoSrc}" alt="Prasis Logo" />
                            </a>
                      </div>

                        <div class="site-header__right">
                            <!-- note to self: Accessible menu toggle here, behaviour only, style later yesyes) -->
                            <button
                                class="site-header__toggle"
                                type="button"
                                aria-label="Toggle navigation"
                                aria-controls="${this._navId}"
                                aria-expanded="false"
                            >Menu</button>
 
                            <nav id="${this._navId}" class="nav site-header__nav" aria-label="Primary" hidden>
                            <ul class="nav__list">
                                <li class="nav__item"><a class="nav__link" href="/index.html">Browse</a></li>
                                <li class="nav__item"><a class="nav__link" href="/pages/about.html">About</a></li>

                                <li class="nav__item nav__item--cart">
                                    <a class="nav__link nav__link--cart" href="/pages/cart.html" aria-label="Open cart">
                                        Cart <span class="nav__cart-badge" aria-live="polite" aria-atomic="true">0</span>
                                    </a>
                                </li>

                                <li class="nav__item nav__item--auth" data-auth="logged-in" hidden>
                                    <a class="nav__link" href="/pages/profile.html">
                                        <span class="nav__user-name" data-user-name></span>
                                    </a>
                                    <button class="nav__logout" type="button" aria-label="Log out">Logout</button>
                                </li>
                            </ul>
                        </nav>
                      </div>  
                  </div>
              </header>
          `;
  }

  /** Find where in navn user is and higlight it */
  highlightActiveLink() {
    const current = this.normalize(location.pathname);
    this.querySelectorAll(".nav__link").forEach((a) => {
      const href = a.getAttribute("href") || "/";
      const path = this.normalize(new URL(href, location.origin).pathname);
      const isActive =
        current === path || (path !== "/" && current.startsWith(path));
      if (isActive) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /** Verify user logged in /access and fil user name */
  updateAuthNav() {
    const hasToken = !!localStorage.getItem(ACCESS_TOKEN_KEY);

    this.querySelectorAll('[data-auth="logged-in"]').forEach(
      (el) => (el.hidden = !hasToken)
    );

    const raw = localStorage.getItem("userDetails");
    if (raw) {
      const user = this.safeJSON(raw);
      const nameEl = this.querySelector("[data-user-name]");
      if (nameEl) nameEl.textContent = user?.name || "Account";
    }
  }

  /** Cart funktion, read and update */

  updateCartBadge() {
    const badge = this.querySelector(".nav__cart-badge");
    if (!badge) return;

    const items = this.readCart(); // ← make sure it's plural here
    const count = Array.isArray(items)
      ? items.reduce((s, it) => s + (Number(it?.qty) || 0), 0)
      : 0;

    badge.textContent = String(count);
  }

  // !!! MOBILE MENY !!!
  toggleNav(open) {
    const btn = this.getToggleBtnEl();
    const nav = this.getNavEl();
    if (!btn || !nav) return;

    const shouldOpen = typeof open === "boolean" ? open : nav.hidden;
    nav.hidden = !shouldOpen;
    btn.setAttribute("aria-expanded", String(shouldOpen));
  }

  openNav() {
    this.toggleNav(true);
    document.addEventListener("click", this.handleDocClick, { capture: true });
    document.addEventListener("keydown", this.handleKeydown);
  }

  closeNav() {
    this.toggleNav(false);
    document.removeEventListener("click", this.handleDocClick, {
      capture: true,
    });
    document.removeEventListener("keydown", this.handleKeydown);
  }

  handleDocClick = (e) => {
    const nav = this.getNavEl();
    if (!nav) return;

    const t = e.target;
    if (!(t instanceof Element)) return;

    const clickedToggle = t.closest(".site-header__toggle");
    const insideNav = t.closest(`#${this._navId}`);

    if (clickedToggle) {
      nav.hidden ? this.openNav() : this.closeNav();
      return;
    }
    if (insideNav && t.closest("a")) {
      this.closeNav();
      return;
    }
    if (!insideNav && !nav.hidden) this.closeNav();
  };

  handleKeydown = (e) => {
    if (e.key === "Escape") this.closeNav();
  };

  // !!! DVS EVENTS !!!

  handleHeaderClick = (e) => {
    // Handle menu toggle
    const toggle =
      e.target && e.target.closest && e.target.closest(".site-header__toggle");
    if (toggle) {
      const nav = this.getNavEl(); // ← use helper (HTMLElement | null)
      if (!nav) return;

      if (nav.hidden) this.openNav(); // no TS error now
      else this.closeNav();

      return;
    }

    // Logout
    const logoutBtn =
      e.target && e.target.closest && e.target.closest(".nav__logout");
    if (!logoutBtn) return;

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(API_KEY_STORAGE);
    //NOTE TO SELF !!!! SHOULD I also clear Cart_STORAGE KEY???

    this.updateAuthNav();

    const loginUrl =
      this.getAttribute("login-url") || "/pages/login/login.html";
    location.href = loginUrl;
  };

  handleStorage = (/** @type {StorageEvent} */ e) => {
    if (e.key === CART_STORAGE_KEY) this.updateCartBadge();
    if (e.key === ACCESS_TOKEN_KEY) this.updateAuthNav();
  };

  handleCartEvent = () => {
    this.updateCartBadge();
  };

  // !!! HJELPER DETTE

  readCart() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  normalize(p) {
    let path = (p || "/").toLowerCase();
    path = path.replace(/index\.html$/, "");
    if (path.endsWith("/") && path !== "/") path = path.slice(0, -1);
    return path || "/";
  }

  safeJSON(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  getNavEl() {
    const el = this.querySelector(`#${this._navId}`);
    return el instanceof HTMLElement ? el : null;
  }
  getToggleBtnEl() {
    const el = this.querySelector(".site-header__toggle");
    return el instanceof HTMLButtonElement ? el : null;
  }
}

customElements.define("prasis-header", PrasisHeader);
