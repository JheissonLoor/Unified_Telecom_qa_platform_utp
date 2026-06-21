FROM coturn/coturn:4.6.2
USER root
COPY turnserver.conf.template /etc/coturn/turnserver.conf.template
COPY entrypoint.sh /entrypoint.sh
RUN mkdir -p /etc/coturn/certs \
    && chmod 0755 /entrypoint.sh \
    && chown -R 65534:65534 /etc/coturn /entrypoint.sh
USER 65534:65534
ENTRYPOINT ["/entrypoint.sh"]
