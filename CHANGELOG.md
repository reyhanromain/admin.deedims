# Changelog

All notable product changes for Deedims are tracked here.

This project follows [Semantic Versioning](https://semver.org/) for the deployable product version and [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

## [2.5.0] - 2026-06-26

### Added

- Sync admin CMS screens with browser URLs so direct navigation and back/forward history work for dashboard, orders, menus, customers, stock, settings, subscribers, and pre-orders.

### Changed

- Always show the Telegram bot cart edit action so customers can remove individual cart items before checkout.
- Split composed bot message templates into explicit CMS-editable templates for cart editing, payment prompts, variant quantity prompts, and variant-aware cart/order lines.
- Bold key pre-order values in start, reminder, and order detail bot messages for clearer customer-facing copy.
- Seed bot message templates during reset/reseed and safely migrate unchanged legacy default templates on startup.

### Fixed

- Lazy-load menu images in the CMS and mini app surfaces to reduce aborted image requests during navigation and editing.

## [2.4.0] - 2026-06-25

### Added

- Generate WebP image variants for menu image uploads while preserving the original image URL for bot and fallback behavior.
- Use optimized image variants in CMS previews, menu thumbnails, lightbox views, and Telegram Mini App catalog/detail/cart screens.
- Generate optimized image variants for starter seed upload assets during reset/reseed flows.

### Changed

- Expose optional `imageVariants` fields in menu APIs so existing images safely fall back to originals until variants exist.

## [2.3.0] - 2026-06-22

### Added

- Add editable bot message templates in Settings with explicit HTML source editing, placeholders, and per-section save controls.
- Add organized Settings message tabs with sticky tab navigation and sticky section save headers.
- Expose customer-facing bot copy for start, order, cart, my orders, order detail, reorder, and notification messages so labels are editable instead of hidden in code.

### Fixed

- Delete previous inline-button bot replies when customers send a new command.
- Show fulfillment week labels directly in the editable `/start` and notification templates.

## [2.2.0] - 2026-06-22

### Added

- Use fulfillment weeks for pre-order pickup and delivery windows instead of a single fixed date.
- Add a Firefox-safe fulfillment week picker in the admin CMS, excluding weekends and past weeks according to the ordering rules.
- Add CI promotion automation with UAT-gated production promotion and production-to-dev synchronization.

### Fixed

- Reword the bot `/order` prompt in the start flow.
- Prevent admin CMS order table columns from overlapping on narrow layouts.
- Separate target-specific promotion check contexts so staging and production gates do not block each other incorrectly.

## [2.1.0] - 2026-06-20

### Added

- Add optional unit labels for menu quantity buttons in the order flow.
- Support per-variant preview images and use the selected variant image in the product view.
- Show addon menus in the main catalog while keeping addon behavior intact.
- Rename starter seed variants to include their piece counts for clearer customer-facing labels.

## [2.0.0] - 2026-06-18

### Added

- Establish baseline product version for the current Telegram pre-order bot and admin CMS.
- Add branch, commit, pull request, and release/versioning workflow documentation.
