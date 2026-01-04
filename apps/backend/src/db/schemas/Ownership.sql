CREATE TABLE IF NOT EXISTS ownership (
    website_url VARCHAR(254) PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

