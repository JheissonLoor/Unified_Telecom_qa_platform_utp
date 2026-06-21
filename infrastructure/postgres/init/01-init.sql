CREATE TABLE IF NOT EXISTS call_detail_records (
    id BIGSERIAL PRIMARY KEY,
    calldate TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clid VARCHAR(128),
    src VARCHAR(80),
    dst VARCHAR(80),
    dcontext VARCHAR(80),
    channel VARCHAR(160),
    dstchannel VARCHAR(160),
    lastapp VARCHAR(80),
    lastdata VARCHAR(160),
    duration INTEGER NOT NULL DEFAULT 0,
    billsec INTEGER NOT NULL DEFAULT 0,
    disposition VARCHAR(45),
    amaflags INTEGER NOT NULL DEFAULT 0,
    accountcode VARCHAR(80),
    uniqueid VARCHAR(150) NOT NULL UNIQUE,
    userfield VARCHAR(255),
    peeraccount VARCHAR(80),
    linkedid VARCHAR(150),
    sequence INTEGER
);

CREATE INDEX IF NOT EXISTS ix_cdr_calldate ON call_detail_records (calldate DESC);
CREATE INDEX IF NOT EXISTS ix_cdr_src_dst ON call_detail_records (src, dst);
CREATE INDEX IF NOT EXISTS ix_cdr_linkedid ON call_detail_records (linkedid);
