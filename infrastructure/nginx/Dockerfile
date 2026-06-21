FROM nginxinc/nginx-unprivileged:1.27-alpine
USER root
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && chown -R 101:101 /etc/nginx/certs
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0755 /entrypoint.sh \
    && chown 101:101 /entrypoint.sh /etc/nginx/conf.d/default.conf
USER 101:101
ENTRYPOINT ["/entrypoint.sh"]
