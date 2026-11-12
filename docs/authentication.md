# Institutional login for equipment reservations

The public site uses an institutional OIDC provider to protect equipment
reservations. The equipment catalog itself stays public; signing in is required
only when a user opens the reservation form or submits a reservation.

The frontend works with **Microsoft Entra ID** or **Keycloak** (or any other
standard OIDC provider). The only difference is configuration.

Strapi admin is intentionally **not** part of this flow. It keeps local admin
accounts and should be protected at the network layer (VPN, IP allowlist, or a
zero-trust proxy).

---

## 1. Microsoft Entra ID

Ask the department that manages UTCN Microsoft accounts for **one web app
registration**:

- Platform: **Web**
- Redirect URI:
  - Production: `https://airi.utcluj.ro/api/auth/callback`
  - Local development: `http://localhost:3000/api/auth/callback`
- API permissions: `openid`, `profile`, `email`, delegated `User.Read`
- Grant admin consent
- Single-tenant only (no personal Microsoft accounts)

The site uses the authorization-code flow with PKCE. It verifies the ID token
signature, issuer, audience, and nonce against the provider's JWKS.

---

## 2. Keycloak

Create a realm, for example `utcn`, and a client for the website.

### Client settings

- **Client ID:** `airi-web`
- **Client authentication:** On (confidential) if you want a client secret.
  Off is also supported for a public PKCE-only client.
- **Standard flow:** Enabled
- **Direct access grants:** Disabled
- **Valid redirect URIs:**
  - `https://airi.utcluj.ro/api/auth/callback`
  - `http://localhost:3000/api/auth/callback`
- **Web origins:**
  - `https://airi.utcluj.ro`
  - `http://localhost:3000`
- **Client scopes:** `openid`, `profile`, `email`
- **PKCE:** the app always sends `code_challenge_method=S256`; no special
  setting is required in recent Keycloak versions, but you can set the client's
  advanced PKCE method to `S256`.

### Groups / roles claim

If you want to restrict access by group:

1. Open the client scopes assigned to `airi-web` (usually `profile` or a
   dedicated `groups` scope).
2. Add a **Group Membership** mapper.
3. Set the token claim name to `groups`.
4. Enable **Add to ID token** and **Add to userinfo**.
5. Decide whether to emit the full group path. Keycloak's default is a path
   such as `/airi/staff`. The site strips the leading slash when matching, so
   `AUTH_ALLOWED_GROUPS=/airi/staff` and `AUTH_ALLOWED_GROUPS=airi/staff` are
   equivalent.

If you use realm roles instead of groups, add a **User Realm Role** mapper with
the token claim name `groups` and multivalued enabled.

### Keycloak brokering Entra ID

If Keycloak sits in front of Entra ID:

- Add an OpenID Connect identity provider in Keycloak pointing at Entra.
- Make sure the `email`, `given_name`, `family_name`, and `name` mappers are
  enabled.
- The website only talks to Keycloak, so `AUTH_OIDC_ISSUER` is the Keycloak
  realm URL, not the Entra issuer.
- Keycloak's `sub` becomes the stable `userObjectId`. Existing reservations are
  still found by email, so the change does not break the reservation list.

### Skipping the Keycloak login form

By default Keycloak shows its own username/password form with a list of
identity providers. To send users straight to the Entra ID broker, set the
Keycloak identity-provider alias:

```bash
AUTH_OIDC_IDP_HINT=UTAzure
```

The value is the **Alias** on the Keycloak identity provider (for example
`UTAzure`), not its display name. The app forwards it as `kc_idp_hint` on the
authorization request. Leave it empty to keep the normal Keycloak login page.

### Keycloak logout

The app clears its own encrypted session cookie on sign-out. It does not call
Keycloak's `end_session_endpoint`, so the Keycloak SSO session can remain alive
until it expires or the user signs out of Keycloak. RP-initiated logout can be
added later if needed.

---

## 3. Environment variables

Set these on the Next.js service.

### Entra ID

```bash
AUTH_MICROSOFT_TENANT_ID=<tenant-id>
# AUTH_OIDC_ISSUER is not needed for Entra when the tenant ID is set.

AUTH_CLIENT_ID=<client-id>
AUTH_CLIENT_SECRET=<client-secret>
AUTH_TOKEN_AUTH_METHOD=client_secret_post

AUTH_URL=https://airi.utcluj.ro
AUTH_REDIRECT_URI=https://airi.utcluj.ro/api/auth/callback
AUTH_SECRET=<random-secret>
```

### Keycloak

