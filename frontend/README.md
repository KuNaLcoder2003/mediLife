# MedLife frontend

Storefront, sign-in screens and admin panel for MedLife (React 19 + Vite + TypeScript).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

Settings live in `src/lib/config.ts` (API URL, WebSocket URL, currency, store name). The URLs can be overridden with a `.env` file — see `.env.example`.

## Routes

| Path | Screen |
| --- | --- |
| `/` | Store home |
| `/products`, `/products/:id` | Product list and product page |
| `/checkout`, `/success` | Checkout (signed in) and order placed |
| `/account`, `/account/orders/:id` | Profile, addresses, orders, order detail with cancel + PDF invoice (signed in) |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` | Sign-in screens |
| `/auth/callback` | Where Google sign-in returns |
| `/admin/*` | Admin: dashboard, products (add/edit/delete/images/detail), orders, customers, reports |

## Structure

- `src/lib/http.ts` – the one request helper: bearer token, refresh on 401/403, `valid:false` handling
- `src/lib/api.ts` – every API call (auth, products, admin products, users, customers, orders)
- `src/lib/types.ts` – shared types
- `src/auth/` – session (AuthProvider), `ProtectedRoute`, `PublicOnlyRoute`, Google sign-in helper
- `src/cart/` – bag, saved in localStorage
- `src/components/store/RealtimeProvider.tsx` – WebSocket for payment links / stock problems at checkout
- `src/styles/` – `global.css` (design tokens), `auth.css`, `admin.css`, `store.css` (ends with the MedLife design layer)

## Waiting on the backend

- **Admin auth**: `/admin` is open. When admin auth is ready, wrap `<AdminLayout />` in `<ProtectedRoute roles={["COMPANY"]}>` in `src/App.tsx`.
- **Admin orders**: `adminOrderApi.list()` returns `[]` until there's an admin orders endpoint, so admin Orders, Customers stats and Reports show empty states.
- **Reset password**: the screen exists but there's no API call for it yet.
- **Logout / profile update** need `POST /auth/logout` and `PATCH /users/me` on the server (sign-out still clears the local session if logout is missing).
