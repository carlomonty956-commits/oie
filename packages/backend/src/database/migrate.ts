import { Database } from './sqlite'
import fs from 'fs'
import path from 'path'

const MIGRATIONS_TABLE = 'migrations'

export async function runMigrations(db: Database) {
  try {
    // Create migrations table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
  } catch (error) {
    console.error('Error creating migrations table:', error)
    throw error
  }

  // Get all migration files
  const migrationsDir = path.join(__dirname, 'migrations')
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true })
    console.log('📁 Created migrations directory')
    return
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (files.length === 0) {
    console.log('📭 No migration files found')
    return
  }

  // Get executed migrations
  try {
    const result = await db.query(`SELECT name FROM ${MIGRATIONS_TABLE}`)
    const executed = new Set(result.rows.map((r: any) => r.name))

    // Run pending migrations
    for (const file of files) {
      if (!executed.has(file)) {
        console.log(`🔄 Running migration: ${file}`)
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
        
        try {
          // Split SQL statements by semicolon and execute each
          const statements = sql.split(';').filter(s => s.trim().length > 0)
          for (const statement of statements) {
            if (statement.trim()) {
              await db.exec(statement.trim())
            }
          }
          
          await db.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES (?)`,
            [file]
          )
          console.log(`✅ Migration complete: ${file}`)
        } catch (error) {
          console.error(`❌ Migration failed: ${file}`, error)
          throw error
        }
      }
    }
  } catch (error) {
    console.error('Error checking migrations:', error)
    throw error
  }
}