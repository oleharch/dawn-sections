/**
 * <sticky-add-to-cart>
 * - finds the main product form (first form posting to /cart/add with a variant id)
 * - shows the bar when that form's submit button leaves the viewport
 * - the bar's button submits the real form through the `form` attribute,
 *   so the theme's own add-to-cart JS (cart drawer, notification, errors) runs
 * - follows variant changes: Dawn pub/sub when available, form change events otherwise
 */
class StickyAddToCart extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('[data-sticky-atc-button]');
    this.priceEl = this.querySelector('[data-sticky-atc-price]');
    this.variantEl = this.querySelector('[data-sticky-atc-variant]');
    this.imageEl = this.querySelector('[data-sticky-atc-image]');
    this.variants = this.readVariants();

    this.form = this.findProductForm();
    if (!this.form) return;

    /* `form.id` is shadowed by the <input name="id"> inside the form, so go through attributes. */
    if (!this.form.getAttribute('id')) this.form.setAttribute('id', `product-form-${Date.now()}`);
    this.button.setAttribute('form', this.form.getAttribute('id'));

    this.observeMainButton();
    this.listenToVariantChanges();
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    if (this.unsubscribe) this.unsubscribe();
  }

  /*
   * The main product form: posts to /cart/add, has a variant id and a submit button
   * (skips Dawn's installments form), is not inside a dialog, quick-add or upsell modal,
   * and preferably lives in #MainContent.
   */
  findProductForm() {
    const forms = Array.from(document.querySelectorAll('form[action*="/cart/add"]')).filter(
      (form) =>
        form.querySelector('input[name="id"]') &&
        form.querySelector('[type="submit"]') &&
        !this.contains(form) &&
        !form.closest('dialog, quick-add-modal, upsell-modal, cart-drawer, cart-notification')
    );
    return forms.find((form) => form.closest('#MainContent')) || forms[0] || null;
  }

  observeMainButton() {
    const target = this.form.querySelector('[type="submit"]') || this.form;
    if (!('IntersectionObserver' in window)) {
      this.show();
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        scrolledPast ? this.show() : this.hide();
      },
      { threshold: 0 }
    );
    this.observer.observe(target);
  }

  listenToVariantChanges() {
    const idInput = this.form.querySelector('input[name="id"]');

    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
        const variant = event && event.data && event.data.variant;
        if (variant) this.update(variant.id);
      });
    }

    /* Fallback and safety net: the hidden id input is updated by every OS 2.0 theme. */
    this.form.addEventListener('change', () => this.update(idInput.value));
    if (idInput) {
      new MutationObserver(() => this.update(idInput.value)).observe(idInput, { attributes: true, attributeFilter: ['value'] });
    }
  }

  update(variantId) {
    const variant = this.variants[String(variantId)];
    if (!variant || this.dataset.currentVariant === String(variant.id)) return;
    this.dataset.currentVariant = String(variant.id);

    if (this.priceEl) {
      this.priceEl.innerHTML = variant.compare_at_price
        ? `<s class="sticky-atc__compare">${variant.compare_at_price}</s> <span class="sticky-atc__price">${variant.price}</span>`
        : `<span class="sticky-atc__price">${variant.price}</span>`;
    }
    if (this.variantEl) this.variantEl.textContent = variant.title;
    if (this.imageEl && variant.image) {
      this.imageEl.src = variant.image;
      this.imageEl.removeAttribute('srcset');
    }
    this.button.disabled = !variant.available;
    this.button.textContent = variant.available ? this.dataset.addLabel : this.dataset.soldOutLabel;
  }

  readVariants() {
    const script = this.querySelector('[data-sticky-atc-variants]');
    if (!script) return {};
    try {
      return Object.fromEntries(JSON.parse(script.textContent).map((v) => [String(v.id), v]));
    } catch (error) {
      return {};
    }
  }

  show() {
    this.classList.add('sticky-atc--visible');
    this.setAttribute('aria-hidden', 'false');
  }

  hide() {
    this.classList.remove('sticky-atc--visible');
    this.setAttribute('aria-hidden', 'true');
  }
}

if (!customElements.get('sticky-add-to-cart')) customElements.define('sticky-add-to-cart', StickyAddToCart);
