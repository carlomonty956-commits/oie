import { ScheduledTask } from 'node-cron'
import { CrawlerManager } from './manager'

export class CrawlerScheduler {
  private manager: CrawlerManager
  private tasks: Map<string, ScheduledTask> = new Map()
  private schedules: Map<string, string> = new Map()

  constructor(manager: CrawlerManager) {
    this.manager = manager
  }

  async schedule(name: string, cronExpression: string): Promise<void> {
    // Dynamic import for node-cron
    const cron = await import('node-cron')
    
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`)
    }

    // Remove existing schedule if any
    this.unschedule(name)

    // Create new task
    const task = cron.schedule(cronExpression, async () => {
      console.log(`⏰ Running scheduled crawler: ${name} at ${new Date().toISOString()}`)
      try {
        await this.manager.runCrawler(name)
      } catch (error) {
        console.error(`Scheduled crawler ${name} failed:`, error)
      }
    })

    this.tasks.set(name, task)
    this.schedules.set(name, cronExpression)
    
    console.log(`📅 Scheduled crawler ${name}: ${cronExpression}`)
  }

  unschedule(name: string): void {
    const task = this.tasks.get(name)
    if (task) {
      task.stop()
      this.tasks.delete(name)
      this.schedules.delete(name)
      console.log(`⏹️ Unscheduled crawler: ${name}`)
    }
  }

  async startAll(defaultSchedule: string = '*/5 * * * *'): Promise<void> {
    const plugins = this.manager.getPlugins()
    
    for (const name of plugins) {
      await this.schedule(name, defaultSchedule)
    }
    
    console.log(`🚀 Started all crawlers with schedule: ${defaultSchedule}`)
  }

  stopAll(): void {
    for (const [name] of this.tasks) {
      this.unschedule(name)
    }
    console.log('⏹️ Stopped all crawlers')
  }

  getSchedules(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [name, schedule] of this.schedules) {
      result[name] = schedule
    }
    return result
  }
}