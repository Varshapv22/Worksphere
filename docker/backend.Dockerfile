# syntax=docker/dockerfile:1
#
# WorkSphere backend image (Laravel 11 API).
#
# This image bundles php-fpm + nginx + supervisord in a single container,
# listening on internal port 8080. That lets the top-level reverse proxy
# (docker/nginx/default.conf.template) talk plain HTTP to this container
# instead of having to speak FastCGI across a container boundary (which
# would require sharing the Laravel public/ directory as a volume between
# two separate images). Simpler and less brittle for a single-service unit.

########################################
# Stage 1: composer dependencies
########################################
FROM composer:2 AS vendor

WORKDIR /app

# Copy only the lock files first so this (slow) layer is cached across
# builds whenever application code changes but dependencies don't.
COPY backend/composer.json backend/composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --no-autoloader \
    --prefer-dist

# Now bring in the rest of the application source and finish the install
# (runs package discovery + builds the optimized autoloader against the
# real app code).
COPY backend/ .

RUN composer install \
    --no-dev \
    --optimize-autoloader \
    --no-interaction \
    --prefer-dist

########################################
# Stage 2: runtime (php-fpm + nginx + supervisord)
########################################
FROM php:8.2-fpm-alpine AS runtime

# --- system packages: nginx, supervisord, and libs needed by the PHP exts ---
#
# Runtime shared libs (libpng, libzip, ...) are installed explicitly and
# separately from their -dev counterparts, which go into a named virtual
# package (.build-deps). `apk del .build-deps` then removes only the -dev
# headers used to compile the PHP extensions, not the runtime .so files the
# extensions link against at process start -- deleting them in the same
# breath as their -dev packages (as a single flat `apk del pkgA-dev ...`
# list) cascades into removing the runtime libs too, since apk otherwise
# treats them as having been pulled in solely to satisfy the -dev packages.
RUN apk add --no-cache \
        nginx \
        supervisor \
        bash \
        curl \
        libpng \
        libjpeg-turbo \
        freetype \
        libzip \
        libxml2 \
        oniguruma \
    && apk add --no-cache --virtual .build-deps \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libzip-dev \
        libxml2-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        mbstring \
        bcmath \
        exif \
        pcntl \
        zip \
        gd \
    && apk del .build-deps \
    && rm -rf /var/cache/apk/*

WORKDIR /var/www/html

# App code + vendor from the composer stage. `rm -rf vendor` before the
# second COPY guarantees a clean directory even if a host-side `vendor/`
# leaked into the build context despite .dockerignore (e.g. someone ran
# `composer install` locally in backend/) -- `COPY --from=vendor ... ./vendor`
# on top of an EXISTING directory merges file-by-file rather than replacing
# it, so a stale host vendor/ and the correct --no-dev vendor/ could
# otherwise mix into an inconsistent install (files on disk that
# vendor/composer/installed.json doesn't know about, breaking autoloading).
COPY backend/ .
RUN rm -rf vendor
COPY --from=vendor /app/vendor ./vendor

# Regenerate the package-discovery cache (bootstrap/cache/packages.php,
# services.php) against the --no-dev vendor/ actually present in this image.
# Without this, a stale cache from a host-side `composer install` (with dev
# packages like laravel/pail) copied in via `COPY backend/ .` would reference
# providers that don't exist in production vendor/, causing a fatal error at
# boot. .dockerignore also excludes these two files from the build context
# as a second layer of defense.
RUN php artisan package:discover --ansi

# Ownership + writable dirs Laravel needs at runtime
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 storage bootstrap/cache

# --- nginx site config (internal, serves Laravel's public/ on :8080) ---
COPY docker/nginx/backend-site.conf /etc/nginx/http.d/default.conf

# --- supervisord config: run php-fpm + nginx in one container ---
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# nginx needs somewhere writable to run as non-root; keep it simple and run
# both processes as root via supervisord (php-fpm workers still drop to
# www-data per the pool config, which is the security-relevant boundary).
RUN mkdir -p /run/nginx

COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh
RUN chmod +x /usr/local/bin/backend-entrypoint.sh

EXPOSE 8080

# Laravel 11 ships a built-in health endpoint at /up
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8080/up || exit 1

ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf", "-n"]
