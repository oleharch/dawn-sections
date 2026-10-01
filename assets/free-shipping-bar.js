/**
 * <free-shipping-bar>
 * After any cart change, fetches its own section through the Section Rendering API
 * (`?section_id=...`) and swaps the markup. Liquid recomputes the amount and the progress,
 * so there is no money math in JavaScript.
 * Listens to Dawn's pub/sub `cart-update` and to a `cart:updated` DOM event for other themes.
 */
class FreeShippingBar extends HTMLElement {
  constructor() {
    super();
    this.refresh = this.refresh.bind(this);
  }

  connectedCallback() {
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, this.refresh);
    }
    document.addEventListener('cart:updated', this.refresh);
    document.addEventListener('cart:added', this.refresh);
  }

  disconnectedCallback() {
    if (this.unsubscribe) this.unsubscribe();
    document.removeEventListener('cart:updated', this.refresh);
    document.removeEventListener('cart:added', this.refresh);
  }

  async refresh() {
    if (this.controller) this.controller.abort();
    this.controller = new AbortController();
    const url = `${window.location.pathname}?section_id=${this.dataset.sectionId}`;
    try {
      const response = await fetch(url, { signal: this.controller.signal });
      if (!response.ok) return;
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fresh = html.querySelector('[data-free-shipping-bar]');
      const current = this.querySelector('[data-free-shipping-bar]');
      if (fresh && current) current.replaceWith(fresh);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('[free-shipping-bar]', error);
    }
  }
}

if (!customElements.get('free-shipping-bar')) customElements.define('free-shipping-bar', FreeShippingBar);
