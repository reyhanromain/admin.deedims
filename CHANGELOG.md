# Changelog

All notable product changes for Deedims are tracked here.

This project follows [Semantic Versioning](https://semver.org/) for the deployable product version and [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

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
