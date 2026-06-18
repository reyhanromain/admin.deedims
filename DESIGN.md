# Design

## Source of truth
- Status: Active
- Last refreshed: 2026-06-18
- Primary product surfaces: Telegram pre-order admin CMS, including dashboard, pre-orders, orders, customers, menu, stock, subscribers, Bot Messages, users, settings, and editor modals.
- Evidence reviewed: `README.md`, `frontend/src/App.tsx`, `frontend/src/theme.ts`, `frontend/src/styles.ts`, `frontend/src/ui.tsx`, `frontend/src/components/*`, `frontend/src/screens/*`, `frontend/src/index.css`.

## Brand
- Personality: Operational, warm, trustworthy, and compact for repeated admin use.
- Trust signals: Clear status labels, stable tables/cards, visible stock/order totals, direct admin actions, and consistent confirmation states.
- Avoid: Marketing-style hero pages, decorative layouts, oversized cards, one-note decorative palettes, and hidden primary actions.

## Product goals
- Goals: Make admin workflows fast on desktop and usable on phones for order checks, PO management, stock adjustments, menu edits, and customer lookup.
- Non-goals: Rebrand the product, add a new design system dependency, or replace the existing inline style architecture.
- Success signals: No horizontal page overflow on mobile, primary lists are readable as cards, touch targets are comfortable, and desktop density is preserved.

## Personas and jobs
- Primary personas: Deedims owner/admins handling pre-order operations.
- User jobs: Confirm/cancel orders, review active PO, adjust stock, edit menu items, manage customers/admins, and check operational settings.
- Key contexts of use: Desktop admin sessions and quick mobile checks while handling fulfillment.

## Information architecture
- Primary navigation: Dashboard, Pre-orders, Orders, Customers, Menus, Stock, Subscribers, Bot Messages, Users, Settings.
- Core routes/screens: Single SPA screen state in `frontend/src/store.tsx` with screen components in `frontend/src/screens`.
- Content hierarchy: Current screen title, active PO state, primary list/detail area, then secondary actions.

## Design principles
- Principle 1: Operational density first, but collapse tables into readable cards below tablet width.
- Principle 2: Primary actions must remain visible and touchable on phones.
- Tradeoffs: Mobile cards repeat labels and consume more vertical space to avoid unreadable horizontal scrolling.

## Visual language
- Color: Existing terracotta, bamboo, warm neutrals, and dark mode tokens from `frontend/src/theme.ts`.
- Typography: Plus Jakarta Sans for UI, Bricolage Grotesque for display numbers/titles.
- Spacing/layout rhythm: Desktop uses 20-28px content rhythm; mobile uses 12-16px content rhythm.
- Shape/radius/elevation: Existing rounded cards and soft borders; avoid nested decorative cards.
- Motion: Keep subtle existing modal/toast animations; mobile header may collapse while content is scrolled to increase working space.
- Imagery/iconography: Existing inline SVG icons and menu thumbnails.

## Components
- Existing components to reuse: `Sidebar`, `Header`, `Pager`, `MenuEditorModal`, `UserEditorModal`, `HoverButton`, `Pill`, shared theme/style helpers.
- New/changed components: Responsive hook, mobile card layouts for table-heavy screens, and Bot Messages conversation bubbles in a scrollable thread with newest messages at the bottom.
- Variants and states: Desktop table/list variants, mobile card variants, modal bottom-sheet variant, incoming/outgoing message bubbles.
- Token/component ownership: Continue using `frontend/src/theme.ts` tokens and repo-local helpers.

## Accessibility
- Target standard: Practical WCAG AA direction for contrast, readable type, keyboard focus, and touch targets.
- Keyboard/focus behavior: Buttons remain semantic; navigation and modal actions remain reachable.
- Contrast/readability: Preserve theme token contrast and avoid tiny mobile-only text for primary data.
- Screen-reader semantics: Preserve headings, buttons, labels, and form controls.
- Reduced motion and sensory considerations: Existing animations are brief and nonessential.

## Responsive behavior
- Supported breakpoints/devices: Phone at `< 760px`, tablet/desktop above.
- Layout adaptations: Sidebar becomes bottom navigation, header wraps and hides while mobile content is scrolled down, content padding shrinks, detail grids become single column, data tables become labeled cards, dense dashboard preview rows stack metadata instead of forcing multi-column rows, and Bot Messages render as readable scrollable chat bubbles with filters above the thread.
- Touch/hover differences: Mobile uses larger minimum button/input heights; hover behavior remains harmless.

## Interaction states
- Loading: Existing centered loading states.
- Empty: Existing empty text stays in list/card containers.
- Error: Existing toast/error flows from store.
- Success: Existing toast flows.
- Disabled: Existing disabled buttons and low-opacity states.
- Offline/slow network, if applicable: Not explicitly implemented in current UI.

## Content voice
- Tone: Direct Indonesian admin language with concise operational labels.
- Terminology: Use existing terms: PO, pre-order, batch, stock, order, customer, admin.
- Microcopy rules: Keep action labels short and concrete.

## Implementation constraints
- Framework/styling system: React 18 + Vite, TypeScript, inline styles, no new dependencies.
- Design-token constraints: Use existing theme values; avoid introducing unrelated palettes.
- Performance constraints: Keep responsive logic lightweight with `matchMedia`.
- Compatibility constraints: Maintain existing tests and behavior.
- Test/screenshot expectations: Run frontend build/tests; use manual responsive review if browser tooling is unavailable.

## Open questions
- [ ] Whether a native mobile install/PWA shell is desired later / product owner / affects navigation and offline strategy.
