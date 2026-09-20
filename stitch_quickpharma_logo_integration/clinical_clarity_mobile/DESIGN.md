---
name: Clinical Clarity Mobile
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#424751'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#727782'
  outline-variant: '#c2c6d3'
  surface-tint: '#195faa'
  primary: '#00417c'
  on-primary: '#ffffff'
  primary-container: '#0a58a3'
  on-primary-container: '#b4d0ff'
  inverse-primary: '#a6c8ff'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#72f4e7'
  on-secondary-container: '#006f67'
  tertiary: '#384055'
  on-tertiary: '#ffffff'
  tertiary-container: '#4f576d'
  on-tertiary-container: '#c6cde7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a6c8ff'
  on-primary-fixed: '#001c3b'
  on-primary-fixed-variant: '#004787'
  secondary-fixed: '#75f7ea'
  secondary-fixed-dim: '#55dacd'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  data-metric:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
  data-tabular:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system targets community pharmacists, pharmacy technicians, and healthcare dispensary managers operating in fast-paced retail and dispensary environments. The emotional posture balances clinical rigueur, operational calm, and friction-free speed. When managing drug inventories, dispensing batches, scanning barcodes, and verifying expiry dates, cognitive load must remain minimal.

The visual direction is **Corporate / Modern** infused with **Clean Medical Minimalism**. It blends the structural predictability of Material Design 3 (clear touch targets, adaptive bottom navigation, structured sheets) with the typographic finesse and subtle tactile feedback of iOS Human Interface Guidelines (smooth squircle card radii, non-intrusive blurs, precise hairline dividers). The aesthetic projects reliability, hygiene, and technological intelligence without feeling sterile or overly bureaucratic.

## Colors

The palette is derived directly from clinical identity markers: deep medical cobalt blue anchors system structure and trust, while vibrant health teal provides dynamic feedback and affirmative touchpoints.

### Functional Palette Structure
- **Primary (`#0A58A3`):** Primary navigation, key transactional buttons, active tab states, and clinical identity headers.
- **Secondary (`#1CB5A9`):** Accent highlights, positive metrics, inventory restock confirmations, quick-action floaters, and progress gauges.
- **Surface Canvas (`#F8FAFC` to `#F1F5F9`):** Ultra-light slate background, reducing glare in bright dispensary lighting while keeping high contrast with pure white card containers.
- **Surface Card (`#FFFFFF`):** Pure white container surfaces for modular scanning feeds, batch tables, and receipt panels.
- **Text & Hierarchy:**
  - Primary text: Slate 900 (`#0F172A`) for absolute reading contrast.
  - Secondary text: Slate 500 (`#64748B`) for units, secondary labels, and metadata.
  - Hairline borders: Slate 200 (`#E2E8F0`) with 0.75px–1px structural definition.

### Clinical & Operational Semantics
- **Success (Compliant / En Stock):** Emerald Green (`#059669` fill, `#ECFDF5` container, `#047857` text).
- **Warning (Alerte Péremption / Seuil Bas):** Amber Orange (`#D97706` fill, `#FFFBEB` container, `#B45309` text) for impending expirations (< 90 / 30 days) and low safety thresholds.
- **Danger (Rupture / Périmé / Rejet):** Carmine Red (`#DC2626` fill, `#FEF2F2` container, `#B91C1C` text) for immediate inventory stock-outs, recalled lots, and expired batches.
- **Locked / Premium Feature (Hors Forfait):** Slate Navy (`#334155` fill, `#F1F5F9` background, accompanied by subtle padlock iconography and indigo badges `#4F46E5`).

## Typography

Typographic hierarchy separates expressive navigational cues from data-heavy dispensary ledgers.

- **Plus Jakarta Sans** is reserved for high-impact surfaces: screen headers, module titles, KPI dashboard totals, and major drug names. Its rounded geometric aperture ensures high legibility on high-density OLED and LCD mobile screens.
- **Inter** acts as the clinical utility engine for body copy, batch tracking records, dosage specifications, and tabular values. For stock counts, monetary amounts (EUR/XOF/USD), and expiration dates (DD/MM/YYYY), the font feature setting `tnum` (tabular numbers) and `cv05` are enforced to guarantee vertical decimal alignment across multi-line inventory tables.

## Layout & Spacing

The layout operates on an uncompromising 4px/8px baseline grid optimized for handheld mobile workflows (screen widths 360px to 428px).

