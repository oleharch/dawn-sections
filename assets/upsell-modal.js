/**
 * <upsell-modal>
 * Listens for "product added" (Dawn pub/sub `cart-update`, or a `cart:added` DOM event for other
 * themes), loads recommendations for that product through the Section Rendering API and opens a
 * native <dialog>. Adds from the modal use the Ajax Cart API with `sections`, then hand the response
 * to the theme's cart drawer / notification, exactly like Dawn's own product form does.
 */
class UpsellModal extends HTMLElement {
  constructor() {
    super();
    this.dialog = this.querySelector('dialog');
    this.products = this.querySelector('[data-upsell-products]');
    this.added = this.querySelector('[data-upsell-added]');
    this.sessionKey = `upsell-modal-${this.dataset.sectionId}`;
    this.onCartUpdate = this.onCartUpdate.bind(this);
    this.onAddedEvent = this.onAddedEvent.bind(this);
  }

  connectedCallback() {
    this.querySelectorAll('[data-upsell-close]').forEach((button) => button.addEventListener('click', () => this.close()));
    this.dialog.addEventListener('click', (event) => { if (event.target === this.dialog) this.close(); });
    this.dialog.addEventListener('close', () => this.rememberShown());
    this.bindForms();

    if (this.dataset.designMode === 'true') {
      document.addEventListener('shopify:section:select', (event) => {
        if (event.detail.sectionId === this.dataset.sectionId) this.open();
      });
      document.addEventListener('shopify:section:deselect', (event) => {
        if (event.detail.sectionId === this.dataset.sectionId) this.close();
      });
      return;
    }

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, this.onCartUpdate);
    }
    document.addEventListener('cart:added', this.onAddedEvent);
  }

  disconnectedCallback() {
    if (this.unsubscribe) this.unsubscribe();
    document.removeEventListener('cart:added', this.onAddedEvent);
  }

  /* Dawn: `cartData` is the /cart/add.js response (a line item) when the source is a product form. */
  onCartUpdate(event) {
    if (!event || event.source === 'upsell-modal' || event.source === 'cart-items') return;
    const item = event.cartData && event.cartData.product_id ? event.cartData : null;
    if (item) this.show(item);
  }

  /* Other themes: document.dispatchEvent(new CustomEvent('cart:added', { detail: lineItem })) */
  onAddedEvent(event) {
    if (event.detail && event.detail.product_id) this.show(event.detail);
  }

  async show(item) {
    if (this.dataset.oncePerSession === 'true' && this.wasShown()) return;
    this.renderAdded(item);
    if (this.dataset.source !== 'manual') await this.loadRecommendations(item.product_id);
    if (!this.products.querySelector('[data-upsell-card]')) return;
    this.open();
  }

  async loadRecommendations(productId) {
    const url = `${this.dataset.recommendationsUrl}&product_id=${productId}&section_id=${this.dataset.sectionId}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return;
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fresh = html.querySelector('[data-upsell-products]');
      if (fresh) {
        this.products.innerHTML = fresh.innerHTML;
        this.bindForms();
      }
    } catch (error) {
      console.error('[upsell-modal]', error);
    }
  }

  renderAdded(item) {
    if (!this.added) return;
    const image = this.added.querySelector('[data-upsell-added-image]');
    const title = this.added.querySelector('[data-upsell-added-title]');
    const meta = this.added.querySelector('[data-upsell-added-meta]');
    if (item.image) {
      image.src = item.image.replace(/(\.[a-z]+)(\?.*)?$/i, '_128x128$1$2');
      image.hidden = false;
    } else {
      image.hidden = true;
    }
    title.textContent = item.product_title || item.title || '';
    const parts = [];
    if (item.variant_title && item.variant_title !== 'Default Title') parts.push(item.variant_title);
    if (item.quantity > 1) parts.push(`× ${item.quantity}`);
    parts.push(this.formatMoney(item.final_line_price != null ? item.final_line_price : item.line_price));
    meta.textContent = parts.join(' · ');
    this.added.hidden = false;
  }

  bindForms() {
    this.querySelectorAll('[data-upsell-form]').forEach((form) => {
      if (form.dataset.bound) return;
      form.dataset.bound = 'true';
      form.addEventListener('submit', (event) => this.addToCart(event, form));
      const select = form.querySelector('select[name="id"]');
      if (select) select.addEventListener('change', () => this.updatePrice(form, select));
    });
  }

  updatePrice(form, select) {
    const option = select.selectedOptions[0];
    const price = form.closest('[data-upsell-card]').querySelector('[data-upsell-price]');
    const compare = option.dataset.compareAtPrice;
    price.innerHTML = `${compare ? `<s>${compare}</s>` : ''}<span>${option.dataset.price}</span>`;
    form.querySelector('[type="submit"]').disabled = option.disabled;
  }

  async addToCart(event, form) {
    event.preventDefault();
    const button = form.querySelector('[type="submit"]');
    const error = form.querySelector('[data-upsell-error]');
    const cart = document.querySelector('cart-drawer') || document.querySelector('cart-notification');
    const body = new FormData(form);
    if (cart && typeof cart.getSectionsToRender === 'function') {
      body.append('sections', cart.getSectionsToRender().map((section) => section.id).join(','));
      body.append('sections_url', window.location.pathname);
    }
    button.disabled = true;
    error.hidden = true;

    try {
      const response = await fetch(this.dataset.cartAddUrl, {
        method: 'POST',
        headers: { Accept: 'application/javascript', 'X-Requested-With': 'XMLHttpRequest' },
        body,
      });
      const data = await response.json();
      if (data.status) {
        error.textContent = data.description || data.message;
        error.hidden = false;
        return;
      }
      if (typeof publish === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'upsell-modal', productVariantId: body.get('id'), cartData: data });
      }
      this.close();
      if (cart && typeof cart.renderContents === 'function') {
        cart.renderContents(data);
      } else {
        document.dispatchEvent(new CustomEvent('cart:added', { detail: data, bubbles: true }));
      }
    } catch (err) {
      error.textContent = window.cartStrings && window.cartStrings.error ? window.cartStrings.error : 'Something went wrong. Please try again.';
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  }

  open() {
    if (this.dialog.open) return;
    this.dialog.showModal();
    document.documentElement.style.overflow = 'hidden';
  }

  close() {
    if (!this.dialog.open) return;
    this.dialog.close();
    document.documentElement.style.overflow = '';
  }

  wasShown() {
    try { return sessionStorage.getItem(this.sessionKey) === '1'; } catch (e) { return false; }
  }

  rememberShown() {
    document.documentElement.style.overflow = '';
    try { sessionStorage.setItem(this.sessionKey, '1'); } catch (e) { /* storage blocked */ }
  }

  /* Shopify money format, same placeholders as `shop.money_format`. */
  formatMoney(cents, format = this.dataset.moneyFormat || '${{amount}}') {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const placeholder = /\{\{\s*(\w+)\s*\}\}/;
    const match = format.match(placeholder);
    const type = match ? match[1] : 'amount';
    const number = (precision, thousands, decimal) => {
      const fixed = (Number(cents) / 100).toFixed(precision);
      const [whole, fraction] = fixed.split('.');
      const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return fraction ? `${grouped}${decimal}${fraction}` : grouped;
    };
    const formats = {
      amount: () => number(2, ',', '.'),
      amount_no_decimals: () => number(0, ',', '.'),
      amount_with_comma_separator: () => number(2, '.', ','),
      amount_no_decimals_with_comma_separator: () => number(0, '.', ','),
      amount_with_apostrophe_separator: () => number(2, "'", '.'),
      amount_no_decimals_with_space_separator: () => number(0, ' ', '.'),
      amount_with_space_separator: () => number(2, ' ', ','),
      amount_with_period_and_space_separator: () => number(2, ' ', '.'),
    };
    const value = (formats[type] || formats.amount)();
    return format.replace(placeholder, value);
  }
}

if (!customElements.get('upsell-modal')) customElements.define('upsell-modal', UpsellModal);
