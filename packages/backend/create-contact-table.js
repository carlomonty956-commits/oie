const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'oie.db')
const db = new sqlite3.Database(dbPath)

const sql = `
-- Add contact tracking fields
ALTER TABLE opportunities ADD COLUMN contact_status VARCHAR(50) DEFAULT 'not_contacted';
ALTER TABLE opportunities ADD COLUMN contact_method VARCHAR(50);
ALTER TABLE opportunities ADD COLUMN contact_message TEXT;
ALTER TABLE opportunities ADD COLUMN contacted_at TIMESTAMP;
ALTER TABLE opportunities ADD COLUMN follow_up_at TIMESTAMP;
ALTER TABLE opportunities ADD COLUMN notes TEXT;

-- Contact history table
CREATE TABLE IF NOT EXISTS contact_history (
  id TEXT PRIMARY KEY,
  opportunity_id TEXT NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  method VARCHAR(50) NOT NULL,
  message TEXT,
  response_received BOOLEAN DEFAULT 0,
  response_text TEXT,
  contacted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_history_opportunity ON contact_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_contacted ON contact_history(contacted_at);
`

db.exec(sql, (err) => {
  if (err) {
    console.error('❌ Error creating contact tables:', err)
  } else {
    console.log('✅ Contact tables created successfully!')
  }
  db.close()
})