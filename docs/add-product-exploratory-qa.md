# Add Product exploratory QA

Tested against local branch `product_feature`, based on `4e522f6`.

## Scope and limits

Automated React Native form interactions, real product payload construction, and mocked network/camera/photo boundaries. The browser connection failed during setup; no live backend product was created. Native camera decoding, native date picker presentation, keyboard layout, device permissions, accessibility, and actual backend persistence still need device/manual verification. This is a risk-based scenario matrix, not proof of every possible input or interaction.

Production code was not changed during this audit. New tests reproduce and document existing gaps explicitly; passing a `GAP` test means the unsafe behavior was reproduced, not that the input is acceptable.

## Confirmed findings

| Priority | Finding | Reproduction and observed result |
| --- | --- | --- |
| High | Numeric fields lack client validation | Fill required name, SKU and status; select a supplier; enter negative cost, nonnumeric/blank/overflow cost, negative/nonnumeric quantity, negative minimum stock, negative tax, discount 150, or nonnumeric margin. Save reaches the API with those strings. Bad cost/margin can also display a misleading zero selling price. Backend acceptance was not tested. |
| Medium | A late photo result restores a discarded attachment | Open the library picker; leave the product screen; let the pending picker return a photo. That photo is added after the exit reset, so a retained screen can show a supposedly discarded attachment on return. |
| Business-rule review | Expiry has no date checks | Leave expiry enabled with a blank date, or choose 2020-01-01. Save reaches the API with `hasExpiration=1`; a blank date is omitted and a past date is sent unchanged. Decide whether expiry is mandatory and whether intentionally recording expired stock is permitted before changing the rule. |

Suggested next work: validate finite numbers and appropriate numeric ranges before submitting; prevent stale photo results from updating a departed form; define and enforce the expiry policy. Fractional quantity needs confirmation if the business supports selling partial units.

## Covered working paths

- Complete product entry: category, supplier, cost, tax, tax included, margin, computed selling price, discount, initial quantity, minimum stock, availability, expiry, medical fields, prescription flag, active flag, two photos, and profile attribution. Multipart values and success reset verified.
- Required name/SKU (including whitespace), explicit availability, supplier required for positive initial stock.
- Minimal inactive/out-of-stock product with no optional details and expiry disabled.
- Arabic, accents, multiline description, alphanumeric SKU, leading zeroes, and outer whitespace trimming.
- Dot/comma decimal prices, zero cost, calculated margin, and turning expiry off after entering a date.
- Network, server, duplicate-SKU validation, and malformed-success responses: errors retain the draft; retries can succeed; selected photos survive a failed save.
- Scanner fills SKU and closes; manual correction; cancel preserves existing SKU; duplicate/empty detections; blocked permission settings; permission/startup errors; background state; fresh scan lock on reopening.
- Photo picker cancellation, photo camera permission denial, picker exception, exactly 5 MB accepted, over 5 MB rejected, mixed acceptable/oversized selection, deduplication across selections, and photo removal.
- Exit resets draft values/photos/errors/dialogs; edit-mode fields are preserved.
- Existing product API serialization and response-validation coverage.

## Commands

```text
npm.cmd test -- --runInBand --testTimeout=30000 tests/AddProductScreen.test.tsx tests/ProductBarcodeScanner.test.tsx tests/productsApi.test.ts
npm.cmd run typecheck
npx.cmd eslint tests/AddProductScreen.test.tsx tests/ProductBarcodeScanner.test.tsx
```

The matrix contains 56 automated checks: 40 form checks, 9 scanner checks, and 7 API checks. Fourteen form checks explicitly reproduce the findings above. They do not certify the form as bug-free.

## Remaining manual checks

- Actual barcode scans on supported Android and iOS devices, including denied/revoked permission and app resume.
- Live duplicate SKU, authorization failures, backend numeric/date rules, uploaded photo persistence, and reading the saved product back.
- Rapid repeated Save taps with the real mutation lifecycle; navigation while a save is in flight.
- Small-screen keyboard/scroll behavior, native date selection, RTL layout, and screen-reader navigation.
- Category/supplier loading failures and long/paginated lists; adding a category during an in-progress product draft.