### Screen Constraints & Safe Zones
- **Horizontal Screen Margins:** Fixed at `16px` (`margin: 1rem`) on standard smartphones; expands to `24px` on tablet/phablet portrait viewports.
- **Inner Component Padding:** Compact vertical spacing (`space-sm` = 8px or `space-md` = 12px) maximizes information density above the fold, critical when scanning long prescription orders.
- **Touch Ergonomics:** All actionable items (barcode scan toggles, counter increments, POS checkout buttons) observe a strict minimum target size of `48px × 48px` conforming to both Android MD3 and iOS HIG accessibility requirements.
- **Sticky Actions & Bottom Bar:** Primary operations (e.g., "Valider l'ordonnance", "Scanner le lot") sit pinned above the mobile home indicator or bottom navigation bar with an ambient safety clearance (`safe-area-inset-bottom` + `12px`).

## Elevation & Depth

This design system avoids heavy drop shadows, opting instead for **soft clinical layering** that distinguishes stacked physical tasks.

### Depth Hierarchy
1. **Level 0 (App Canvas):** `#F8FAFC` flat surface.
2. **Level 1 (Clinical Cards & Drug Records):** Pure `#FFFFFF` surface backed by a soft, tinted ambient shadow: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(10, 88, 163, 0.03)` with a hairline border `1px solid #E2E8F0`.
3. **Level 2 (Active Cards, Dragged Items, Pinned Headers):** `box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)`.
4. **Level 3 (Modals, Bottom Sheets & Barcode Scanner Viewfinders):** `box-shadow: 0 12px 32px -4px rgba(10, 37, 64, 0.16)`. Accompanied by a semi-transparent slate scrim (`rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`).
5. **Level 4 (Floating Utility Pill / Floating Action Button):** Dual-color bloom using the primary cobalt or secondary teal glow: `box-shadow: 0 6px 20px rgba(28, 181, 169, 0.35)`.

## Shapes

The shape system adopts a friendly, ergonomic curve philosophy (`roundedness: 2`), reflecting the modern pill-like and cross shapes embedded in the official brand logo.

- **Primary Cards & Modals (`rounded-2xl` / 16px–20px):** Dispensary summary cards, patient prescription files, and stock ledger sheets employ generous roundedness to convey safety and modern healthcare appeal.
- **Inputs & Action Buttons (`rounded-xl` / 12px):** Form fields, quantity incrementers, search inputs, and modal triggers use cohesive 12px geometry.
- **Status Chips & Pills (`rounded-full` / 9999px):** All categorical markers (e.g., "Sur ordonnance", "Rupture", "Lot: B402") use full stadium/pill curvature to cleanly differentiate them from editable form elements.

## Components

### Buttons
- **Primary:** Filled in medical cobalt (`#0A58A3`) with white text, 48px height, `rounded-xl`, subtle active scale compression (0.98).
- **Secondary / Action Affirmative:** Filled in teal health (`#1CB5A9`) with white text; used for successful validation, dispensing completions, and barcode scans.
- **Tonal / Outlined:** White background, 1px border Slate 200 (`#E2E8F0`), primary cobalt text (`#0A58A3`).
- **Destructive:** Light carmine tint background (`#FEF2F2`), red text (`#DC2626`), border `#FCA5A5`.

### Chips & Semantic Status Badges
- **Périmé / Rupture:** Badge with carmine background (`#FEF2F2`), border `#FEE2E2`, text `#B91C1C`, prefixed with an exclamation icon.
- **Alerte Expiration (<3 mois):** Amber background (`#FFFBEB`), border `#FDE68A`, text `#B45309`.
- **En Stock / Conforme:** Mint container (`#ECFDF5`), border `#A7F3D0`, text `#047857`.
- **Locked / Hors Forfait:** Slate background (`#F1F5F9`), slate text (`#475569`), accompanied by a closed lock glyph (`Lucide: Lock` or SF Symbol `lock.fill`).

### Lists & Inventory Rows
- Each medicine record consists of a white container (`#FFFFFF`), `12px` vertical padding, `14px` horizontal padding.
- Left column: Drug name (`Plus Jakarta Sans` semi-bold 15px), dosage/form underneath (`Slate 500` 12px).
- Right column: Real-time stock count displayed in tabular figures (`Inter` bold 16px) with an accompanying semantic mini-pill (e.g., "14 boîtes").
- Swipe gestures: Swipe-left to flag expiry, swipe-right to initiate rapid order restock.

### Input Fields & Barcode Triggers
- Standard text and numeric inputs feature a 48px minimum height, `#FFFFFF` fill, `#CBD5E1` border (transitions to `#0A58A3` with a 3px soft outer ring `rgba(10, 88, 163, 0.15)` on focus).
- Universal search bars include a trailing quick-action icon button dedicated to opening the mobile camera scanner viewfinder.

### Cards & KPI Tiles
- Metric tiles (e.g., "Ventes du jour", "Alertes Lots", "Commandes Fournisseurs") feature a clean white card base, top-right accent badge, large metric in Plus Jakarta Sans (`data-metric`), and an ambient status bar along the top edge (2px tall) color-coded to the respective metric status.