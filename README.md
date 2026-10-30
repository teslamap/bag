# MAKU V2 / BAG

The new MAKU interface connects to the existing **makasia Firebase project**. Original MAKU and V2 share products, customers, orders, promotions and reviews. This release does not modify the original repository, deploy rules, migrate data or seed any records.

## Run and check

```sh
npm ci
npm run dev
npm run build
npm test
```

Firebase is the default. Set `VITE_BACKEND_MODE=demo` for an isolated, empty local preview. Connection errors never silently become local orders.

## Compatibility contract

- All money is **GEL/lari**, rounded to two decimal places. `150` means 150 GEL in forms, storage, filters, CSV reports and structured data.
- Products preserve `price`, `oldPrice`, `category`, `image`, `image2`, `stock`, `status` and timestamps. Extra V2 fields are additive `bagV2` metadata. Old MAKU edits to the top-level fields take precedence. Document IDs are stable product URLs.
- Legacy products have one default variant. If old MAKU changes combined stock on a multi-variant product, V2 disables its variants until staff reconcile them, avoiding stale stock sales.
- Orders preserve `customerName`, `phone`, string `address`, `orderNumber`, `totalAmount`, `totalPrice`, `subtotal`, `discount`, `deliveryFee`, Georgian status, legacy item name/price and Firestore createdAt. V2 details live in additive metadata.
- Promotions use the existing `promos` collection and write both storefront aliases (`type`, `value`, `min`, `startAt`, `endAt`, `active`) and admin aliases (`discountPercent`, `startDate`, `endDate`, `status`).
- Customer registration never writes role/isAdmin/permissions. Only the original owner UID is treated as administrator. Existing manager roles are supported; manager status updates write only status, matching the unchanged rules.
- Customer addresses and favorites use their own users document. Owner-only notes live in `bag_order_notes`, not customer-readable order documents. Audit uses `admin_audit`.
- Categories are derived from existing products for visitors. Owner-managed category definitions use `categories`, allowed by the old owner fallback rule; saved products embed their category metadata for public browsing.
- Notifications are derived from visible order states; read receipts live on the user's own profile.

## Existing backend limits

This release integrates the existing backend; it does not introduce a trusted checkout server.

1. The old rules permit customer order writes without server verification of prices or atomic stock deduction. V2 re-reads prices and stock, keeps a stable order ID for retries, and retains staff-managed inventory. Tamper-proof prices, concurrent stock reservations and global promo usage limits require a coordinated server/rules upgrade across both sites.
2. Old MAKU hardcodes courier delivery at **5 GEL**, free from **100 GEL**. V2 defaults match. Old MAKU does not consume V2 settings dynamically, and public app_settings reads are denied by the repository rules. Saved owner settings are not shared public configuration; shipping policy changes require a coordinated update.
3. Disabling accounts and changing another user's password/email require Firebase Authentication administration. Unsupported operations fail explicitly. The backend has one primary owner; new staff are managers. Creating a manager uses a temporary, memory-only secondary Auth instance, preserving the owner's session.
4. Image upload uses size-limited compressed inline images, compatible with the old image fields; external URLs are also supported. Cloud Storage uploads need a configured bucket/rules workflow.
5. Production reset is disabled. Local preview uses V2/GEL-specific storage keys, isolating old tetri state.

No service-account credentials are included. The public Firebase web configuration comes from original MAKU. Existing Firebase authorization/rules remain authoritative.

## Validation

Tests cover GEL arithmetic, legacy field mappings, owner identity, manager payloads, read-only initialization, deterministic checkout retries and production-reset protection. SDK contract tests use mocks and never create live accounts or orders. The public catalogue was also checked through a read-only Firestore REST request. Authenticated flows require staging/manual testing with authorized accounts before a public launch.

Only required site images are bundled. Product images come from the backend. Demo product records, raw photography and design experiments are excluded.
