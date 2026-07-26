import sqlite3 from 'sqlite3'
import path from 'path'
import fs from 'fs'

let dbInstance: sqlite3.Database | null = null

export interface Database {
  query: (sql: string, params?: any[]) => Promise<any>
  run: (sql: string, params?: any[]) => Promise<any>
  exec: (sql: string) => Promise<void>
  end: () => Promise<void>
  close: () => Promise<void>
}

function promisifyDb(db: sqlite3.Database): Database {
  return {
    query: (sql: string, params: any[] = []): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err)
          else resolve({ rows })
        })
      })
    },
    run: (sql: string, params: any[] = []): Promise<any> => {
      return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
          if (err) reject(err)
          else resolve({ 
            lastID: this.lastID,
            changes: this.changes
          })
        })
      })
    },
    exec: (sql: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },
    end: (): Promise<void> => {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },
    close: (): Promise<void> => {
      return new Promise((resolve, reject) => {
        db.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }
}

export async function setupDatabase(): Promise<Database> {
  if (dbInstance) {
    return promisifyDb(dbInstance)
  }

  const dbPath = process.env.DB_PATH || './data/oie.db'
  const dir = path.dirname(dbPath)
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  return new Promise((resolve, reject) => {
    dbInstance = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('❌ Database connection failed:', err)
        reject(err)
        return
      }

      console.log('✅ SQLite database connected successfully')
      
      const dbPromisified = promisifyDb(dbInstance!)
      await dbPromisified.run('PRAGMA foreign_keys = ON')
      
      if (process.env.NODE_ENV === 'development') {
        try {
          const { runMigrations } = await import('./migrate.js')
          await runMigrations(dbPromisified)
        } catch (migrationError) {
          console.error('Migration error:', migrationError)
        }
      }

      resolve(dbPromisified)
    })
  })
}