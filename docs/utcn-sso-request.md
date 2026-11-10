# Request for UTCN Microsoft / Entra ID access

Short list to send to the department that manages UTCN Microsoft accounts.
Fill in the staging origin if it differs from production.

---

Hello,

We are adding institutional Microsoft login to the AIRi website
(`https://airi.utcluj.ro`) and to its Strapi admin panel. Could you please
provide or confirm the following?

1. **Tenant / issuer details**
   - Our Entra ID tenant ID (or the OIDC issuer URL if UTCN uses a broker).

2. **Two app registrations**
   - One for the public website and one for Strapi, each with a client ID,
     client secret, secret expiry date, and the process for rotating the secret.
   - If you prefer a single shared registration, confirm that two redirect URIs
     are acceptable.

3. **Redirect URIs to register**
   - `https://airi.utcluj.ro/api/auth/callback` (website)
   - `https://airi.utcluj.ro/strapi/strapi-plugin-sso/azuread/callback` (admin)
   - Development: `http://localhost:3000/api/auth/callback` and
     `http://localhost:1337/strapi-plugin-sso/azuread/callback`
   - Add the staging equivalents if you have one.

4. **Permissions and consent**
   - Scopes: `openid`, `profile`, `email`.
   - Delegated `User.Read` for the Microsoft Graph userinfo endpoint.
   - Please grant admin consent for both registrations.

5. **Who may sign in**
   - Confirm the exact email domains to allow (for example `utcluj.ro`,
     `student.utcluj.ro`, and any others).
   - Confirm whether external collaborators or personal Microsoft accounts are
     permitted; we prefer single-tenant access only.

6. **Strapi admin access**
   - Is there a security group or app role for site administrators?
   - If so, send the group object ID and tell us who manages membership.
   - We also need the `groups` claim to be emitted in the token if group-based
     access is used.

7. **Claims**
   - Please confirm the ID token/userinfo response includes `email` (or
     `preferred_username`), `given_name`, `family_name`, `name`, and `sub`/`oid`.
   - A redacted sample token would help us verify the integration.

8. **Testing**
   - One regular test account and one admin test account, plus a contact for
     identity issues during rollout.

Thank you!
