# Strapi Email Setup (Dev Quick Note)

## What to commit
- Commit email config code in `server/config/plugins.ts`.
- Commit only env variable names, never real credentials.

## What NOT to commit
- `SMTP_PASS`
- Any real username/password, API key, or internal secret

## What to ask IT / institution mail admin
- SMTP host (`SMTP_HOST`)
- SMTP port (`SMTP_PORT`) (usually 587 or 465)
- TLS mode (`SMTP_SECURE`) (true for 465, false for 587/STARTTLS)
- SMTP username (`SMTP_USER`)
- SMTP password (`SMTP_PASS`) or app password
- Allowed sender address (`SMTP_FROM`)
- Reply-to address (`SMTP_REPLY_TO`) if different
- Whether your server IP/domain must be allowlisted

## Local env example
Set these in `server/.env` (local only):

```env
SMTP_HOST=smtp.institution.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@institution.example
SMTP_PASS=replace-me
SMTP_FROM=no-reply@institution.example
SMTP_REPLY_TO=support@institution.example
```

## Verify quickly
- Restart Strapi after changing env/config.
- In Strapi admin, trigger a feature that sends email (or test from a custom route/service).
