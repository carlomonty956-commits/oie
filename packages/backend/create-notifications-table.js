const sqlite3 = require('sqlite3')
const path = require('path')

const dbPath = path.join(__dirname, 'data', 'oie.db')
const db = new sqlite3.Database(dbPath)

const sql = `
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  opportunity_id TEXT,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
`

db.exec(sql, (err) => {
  if (err) {
    console.error('❌ Error creating notifications table:', err)
  } else {
    console.log('✅ Notifications table created successfully!')
  }
  db.close()
})