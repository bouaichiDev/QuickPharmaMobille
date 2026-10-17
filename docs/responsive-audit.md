# Responsive changes with the default phone layout preserved

Date: 2026-10-16 (Africa/Casablanca).
Branch: `fix/responsive-layout`.
Baseline: checkpoint `5449a2f`.

## Constraint

Keep the existing Galaxy A70-style portrait design as the default. No specific physical-device viewport was measured, so the protected baseline covers common portrait widths of 360, 384, 393, 412, and 430 logical pixels at standard text size. The 412x915 test viewport is representative, not a claim about the connected phone's actual display settings.

The original spacing, button heights, field arrangement, dialog padding, card widths, onboarding illustration, typography, and native app configuration remain the default. Alternate styles are conditional rather than replacements for the baseline styles.

## Adaptation rules

`src/components/ui/useResponsiveLayout.ts` centralizes the conditions:

- Width below 360 logical pixels: compact layout.
- Window at least 500 pixels wide and below 500 pixels high: short/landscape layout. Requiring the width avoids switching a normal portrait phone just because its keyboard reduces usable height.
- Text scale above 1.2: enlarged-text layout.
- Landscape windows gain side-safe-area edges. Portrait safe-area edges are preserved.

Grid column calculations remain identical through 120% text scale; above that they reserve more width per card. Existing tablet breakpoints remain in place. Normal text on a large screen does not receive a wholesale redesign.

## Implemented conditional behavior

- Add Product stacks paired fields, barcode/scan controls, and actions only under the conditions above. Stacked fields have natural height/full width. Status text and category/supplier names can wrap, and the photo-add tile can grow vertically.
- Shared buttons allow multiline labels and vertical growth only in the alternate layout.
- Onboarding scrolls only in the alternate layout; its existing normal portrait arrangement remains intact.
- Confirmation dialogs retain their existing default card/padding/action row. Alternate layouts cap height, scroll all content/actions, and stack actions. A default-sized dialog also gets a scroll escape if actual measured content exceeds the window height.
- Alerts retain their original default footer placement. The action moves inside the scrollable area only in the alternate layout.
- CRM dashboard cards switch to full width on very narrow screens or with enlarged text. CRM detail fields and sales/credit payment choices use full width when reflow is needed.
- Navigation labels and the CRM revenue goal row can wrap in alternate layouts.
- Screen and CRM page overlays add side-safe-area edges only in landscape.

## Automated baseline protection

`tests/responsiveBaseline.test.tsx` verifies:

- Default button height (48), single-line labels, dialog padding (24), gap (12), maximum width (420), paired actions, and absence of a new scroll wrapper at 360, 384, 393, 412, and 430 px portrait.
- Original non-scrolling onboarding and its 160x160 illustration at a representative 412x915 viewport.
- Original portrait safe-area edges and alert footer placement, restored after rotating back.
- Keyboard-reduced portrait height does not activate reflow.
- Short landscape, 320 px compact, 200% text, measured dialog overflow, and slide retention during rotation.

`tests/AddProductScreen.test.tsx` checks default paired field rows/save-button proportions at 360, 393, 412, and 430 px, alternate layouts at 320 px/200% text, and draft preservation during resizing.

`tests/responsiveLayout.test.tsx` checks shared grids at 320–1440 px, unchanged standard text-scale columns, enlarged text, container resizing, and column limits.

```text
npm.cmd test -- --runInBand --testTimeout=30000 --silent
npm.cmd run typecheck
npm.cmd run lint
```

## Verification limits

These tests check component styles, sizing calculations, actions, and retained state. They do not perform native layout or screenshot comparisons. They protect the specified default styles but do not establish pixel-for-pixel equivalence on a physical Galaxy A70.

The browser runtime failed repeatedly with Windows `helper_sandbox_lock_failed` earlier in this session, so real-device/browser visual verification is still required. Verify the default A70 portrait view first, then 320 px, landscape, tablet, split-screen, 150%/200% text, long messages, keyboard-visible fields, and Arabic/RTL.

The earlier app-wide audit also identified RTL-spacing consistency, chart-label readability, and Android keyboard configuration for further device-specific review. This iteration does not reapply the discarded global style/native configuration changes. Existing product numeric/date/photo lifecycle `GAP` tests document separate issues and are unrelated to these responsive changes.
