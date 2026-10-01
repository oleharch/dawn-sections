/**
 * <age-gate>
 * Shows the dialog unless the cookie is set, traps focus inside it,
 * locks page scroll and sends under-age visitors away.
 * In the theme editor the dialog opens when the section is selected.
 */
class AgeGate extends HTMLElement {
  constructor() {
    super();
    this.cookieName = this.dataset.cookieName || 'age_gate_ok';
    this.cookieDays = parseInt(this.dataset.cookieDays, 10) || 30;
    this.denyUrl = this.dataset.denyUrl || 'https://www.google.com';
    this.blur = this.dataset.blur === 'true';
    this.designMode = this.dataset.designMode === 'true';

    this.onConfirm = this.onConfirm.bind(this);
    this.onDeny = this.onDeny.bind(this);
    this.onKeydown = this.onKeydown.bind(this);
  }

  connectedCallback() {
    this.querySelector('[data-age-gate-confirm]').addEventListener('click', this.onConfirm);
    this.querySelector('[data-age-gate-deny]').addEventListener('click', this.onDeny);

    if (this.designMode) {
      const sectionId = this.id.replace('age-gate-', '');
      document.addEventListener('shopify:section:select', (event) => {
        if (event.detail.sectionId === sectionId) this.open();
      });
      document.addEventListener('shopify:section:deselect', (event) => {
        if (event.detail.sectionId === sectionId) this.close();
      });
      return;
    }

    if (!this.hasCookie()) this.open();
  }

  open() {
    if (!this.hidden) return;
    this.lastFocused = document.activeElement;
    this.hidden = false;
    this.blurTargets().forEach((el) => el.classList.add('age-gate-blur'));
    document.documentElement.classList.add('age-gate-lock');
    document.addEventListener('keydown', this.onKeydown);
    requestAnimationFrame(() => {
      this.classList.add('age-gate--visible');
      this.querySelector('[data-age-gate-confirm]').focus();
    });
  }

  close() {
    if (this.hidden) return;
    this.classList.remove('age-gate--visible');
    this.blurTargets().forEach((el) => el.classList.remove('age-gate-blur'));
    document.documentElement.classList.remove('age-gate-lock');
    document.removeEventListener('keydown', this.onKeydown);
    this.addEventListener('transitionend', () => { this.hidden = true; }, { once: true });
    setTimeout(() => { this.hidden = true; }, 400);
    if (this.lastFocused && this.lastFocused.focus) this.lastFocused.focus();
  }

  onConfirm() {
    this.setCookie();
    this.close();
  }

  onDeny() {
    if (this.designMode) return;
    window.location.href = this.denyUrl;
  }

  /* Keep Tab inside the dialog; Escape is intentionally ignored. */
  onKeydown(event) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(this.querySelectorAll('button, a[href]'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  blurTargets() {
    if (!this.blur) return [];
    const selector = '#MainContent, header, footer, .shopify-section-group-header-group, .shopify-section-group-footer-group';
    return Array.from(document.querySelectorAll(selector)).filter((el) => !el.contains(this));
  }

  hasCookie() {
    return document.cookie.split('; ').some((c) => c.startsWith(`${this.cookieName}=`));
  }

  setCookie() {
    const expires = new Date(Date.now() + this.cookieDays * 864e5).toUTCString();
    document.cookie = `${this.cookieName}=1; expires=${expires}; path=/; SameSite=Lax`;
  }
}

if (!customElements.get('age-gate')) customElements.define('age-gate', AgeGate);
