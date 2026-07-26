import { Database } from '../database'
import { CrawlerManager } from '../crawler-platform'

declare module 'fastify' {
  interface FastifyInstance {
    db: Database
    crawlerManager: CrawlerManager
  }
}