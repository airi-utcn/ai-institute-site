# Institutional login setup

The site uses UTCN's Microsoft identity provider (Entra ID) for two separate
things:

1. **Public site reservations** — `/reserve/[id]` and `POST /api/reservations`
   require a signed-in user. The reservation is stored under the verified email
   address from the session; the browser cannot choose a different name or
   email.
2. **Strapi admin** — `/strapi/admin` is protected by the
   [`strapi-plugin-sso`](https://github.com/yasudacloud/strapi-plugin-sso)
   Azure AD provider. Local password login can be disabled.

The public site implements a small OIDC authorization-code flow with PKCE in
`web/src/lib/auth/`. It does not use `next-auth`, so there is no additional
beta dependency.

---

## 1. App registrations to request

Ask the department that manages UTCN Microsoft accounts for **two app
registrations** (or one shared registration if they prefer):

### Web app registration

- Platform: **Web**
- Redirect URI:
  - Production: `https://airi.utcluj.ro/api/auth/callback`
  - Local development: `http://localhost:3000/api/auth/callback`
- Client secret: yes (confidential web app)
- API permissions:
  - `openid`, `profile`, `email`
  - Delegated `User.Read` (for the Graph userinfo endpoint)
- Admin consent: yes

### Strapi admin app registration

- Platform: **Web**
- Redirect URI:
  - Production: `https://airi.utcluj.ro/strapi/strapi-plugin-sso/azuread/callback`
  - Local development: `http://localhost:1337/strapi-plugin-sso/azuread/callback`
- Client secret: yes
- API permissions: same as the web app (`openid`, `profile`, `email`,
  delegated `User.Read`)
- Admin consent: yes

> If the reverse proxy does **not** preserve the `/strapi` prefix, use the
> callback path that reaches Strapi and set
> `AZUREAD_OAUTH_REDIRECT_URI` / `ADMIN_SSO_START_PATH` accordingly.

---

## 2. Environment variables

Copy the new block from [`.env.example`](../.env.example) into your deployment
`.env`.

### Next.js

| Variable | Purpose |
| --- | --- |
| `AUTH_MICROSOFT_TENANT_ID` | Entra ID tenant ID. Preferred setup. |
| `AUTH_OIDC_ISSUER` | Alternative to the tenant ID for an institutional OIDC broker. |
| `AUTH_CLIENT_ID` | Web app registration client ID. |
| `AUTH_CLIENT_SECRET` | Web app client secret. Leave empty only for a public PKCE client. |
| `AUTH_URL` | Public site URL, e.g. `https://airi.utcluj.ro`. |
| `AUTH_REDIRECT_URI` | Exact registered callback, e.g. `https://airi.utcluj.ro/api/auth/callback`. |
| `AUTH_SECRET` | Random 32-byte key used to encrypt session cookies. Generate with `openssl rand -base64 32`. **Do not reuse the OIDC client secret.** |
| `AUTH_SCOPES` | Defaults to `openid profile email`. |
| `AUTH_ALLOWED_EMAIL_DOMAINS` | Comma-separated allowlist, e.g. `utcluj.ro`. Subdomains such as `student.utcluj.ro` match automatically. |
| `AUTH_ALLOWED_GROUP_IDS` | Optional comma-separated Entra group object IDs. |
| `AUTH_PROMPT` | Optional provider prompt, e.g. `select_account`. |
| `AUTH_SESSION_MAX_AGE_HOURS` | Session lifetime, default `12`. |

### Strapi

| Variable | Purpose |
| --- | --- |
| `ADMIN_SSO_ONLY` | `true` blocks local password login and redirects `/admin` to SSO. Defaults to `true` when all `AZUREAD_*` credentials are set. |
| `ADMIN_SSO_START_PATH` | Optional browser path that starts SSO. Default derives from `PUBLIC_STRAPI_URL`: `/strapi/strapi-plugin-sso/azuread`. |
| `ADMIN_SSO_REMEMBER_ME` | Persist the admin session across browser restarts. Default `false`. |
| `ADMIN_SSO_ALLOWED_EMAILS` | Comma-separated admin allowlist, seeded on boot. |
| `ADMIN_SSO_USE_WHITELIST` | Defaults to `true` when `ADMIN_SSO_ALLOWED_EMAILS` is non-empty. |
| `AZUREAD_TENANT_ID` | Entra ID tenant ID. |
| `AZUREAD_OAUTH_CLIENT_ID` | Strapi app registration client ID. |
| `AZUREAD_OAUTH_CLIENT_SECRET` | Strapi app registration secret. |
| `AZUREAD_OAUTH_REDIRECT_URI` | Exact registered callback. |
| `AZUREAD_SCOPE` | Defaults to `openid profile email`. |

All variables are already wired through `compose.yaml`, `compose.prod.yaml`, and
`compose.dev.yaml`.

---

## 3. First-time Strapi setup

Do this **before** enabling `ADMIN_SSO_ONLY` on an existing installation:

1. Start Strapi with `ADMIN_SSO_ONLY=false`.
2. Open `/strapi/admin` and create or keep a local super-admin account.
3. In **Settings → Single Sign-On → Azure AD**, choose the roles that new SSO
   users should receive. Without a role, an auto-created admin cannot do
   anything useful. Set **Azure AD Roles** to at least `Super Admin` for the
   initial account, then tighten it later.
4. Sign in once through the SSO button (`/strapi-plugin-sso/azuread`) to verify
   the app registration, redirect URI, and Graph permissions.
5. Set `ADMIN_SSO_ONLY=true` and restart Strapi.

Strapi automatically creates an admin user the first time a Microsoft account
signs in. `ADMIN_SSO_ALLOWED_EMAILS` limits which accounts may do so.

If SSO is misconfigured and you are locked out, start Strapi with
`ADMIN_SSO_ONLY=false` temporarily, fix the configuration, and re-enable it.

---

## 4. How the public reservation flow works

1. An unauthenticated visitor opens `/reserve/[id]`.
2. `requireUser()` redirects to `/login?returnTo=/reserve/[id]`.
3. The user clicks **Continue with Microsoft**.
4. `/api/auth/login` creates a PKCE verifier, state, and nonce, seals them in an
   encrypted, `HttpOnly` transaction cookie, and redirects to Entra ID.
5. Entra ID redirects back to `/api/auth/callback`.
6. The callback verifies `state`, exchanges the code, verifies the ID token
   signature/issuer/audience/nonce against the provider JWKS, checks the email
   domain and optional groups, and issues an encrypted `airi_session` cookie.
7. `POST /api/reservations` reads the session, verifies the Snipe-IT asset,
   checks for overlaps, and stores the reservation with the session's email,
   name, and Microsoft object ID.

`GET /api/reservations` now requires a session and returns only the signed-in
user's reservations.

The access token and ID token are never stored in the browser.

---

## 5. Verification checklist

- [ ] `https://airi.utcluj.ro/api/auth/callback` is registered on the web app.
- [ ] `https://airi.utcluj.ro/strapi/strapi-plugin-sso/azuread/callback` is
      registered on the Strapi app.
- [ ] Admin consent has been granted for both registrations.
- [ ] `AUTH_SECRET` is a unique random value, not a client secret.
- [ ] `AUTH_URL` and `AUTH_REDIRECT_URI` use the public HTTPS origin.
- [ ] Signing in with a normal UTCN account opens the reservation page.
- [ ] Signing in with a non-allowed personal account is rejected.
- [ ] A reservation created in the browser shows the signed-in email in Strapi.
- [ ] Visiting `/strapi/admin` in a private window redirects to Microsoft.
- [ ] `POST /admin/login` is rejected while `ADMIN_SSO_ONLY=true`.

---

## 6. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `error=config` after clicking sign in | Missing `AUTH_*` variables, or discovery metadata is unreachable. |
| `error=state` | The 10-minute transaction cookie expired, or the callback URL/origin changed. Start again. |
| `error=domain` | The account has no email claim, or its domain is not in `AUTH_ALLOWED_EMAIL_DOMAINS`. |
| `error=group` | The `groups` claim is missing (group overage) or the user is not in `AUTH_ALLOWED_GROUP_IDS`. |
| Strapi shows "Email address is not set" | The app registration does not expose `email`; ensure `openid profile email` and `User.Read` are consented. |
| Strapi SSO redirects to the wrong host/path | Check `PUBLIC_STRAPI_URL`, the reverse-proxy prefix, and `ADMIN_SSO_START_PATH`. |
| Admin locked out | Restart with `ADMIN_SSO_ONLY=false`, fix SSO, then re-enable. |
