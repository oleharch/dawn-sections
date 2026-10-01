# Changelog

## 1.0.1

Fixes found while testing every section on a Dawn 16 dev store (screenshots added to the README).

- Age gate: `cookie_days` is a number setting (a 1-365 range has more than the 101 steps Shopify allows); blur now covers the header and footer section groups too.
- Sticky add to cart: the main form is found by attributes (`form.id` is shadowed by the `<input name="id">` inside it); forms inside dialogs, quick-add, upsell modals and Dawn's installments form are skipped.
- Upsell modal: product images keep a square ratio; add buttons are full width; Dawn's own cart notification or drawer is closed when the modal opens.
- Free shipping bar: the progress fill is `display: block`, because Dawn hides empty divs.

## 1.0.0

First release.

- Age gate: full-screen confirmation with cookie, redirect, blur and theme editor preview.
- Sticky add to cart: bar that submits the real product form and follows the selected variant.
- FAQ: native `<details>` accordion with exclusive open and FAQPage JSON-LD.
- Upsell modal: opens after add to cart with related, complementary or hand-picked products, rendered through the Section Rendering API.
- Free shipping bar: progress to the free shipping threshold, re-rendered by Liquid after every cart change, with a snippet for the cart drawer.
