# Public API exposure, TLS, and rate limiting

The public site should only need to reach Next.js pages and the small set of
Next.js API routes that those pages use. Direct access to Strapi and Snipe-IT
APIs is not required, but Snipe-IT's own admin panel currently calls its REST
API, so that path cannot be blocked outright.

TLS is terminated by the university reverse proxy (openresty). The origin
nginx in `nginxconfig.txt` speaks HTTP only. Do **not** add an 80 -> 443
redirect to the origin: the TLS terminator would follow it back to itself and
loop. The redirect belongs on the terminator.

## 1. Block the Strapi content API

At nginx, keep the media paths public but reject the Strapi API paths:

```nginx
location = /strapi/api {
    return 404;
}

location ^~ /strapi/api/ {
    return 404;
}
```

The exact `=` location catches `/strapi/api` without a trailing slash, which
would otherwise fall into `location /strapi/` and be proxied. The `^~` prefix
prevents a future regex location from overriding the block.

Do **not** block `/strapi/uploads/`; the public pages use those files.

## 2. Snipe-IT API: rate limit, do not blanket-block

A blanket `return 404` for `/snipeit/api/` broke the Snipe-IT admin panel, so
the origin currently rate-limits that path instead:

```nginx
location /snipeit/api/ {
    limit_req zone=snipeit_api burst=60 nodelay;
    limit_req_status 429;
    # ... normal proxy headers ...
    proxy_pass http://127.0.0.1:8000/api/;
}

# The same API when the app writes index.php into the path.
location /snipeit/index.php/api {
    limit_req zone=snipeit_api burst=60 nodelay;
    limit_req_status 429;
    # ... normal proxy headers ...
    proxy_pass http://127.0.0.1:8000/index.php/api;
}
```

If the panel is later put behind a VPN or an IP allowlist, replace the
`limit_req` lines with an `allow <CIDR>; deny all;` block. Cover both
locations: `/snipeit/index.php/api` was the bypass around the old block.

Verify from outside the host:

```bash
curl -i https://airi.utcluj.ro/snipeit/api/v1/status
# 401 without an API key: the endpoint exists, but is not public data

curl -i https://airi.utcluj.ro/strapi/api/reservations
# HTTP/1.1 404

curl -I https://airi.utcluj.ro/strapi/uploads/<existing-file>
# HTTP/1.1 200
```

## 3. Protect the admin panels

`/strapi/admin` and the Snipe-IT admin UI should not be public. Put them behind
a VPN, an IP allowlist, or a zero-trust proxy. Example shape (replace the CIDR
with the institute VPN range):

```nginx
location ^~ /strapi/admin/ {
    allow 10.0.0.0/8;
    deny all;
    # keep the same proxy_pass settings as /strapi/
}
```

Do not copy the `location /strapi/` block without the allowlist and call it
protected; the allowlist must come first.

The Strapi admin uses local accounts; it is not part of the Entra ID flow.
`STRAPI_ADMIN_URL` is relative to `PUBLIC_STRAPI_URL`: with
`PUBLIC_STRAPI_URL=https://airi.utcluj.ro/strapi`, set `STRAPI_ADMIN_URL=/admin`
so the panel is at `https://airi.utcluj.ro/strapi/admin`. Setting
`/strapi/admin` produces the doubled `/strapi/strapi/admin` path.

## 4. Rate limit the Next.js APIs

The browser calls `/api/reservations`, `/api/equipment`, `/api/auth/*`, and the
Strapi revalidation webhook. The origin config defines these zones in the
`http` context:

```nginx
limit_req_zone $binary_remote_addr zone=reservations:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=equipment:10m    rate=2r/s;
limit_req_zone $binary_remote_addr zone=next_auth:10m    rate=20r/m;
limit_req_zone $binary_remote_addr zone=revalidate:10m   rate=120r/m;
limit_req_zone $binary_remote_addr zone=snipeit_api:10m  rate=120r/m;
```

Then each location sets `limit_req` and `limit_req_status 429`. The equipment
response is cached for 30 seconds at the application level, which also reduces
Snipe-IT load.

Rate limits key on `$binary_remote_addr`. Because every request arrives through
the TLS terminator, the config uses `set_real_ip_from` and
`real_ip_header X-Forwarded-For` to recover the client address. Update the
`set_real_ip_from` list if the proxy connects from another address; otherwise
all clients share one bucket.

## 5. TLS and cookies at the origin

The origin adds HSTS and basic security headers:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

`Permissions-Policy` is set by Next.js only, not by the origin nginx: a global
`camera=()` would break Snipe-IT features that use the camera.

HSTS is only honoured over HTTPS, so this reaches browsers only if the TLS
terminator passes the header through. The origin also overwrites
`X-Forwarded-For` with `$remote_addr` so clients cannot smuggle extra addresses
into Strapi or Snipe-IT.

Snipe-IT sets `SESSION_SECURE_COOKIE=true` in `compose.prod.yaml`, so its
session and XSRF cookies are only sent over HTTPS. The Next.js session cookie
is already marked `Secure` when `AUTH_URL` is HTTPS.

## 6. Later: remove the browser -> API hop

The current equipment and reservation pages fetch their data from Next.js API
routes. The next step is to move that data fetching into server components or
server actions, so the browser only requests pages. Once that is done, the
unused `/api/*` routes can be removed or blocked as well.
