# Request for UTCN Microsoft / Entra ID access

Short list to send to the department that manages UTCN Microsoft accounts.
Fill in the staging origin if it differs from production.

---

Hello,

We are adding institutional Microsoft login to the equipment reservation form
on the AIRi website (`https://airi.utcluj.ro`). The public equipment catalog
will remain public; only submitting a reservation requires a UTCN account.

Could you please provide or confirm the following?

1. **Tenant / issuer details**
   - Our Entra ID tenant ID (or the OIDC issuer URL if UTCN uses a broker).

2. **One web app registration**
   - Client ID and client secret, the secret expiry date, and the process for
     rotating the secret.
   - Platform: **Web**.

3. **Redirect URIs to register**
   - `https://airi.utcluj.ro/api/auth/callback`
   - Development: `http://localhost:3000/api/auth/callback`

4. **Permissions and consent**
   - `openid`, `profile`, `email`, delegated `User.Read`.
   - Confirmation that admin consent will be granted.

5. **Token configuration**
   - Confirm that the `email` claim is present.
   - If you plan to restrict access by group, provide the **group object IDs**
     and confirm that the groups claim is emitted as “Groups assigned to the
     application” (not “All groups”), to avoid the 200-group overage limit.

6. **Scope**
   - Confirm the registration is single-tenant (no personal Microsoft
     accounts).
   - Confirm whether guest/external accounts may sign in.

7. **Testing**
   - It would help to have a test registration or test tenant so we can verify
     the claims before production.

8. **Operational contact**
   - Who manages group membership, and who should we contact when the client
     secret needs rotation?

## If UTCN provides Keycloak instead of Entra ID

We need the equivalent details:

- Realm name and public issuer URL
  (for example `https://sso.utcluj.ro/realms/utcn`)
- Client ID and client secret for the website
- Redirect URIs:
  - `https://airi.utcluj.ro/api/auth/callback`
  - `http://localhost:3000/api/auth/callback`
- Confirmation that the `email`, `profile`, and `openid` scopes are available
- If access is group-restricted: the group names/paths (for example
  `/airi/staff`) and confirmation that the client emits a `groups` claim
- Confirmation that the client uses the standard authorization-code flow with
  PKCE

Thank you.
