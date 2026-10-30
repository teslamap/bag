# BAG

MAKU storefront, customer account, admin console and manager workspace. The original visual design and frontend workflows are preserved.

## Run

```sh
npm ci
npm run dev
```

## Check

```sh
npm run build
npm test
```

## Data and backend

Starts with **no products, categories, users, orders, reviews, promotions, notifications or audit history**. No demo credentials are bundled. Existing MAKU browser storage is isolated through BAG-specific storage keys. Registration creates a local customer; staff authentication will be connected to the real backend later. Admin and manager pages remain in the frontend, protected by the existing role checks.

`src/backend/types.ts` defines the CommerceBackend contract. `src/backend/index.ts` currently selects the local browser adapter. Firebase server code and deployment settings are not included. This is a frontend preview, not a production commerce backend.

## Images

Only images used for the site's hero, editorial, collection and information sections are included. No product catalogue or product-gallery assets are bundled. Design experiments, raw/source photography, QA screenshots, generated builds, Android builds and dependency folders are excluded.
