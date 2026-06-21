FROM debian:bookworm-slim

ARG ASTERISK_VERSION=22.10.0
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential ca-certificates curl pkg-config wget \
      libcurl4-openssl-dev libedit-dev libjansson-dev libopus-dev libpq-dev \
      libsrtp2-dev libsqlite3-dev libssl-dev libvpx-dev libxml2-dev \
      unixodbc-dev uuid-dev \
    && wget -q "https://downloads.asterisk.org/pub/telephony/asterisk/asterisk-${ASTERISK_VERSION}.tar.gz" -O /tmp/asterisk.tar.gz \
    && mkdir /tmp/asterisk-src \
    && tar -xzf /tmp/asterisk.tar.gz --strip-components=1 -C /tmp/asterisk-src \
    && cd /tmp/asterisk-src \
    && ./configure --with-pjproject-bundled --with-jansson-bundled \
    && make -j"$(nproc)" \
    && make install \
    && ldconfig \
    && cd / \
    && rm -rf /tmp/asterisk-src /tmp/asterisk.tar.gz \
    && apt-get purge -y --auto-remove build-essential pkg-config wget \
      libcurl4-openssl-dev libedit-dev libjansson-dev libopus-dev libpq-dev \
      libsrtp2-dev libsqlite3-dev libssl-dev libvpx-dev libxml2-dev unixodbc-dev uuid-dev \
    && apt-get update && apt-get install -y --no-install-recommends \
      gettext-base gosu libcurl4 libedit2 libjansson4 libopus0 libpq5 libsrtp2-1 \
      libsqlite3-0 libssl3 libvpx7 libxml2 odbc-postgresql openssl unixodbc \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system asterisk \
    && useradd --system --gid asterisk --home-dir /var/lib/asterisk asterisk \
    && mkdir -p /etc/asterisk /var/lib/asterisk /var/log/asterisk /var/run/asterisk /var/spool/asterisk/monitor \
    && chown -R asterisk:asterisk /var/lib/asterisk /var/log/asterisk /var/run/asterisk /var/spool/asterisk

COPY configs/ /etc/asterisk/templates/
COPY configs/odbc.ini /etc/odbc.ini
COPY entrypoint.sh /entrypoint.sh
RUN chmod 0755 /entrypoint.sh \
    && chown -R asterisk:asterisk /etc/asterisk /etc/odbc.ini /entrypoint.sh

USER asterisk:asterisk

EXPOSE 5060/udp 5061/tcp 8088/tcp 10000-10100/udp
ENTRYPOINT ["/entrypoint.sh"]