```bash
AUTH_OIDC_ISSUER=https://sso.example.com/realms/utcn
AUTH_CLIENT_ID=airi-web
AUTH_CLIENT_SECRET=<keycloak-client-secret>
# Keycloak's default client authenticator accepts both; use basic if your
# client is configured for Client Secret Basic only.
AUTH_TOKEN_AUTH_METHOD=client_secret_basic

AUTH_URL=https://airi.utcluj.ro
AUTH_REDIRECT_URI=https://airi.utcluj.ro/api/auth/callback
AUTH_SECRET=<random-secret>

AUTH_PROVIDER_NAME=Keycloak
AUTH_PROVIDER_LABEL=Continue with Keycloak
# Optional: skip the Keycloak login form and go straight to the Entra broker.
# The value is the identity-provider alias from the Keycloak admin console.
AUTH_OIDC_IDP_HINT=UTAzure
```

### Shared

```bash
AUTH_SCOPES="openid profile email"
AUTH_ALLOWED_EMAIL_DOMAINS=utcluj.ro
# Optional. For Keycloak, paths such as /airi/staff are accepted.
AUTH_ALLOWED_GROUPS=
AUTH_SESSION_MAX_AGE_HOURS=12
```

`AUTH_CLIENT_SECRET` is optional for a public PKCE-only client. If it is empty,
the token request is sent without a client secret.

`AUTH_PROVIDER_NAME` and `AUTH_PROVIDER_LABEL` only change the login page text
and button. They do not affect the OIDC flow.

---

## 4. What is protected

| Route | Access |
|---|---|
| `/equipment` | Public catalog |
| `/api/equipment` | Public catalog data |
| `/api/equipment/[id]` | Public, numeric ID only |
| `/reserve/[id]` | Login required |
| `POST /api/reservations` | Login required |
| `GET /api/reservations` | Login required; returns only the caller's rows |

The reservation email, first name, last name, and stable subject ID are taken
from the encrypted session cookie. The browser cannot supply a different email.

---

## 5. Reservation emails

Strapi currently sends the **request received** email, immediately after the
reservation is created. It uses the SMTP settings in
`server/config/plugins.ts` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
`SMTP_PASSWORD`, `SMTP_DEFAULT_FROM`). The email identifies the asset by its
Snipe-IT tag, name, model, serial, and location.

The acceptance/decision email is intentionally not part of this branch. It is
preserved on `feat/reservation-acceptance-email` so the reservation workflow
and notification rules can be reviewed on their own.

The `checked_out` status still triggers the Snipe-IT checkout, and `returned`
triggers the check-in. Snipe-IT keeps its own mail settings for account and
admin mail, but it must not send reservation email. To avoid duplicates, leave
the checkout notification disabled on each equipment **Category** in Snipe-IT.

---

## 6. Strapi admin

The Strapi admin uses local accounts. It is not part of the OIDC flow.

Recommended additional protection:

- Restrict `/strapi/admin` at nginx with a VPN or IP allowlist.
- Keep one break-glass Super Admin account with a strong password.
- Do not expose `/strapi/api/*` publicly; the Next.js server uses the internal
  Docker URL (`STRAPI_INTERNAL_URL`).

---

## 7. Testing checklist

1. Sign out and open `/reserve/<id>`: you should be redirected to `/login`.
2. Sign in and confirm the reservation form shows your authenticated email (it
   is not editable).
3. Submit a reservation and confirm:
   - the reservation appears in Strapi with `userEmail` equal to the signed-in
     account;
   - the “request received” email arrives.
4. In Strapi, change the status to `checked_out` and confirm:
   - Snipe-IT checks out the asset to that user;
   - no duplicate Snipe-IT checkout email arrives.
5. Save the same `checked_out` status again and confirm Snipe-IT is not called
   a second time.
6. Change the status to `returned` and confirm the asset is checked in.
7. Try `POST /api/reservations` without a session: expect `401`.
8. Try `POST /api/reservations` with a different `userEmail` in the body:
   the body value must be ignored.
9. Try `/api/equipment/abc` and `/api/equipment/..%2Fusers%2F1`: expect `404`.
10. Submit a reservation with a start date in the past: expect `400`.
11. Submit a reservation longer than 365 days: expect `400`.
12. Submit a second reservation that overlaps an active one: expect `409`.
13. Confirm the Strapi reservation stores `assetTag`, `assetModel`,
    `assetSerial`, `assetLocation`, `assetImageUrl`, and `assetUrl`.
14. In Strapi, edit a reservation so it overlaps another active reservation:
    the save must be rejected.
15. In Strapi, create a reservation with `checked_out` as the initial status:
    the save must be rejected. Create it as `pending` first.

### Keycloak-specific checks

- Discovery works: open
  `https://sso.example.com/realms/utcn/.well-known/openid-configuration` and
  confirm `issuer` matches `AUTH_OIDC_ISSUER` exactly.
- The ID token or userinfo response contains `email`.
- If you use groups, the token/userinfo contains a `groups` array. The site
  accepts values with or without the leading slash.
- If the provider returns `error=invalid_client`, check
  `AUTH_TOKEN_AUTH_METHOD` against the Keycloak client authenticator.
