# Custom Caddy build with Cloudflare DNS plugin (Option C TLS only).
# If you are using Option A or B, you do not need this file.
# In docker-compose.yml, replace `image: caddy:2-alpine` with:
#   build:
#     context: ./caddy
#     dockerfile: Dockerfile

FROM caddy:2-builder AS builder
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
