// scripts/components/footer.js
// @ts-check

/**
 * <prasis-footer> — semantic footer (structure only)
 * Attributes:
 *  - logo-src   (default: "/assets/prasis_logo.svg")
 *  - home-href  (default: "/index.html")
 */
class PrasisFooter extends HTMLElement {
  connectedCallback() {
    this.render();
  }

  /** Render the footer markup */
  render() {
    const logoSrc = this.getAttribute("logo-src") || "/assets/prasis_logo.svg";
    const homeHref = this.getAttribute("home-href") || "/index.html";
    const year = new Date().getFullYear();

    this.innerHTML = /* html */ `
      <footer class="site-footer" role="contentinfo" data-component="footer">
        <div class="container site-footer__inner">

          <div class="site-footer__left">
            <a class="logo site-footer__logo" href="${homeHref}" aria-label="Prasis home">
              <img class="logo__img" src="${logoSrc}" alt="Prasis" />
            </a>
            <p class="site-footer__copyright">© ${year} Prasis</p>
          </div>

          <div class="site-footer__right">
            <nav class="footer-nav" aria-label="Footer">
              <!-- Default links; override by providing slot="footer-nav" -->
              <slot name="footer-nav">
                <ul class="footer-nav__list">
                  <li class="footer-nav__item"><a class="footer-nav__link" href="/pages/about.html">About</a></li>
                  <li class="footer-nav__item"><a class="footer-nav__link" href="/pages/contact.html">Contact</a></li>
                  <li class="footer-nav__item"><a class="footer-nav__link" href="/pages/terms.html">Terms &amp; Conditions</a></li>
                  <li class="footer-nav__item"><a class="footer-nav__link" href="/pages/privacy.html">Privacy</a></li>
                </ul>
              </slot>
            </nav>

            <div class="site-footer__social">
              <!-- Default socials; override with slot="social" -->
              <slot name="social">
                <a href="https://instagram.com" class="social__link" aria-label="Instagram">Instagram</a>
                <a href="https://x.com" class="social__link" aria-label="X (Twitter)">X</a>
              </slot>
            </div>
          </div>

        </div>
      </footer>
    `;
  }
}

customElements.define("prasis-footer", PrasisFooter);
