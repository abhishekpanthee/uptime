CREATE TABLE IF NOT EXISTS average_day (
    website_url VARCHAR(254) NOT NULL,
    day_id VARCHAR(8) NOT NULL,
    avg INTEGER,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (website_url, day_id),
    FOREIGN KEY (website_url) REFERENCES ownership(website_url) ON DELETE CASCADE
);
