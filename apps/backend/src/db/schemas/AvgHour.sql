CREATE TABLE IF NOT EXISTS average_hr (
    website_url VARCHAR(254) NOT NULL,
    hour_id VARCHAR(10) NOT NULL,
    avg INTEGER,
    sample_count INTEGER DEFAULT 0,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (website_url, hour_id),
    FOREIGN KEY (website_url) REFERENCES ownership(website_url) ON DELETE CASCADE
);
