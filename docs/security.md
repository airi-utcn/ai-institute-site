# Public API exposure and rate limiting

The public site should only need to reach Next.js pages and the small set of
Next.js API routes that those pages use. Direct access to Strapi and Snipe-IT
APIs is not required.

## 1. Block CMS and inventory APIs

At nginx, keep the media paths public but reject the API paths:

```nginx
# Strapi content API: only the Next.js server should use it, via the
# internal Docker URL (STRAPI_INTERNAL_URL).
location /strapi/api/ {
    return 404;
}

# Snipe-IT REST API: only Strapi and Next.js should use it, via SNIPEIT_URL.
# If the Snipe-IT admin UI itself calls /snipeit/api/, replace this blanket
# 404 with an allowlist for the institute/VPN range.
location /snipeit/api/ {
    return 404;
}
```

Do **not** block:

- `/strapi/uploads/` — Strapi media used by the public pages.
- `/snipeit/uploads/` — equipment images used by the catalog.

Verify from outside the host:

```bash
curl -i https://airi.utcluj.ro/strapi/api/reservations
# HTTP/1.1 404

curl -i https://airi.utcluj.ro/snipeit/api/v1/hardware
# HTTP/1.1 404

curl -I https://airi.utcluj.ro/strapi/uploads/<existing-file>
# HTTP/1.1 200
```

## 2. Protect the admin panels

`/strapi/admin` and the Snipe-IT admin UI should not be public. Put them behind
a VPN, an IP allowlist, or a zero-trust proxy. Example shape (replace the CIDR
with the institute VPN range):

```nginx
location /strapi/admin/ {
    allow 10.0.0.0/8;
    deny all;
    # keep the same proxy_pass settings as /strapi/
}
```

The Strapi admin uses local accounts; it is not part of the Entra ID flow.

## 3. Rate limit the Next.js APIs

The browser still calls `/api/reservations` and `/api/equipment`. Add limits so
a signed-in user cannot hammer Snipe-IT or fill the reservation table:

```nginx
# In the http {} block:
limit_req_zone $binary_remote_addr zone=reservations:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=equipment:10m rate=2r/s;
```

Then, in the server block, add specific locations before the generic `location /`:

```nginx
location = /api/reservations {
    limit_req zone=reservations burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    # copy the usual proxy headers here
}

location /api/equipment {
    limit_req zone=equipment burst=20 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    # copy the usual proxy headers here
}
```

The equipment response is cached for 30 seconds at the application level, which
also reduces Snipe-IT load.

## 4. Later: remove the browser → API hop

The current equipment and reservation pages fetch their data from Next.js API
routes. The next step is to move that data fetching into server components or
server actions, so the browser only requests pages. Once that is done, the
unused `/api/*` routes can be removed or blocked as well.
