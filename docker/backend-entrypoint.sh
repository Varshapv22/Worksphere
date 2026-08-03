#!/bin/sh
set -e

# In local dev (docker-compose.yml), backend/ is bind-mounted from the host,
# which overrides the image's `chown www-data` (set at build time) with
# whatever ownership the host files happen to have. php-fpm runs as
# www-data and needs write access to storage/ and bootstrap/cache/
# regardless of host UID -- fix it up on every container start rather than
# relying on a one-time build-time chown that a bind mount would shadow.
chmod -R ug+rwX /var/www/html/storage /var/www/html/bootstrap/cache 2>/dev/null || true

exec "$@"
