# Responsive layout audit

Date: 2026-10-16 (Africa/Casablanca).

## Verdict

The code contains responsive foundations, but the app cannot currently be certified as responsive on all devices. This audit found concrete constraints needing remediation and identified visual risks that require device verification. No production layout was changed in this audit.

## What was checked

Reviewed shared Screen, Card, TextField, Button, ResponsiveGrid/ResponsiveList, selection/confirmation/alert dialogs, bottom sheets, navigation/PageLayers, and layout styles in authentication, onboarding, dashboard, profile, notifications, subscriptions, product entry, catalogue/inventory, CRM, and sales/receipts. Source review is not an end-to-end visual test of every screen.

Executed 12 focused tests of the real shared grid: measured container widths corresponding to 320, 360, 390, 414, 600, 768, 820, 1024, 1280, and 1440 logical pixels; shrinking a tablet container into a narrow split-screen pane; and limiting desktop columns. All passed. These verify sizing arithmetic and React updates, not native text measurement, Yoga layout, screenshots, or touch ergonomics. ResponsiveList and feature-specific tablet layouts were reviewed in code but were not visually exercised by these tests.

## Findings

| Priority | Area | Evidence and implication | Suggested change |
| --- | --- | --- | --- |
| High | Onboarding: short landscape screens / large text | `src/features/onboarding/OnboardingScreen.tsx:39` disables scrolling. The center contains a fixed 160 px illustration plus title/body, with top and bottom controls. Content has no scroll escape when its combined height exceeds available height. | Permit vertical scrolling or adapt the illustration and spacing to available height while retaining reachable actions. |
| High | Confirmation dialogs | `src/components/ui/ConfirmDialog.tsx:34` renders title, message, and two actions in an unbounded card. There is no ScrollView or maximum height. Large text or a long translated message can exceed a short viewport. | Bound the card height and scroll the content; stack actions on narrow screens or at large font scales. |
| Medium | Add Product on narrow phones | `src/features/stores/screens/AddProductScreen.tsx:1053` keeps status/currency in an unwrapped row. At line 1094, paired fields always remain side by side; actions at line 1201 do too. At 320 px the card's paired fields have roughly 123 px each before input padding. Long supplier names are explicitly one line. | Reflow fields, status text, and actions based on available container width and font scale. |
| Medium | Shared action labels | `src/components/ui/Button.tsx:87` forces one line. Narrow paired actions, translations, and large fonts can truncate or overflow the visible label; actual severity needs font measurement. Accessibility labels retain the full label. | Allow wrapping/minimum height growth and ensure text can shrink inside the row without overflowing. |
| Medium | CRM dashboard small cards | `src/features/dashboard/components/CrmDashboard.tsx:422` uses wrapping rows with 48% card widths. It has no font-scale-aware single-column option, so metric cards can remain cramped even as text grows. | Switch to a container-aware grid that also considers font scale. |
| Medium | RTL consistency | Native RTL switching exists in `src/i18n/rtl.ts`, but TextField still uses physical `marginLeft` and `marginRight` at lines 79 and 103. Several CRM/stock/sales back arrows omit the shared icon's RTL flipping option. | Use start/end spacing and consistently mirror directional controls. Verify Arabic layouts visually after reload. |
| Verify | Keyboard and landscape safe areas | Screen/CrmPage avoid the keyboard explicitly on iOS only; Android depends on window behavior. Some routes request only top safe-area protection. The app shell does reserve bottom navigation space, so bottom overlap must not be assumed from a child screen alone. | Test Android resize behavior, short landscape, cutouts, bottom gestures, and keyboard-visible actions on real/emulated devices. |

The first two findings follow directly from absent scrolling/height bounds. Other rows identify source-level constraints and likely pressure points; they are not screenshot-confirmed clipping defects.

## Existing strengths

- Screen scrolls by default, fills available space, centers most content, and caps common reading/form width at 560 px.
- ResponsiveGrid measures its actual container and reflows when that measurement changes; ResponsiveList adjusts its column count and keeps long lists virtualized.
- Catalogue has tablet master/detail behavior from 768 px; inventory also checks window width.
- Auth forms are scrollable, with keyboard avoidance and wrapping sign-up links.
- Profile, notifications, and subscription flows use shared scrolling containers; the plan comparison table supports horizontal scrolling.
- Shared selection dialogs cap width/height and scroll their body; the new AlertDialog also bounds height and scrolls its message.
- Bottom navigation accounts for bottom safe-area insets and PageLayers reserves its layout space.
- Receipt preview uses a 320 px target with `maxWidth: '100%'`. Off-screen export's fixed 320 px canvas is intentional and was not counted as a viewport defect.
- Font scaling is not globally disabled in AppText, so layout needs to accommodate it rather than hide it.

## Device matrix still required

| Surface | Representative logical viewport | Checks |
| --- | --- | --- |
| Small phone | 320 x 568, 360 x 640 | Forms, action labels, status rows, charts, navigation |
| Standard/large phone | 390 x 844, 430 x 932 | Safe areas, scroll reachability, long data |
| Landscape phone | 568 x 320, 844 x 390 | Onboarding, dialogs, keyboard, cutouts |
| Tablet | 768 x 1024, 820 x 1180, 1024 x 768 | Catalogue detail panes, forms, list density |
| Desktop / large tablet | 1280 x 800, 1440 x 900 | Max widths, grids, long dialogs |
| Split screen | Resize from tablet to 360 px pane | Reflow, retained data, independent scroll panes |

Repeat relevant cases with 100%, 150%, and 200% text; French, English, Spanish, Arabic/RTL; keyboard open; long names/prices/messages; empty/loading/error states. These are requested verification targets, not completed screenshot tests.

The browser runtime has repeatedly failed to start with the Windows `helper_sandbox_lock_failed` error in this session. No device farm or simulator control is connected. A working browser/device session is needed to complete visual certification.

## Automated verification

```text
npm.cmd test -- --runInBand --testTimeout=30000 tests/responsiveLayout.test.tsx
npm.cmd run typecheck
npx.cmd eslint tests/responsiveLayout.test.tsx
```
