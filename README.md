# Dawn sections

Drop-in sections for Shopify **Dawn** and any Online Store 2.0 theme. Each section is one Liquid file
(plus one small JS file when it needs behaviour): copy, add in the theme editor, done.

No jQuery, no build step, no app. Settings are editable by the merchant, styles are scoped to the
section, scripts are custom elements loaded with `defer`. Every file passes
[Shopify Theme Check](https://shopify.dev/docs/storefronts/themes/tools/theme-check) with zero offenses.

| Section | What it does | Files |
|---|---|---|
| [Age gate](#age-gate) | Full-screen "Are you over 18?" dialog with cookie, redirect and blur. Works on every page. | `sections/age-gate.liquid`, `assets/age-gate.js` |
| [Sticky add to cart](#sticky-add-to-cart) | Bar that appears when the product form scrolls away. Submits the real form, follows the variant. | `sections/sticky-add-to-cart.liquid`, `assets/sticky-add-to-cart.js` |
| [FAQ](#faq) | Accordion on native `<details>`, open-one-at-a-time, FAQPage JSON-LD. No JavaScript. | `sections/faq.liquid` |

## Install

1. Copy the section file into your theme's `sections/` folder and the matching script (if any) into `assets/`.
2. Open the theme editor, click **Add section** and pick it by name.
3. Fill in the settings. That is all.

Tested against Dawn 15. Other OS 2.0 themes work too; the notes under each section say what to check.

## Age gate

Made for vape, alcohol, CBD and adult stores. Built from a production store that had to block
under-age visitors on every page, including collection and product pages opened from ads.

- Add it to the **Header** or **Footer** section group so it covers every template.
- Remembers the answer in a cookie (`age_gate_ok`, 1 to 365 days).
- "No" sends the visitor to any URL (Google by default).
- Optional blur of the page behind the dialog, logo, all texts and colours in settings.
- Accessible: `role="dialog"`, `aria-modal`, focus moves to the first button, Tab stays inside, page scroll is locked. Escape is ignored on purpose.
- In the theme editor the dialog opens when you select the section and closes when you deselect it, so you can style it without clearing cookies.

Other themes: the blur targets `#MainContent`, `header` and `footer`. Change the selector list in `blurTargets()` if your theme uses other wrappers.

## Sticky add to cart

A bottom bar with image, title, price, selected variant and an Add to cart button.

- Shows when the main Add to cart button leaves the viewport (`IntersectionObserver`), hides when you scroll back up.
- The button carries a `form` attribute pointing at the real product form, so the theme's own add-to-cart code runs: cart drawer, cart notification, error messages, quantity rules.
- Follows the selected variant: price and compare-at price (formatted by Liquid `money`, not by JS), availability ("Sold out"), variant title and image.
- Variant changes come from Dawn's pub/sub (`variant-change`) when available, with a fallback on the form's hidden `id` input for any other theme.
- Mobile and desktop can be switched on and off separately. Safe-area padding for phones with a home indicator.

Other themes: the script looks for the first `form[action*="/cart/add"]` that contains `input[name="id"]`. If your theme renders a quick-add form higher in the DOM, move this section above it in the template or narrow the selector in `findProductForm()`.

## FAQ

- Native `<details>`/`<summary>`: works with keyboard and screen readers without a line of JavaScript.
- "Open one question at a time" uses the `name` attribute on `<details>` (Chrome 120+, Safari 17.2+, Firefox 130+). Older browsers simply allow several questions open at once.
- Smooth open and close where the browser supports `interpolate-size` and `::details-content`; instant elsewhere.
- Optional **FAQPage** JSON-LD built from the same blocks, for rich results in Google.
- Uses Dawn colour schemes (`color_scheme` setting). On other themes delete that setting or map it to your theme's scheme classes.

## Roadmap

- Add-to-cart upsell modal (Section Rendering API, no app)
- Free shipping progress bar in the cart drawer
- Store availability per location on the product page
- Product tabs from metafields

Open an issue if you need a section that is not here. Stars and forks are welcome, they show which
sections people actually use.

## Author

[Oleh Molchanov](https://oleh-molchanov.vercel.app), Shopify developer, Kyiv. Also on
[LinkedIn](https://www.linkedin.com/in/olehmolchanov/).

## License

MIT
