-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  config TEXT NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Crawler sources table
CREATE TABLE IF NOT EXISTS crawler_sources (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',
  schedule VARCHAR(100),
  priority INTEGER DEFAULT 50,
  quality_score INTEGER DEFAULT 70,
  last_run TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sources_enabled ON crawler_sources(enabled);

-- Raw content table
CREATE TABLE IF NOT EXISTS raw_content (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  source_id TEXT REFERENCES crawler_sources(id),
  source_identifier VARCHAR(255) NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  url VARCHAR(2048),
  author VARCHAR(255),
  language VARCHAR(10) DEFAULT 'en',
  metadata TEXT DEFAULT '{}',
  content_hash VARCHAR(64) UNIQUE,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  normalized BOOLEAN DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_raw_content_source ON raw_content(source_id);
CREATE INDEX IF NOT EXISTS idx_raw_content_hash ON raw_content(content_hash);
CREATE INDEX IF NOT EXISTS idx_raw_content_fetched ON raw_content(fetched_at);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  raw_content_id TEXT REFERENCES raw_content(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  url VARCHAR(2048),
  score INTEGER DEFAULT 0,
  score_breakdown TEXT DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'new',
  matched_keywords TEXT,
  matched_intent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_opportunities_project ON opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_score ON opportunities(score DESC);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created ON opportunities(created_at DESC);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_opportunity ON feedback(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_action ON feedback(action);

-- Project learning data
CREATE TABLE IF NOT EXISTS project_learning (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  weight INTEGER DEFAULT 0,
  positive_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, keyword)
);

CREATE INDEX IF NOT EXISTS idx_learning_project ON project_learning(project_id);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (uuid()),
  user_id VARCHAR(255) NOT NULL,
  opportunity_id TEXT REFERENCES opportunities(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  read BOOLEAN DEFAULT 0,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- SQLite doesn't have UUID generation built-in, create a helper function
-- For SQLite, we'll handle UUID generation in code