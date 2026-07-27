import { RawContent, CrawlerPlugin } from '../types'
import { Client, GatewayIntentBits, Partials } from 'discord.js'

export class DiscordPlugin implements CrawlerPlugin {
  name = 'Discord'
  sourceType = 'discord'
  enabled = true

  private client: Client
  private guildIds: string[]
  private channelIds: string[]
  private isReady: boolean = false

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ],
      partials: [Partials.Channel]
    })

    this.guildIds = (process.env.DISCORD_GUILD_IDS || '').split(',').filter(Boolean)
    this.channelIds = (process.env.DISCORD_CHANNEL_IDS || '').split(',').filter(Boolean)

    // Setup client event handlers
    this.client.once('ready', () => {
      console.log(`✅ Discord bot logged in as ${this.client.user?.tag}`)
      this.isReady = true
    })

    this.client.on('error', (error) => {
      console.error('Discord client error:', error)
    })
  }

  async healthCheck(): Promise<boolean> {
    try {
      console.log('🔍 Running Discord health check...')
      
      const token = process.env.DISCORD_BOT_TOKEN
      if (!token) {
        console.log('❌ Discord bot token not configured')
        return false
      }

      // Check if client is already ready
      if (this.isReady && this.client.user) {
        console.log('✅ Discord health check passed')
        return true
      }

      // Try to login if not already
      if (!this.client.isReady()) {
        await this.client.login(token)
        await new Promise<void>((resolve) => {
          if (this.client.isReady()) {
            resolve()
          } else {
            this.client.once('ready', () => resolve())
          }
        })
        console.log('✅ Discord health check passed')
        return true
      }

      return true
    } catch (error) {
      console.error('❌ Discord health check failed:', error)
      return false
    }
  }

  private isValidOpportunity(text: string): boolean {
    const opportunityKeywords = [
      'looking for', 'hiring', 'need', 'freelance', 'hire',
      'developer', 'designer', 'builder', 'create', 'build',
      'project', 'work', 'contract', 'help', 'assist',
      'paid', 'compensation', 'rate', 'budget', 'job'
    ]
    
    const lowerText = text.toLowerCase()
    return opportunityKeywords.some(keyword => lowerText.includes(keyword))
  }

  private async fetchChannelMessages(channelId: string): Promise<RawContent[]> {
    const posts: RawContent[] = []

    try {
      const channel = await this.client.channels.fetch(channelId)
      if (!channel || !channel.isTextBased()) {
        console.log(`⚠️ Channel ${channelId} is not a text channel`)
        return posts
      }

      const messages = await channel.messages.fetch({ limit: 50 })
      console.log(`📡 Found ${messages.size} messages in channel ${channelId}`)

      for (const [messageId, message] of messages) {
        const text = message.content || ''
        const attachments = message.attachments.size > 0 ? ' [Has attachments]' : ''

        // Skip system messages
        if (message.system) continue

        // Skip bot messages (optional)
        if (message.author?.bot) continue

        const fullText = text + attachments

        // Only include messages that look like opportunities
        if (!this.isValidOpportunity(fullText)) continue

        // Skip short messages
        if (fullText.length < 20) continue

        posts.push({
          id: `discord_${messageId}`,
          source: 'discord',
          title: fullText.substring(0, 100) + (fullText.length > 100 ? '...' : ''),
          content: fullText,
          url: message.url,
          author: message.author?.username || 'unknown',
          createdAt: message.createdAt.toISOString(),
          language: 'en',
          metadata: {
            channelId: channelId,
            channelName: channel.name || 'unknown',
            guildId: message.guildId,
            guildName: message.guild?.name || 'unknown',
            messageId: messageId,
            attachments: message.attachments.size,
            embeds: message.embeds.length
          }
        })
      }
    } catch (error) {
      console.error(`Error fetching channel ${channelId}:`, error)
    }

    return posts
  }

  private async fetchGuildChannels(guildId: string): Promise<RawContent[]> {
    const posts: RawContent[] = []

    try {
      const guild = await this.client.guilds.fetch(guildId)
      if (!guild) {
        console.log(`⚠️ Guild ${guildId} not found`)
        return posts
      }

      console.log(`📡 Fetching from guild: ${guild.name}`)

      const channels = await guild.channels.fetch()
      const textChannels = channels.filter(c => c?.isTextBased())

      for (const [channelId, channel] of textChannels) {
        if (!channel || !channel.isTextBased()) continue
        
        // Skip voice channels, categories, etc.
        if (channel.type === 0 || channel.type === 2 || channel.type === 4) continue

        console.log(`📡 Fetching messages from #${channel.name}`)
        const channelPosts = await this.fetchChannelMessages(channelId)
        posts.push(...channelPosts)
      }
    } catch (error) {
      console.error(`Error fetching guild ${guildId}:`, error)
    }

    return posts
  }

  async fetch(): Promise<RawContent[]> {
    const allPosts: RawContent[] = []

    if (!process.env.DISCORD_BOT_TOKEN) {
      console.error('❌ Discord bot token not configured')
      return allPosts
    }

    try {
      // Ensure client is logged in
      if (!this.client.isReady()) {
        await this.client.login(process.env.DISCORD_BOT_TOKEN)
        await new Promise<void>((resolve) => {
          if (this.client.isReady()) {
            resolve()
          } else {
            this.client.once('ready', () => resolve())
          }
        })
      }

      console.log(`🔍 Fetching from Discord...`)

      // If channel IDs are specified, only fetch those channels
      if (this.channelIds.length > 0) {
        for (const channelId of this.channelIds) {
          await this.delay(1000)
          const posts = await this.fetchChannelMessages(channelId)
          allPosts.push(...posts)
          console.log(`✅ Found ${posts.length} messages in channel ${channelId}`)
        }
      }
      // If guild IDs are specified, fetch all channels in those guilds
      else if (this.guildIds.length > 0) {
        for (const guildId of this.guildIds) {
          await this.delay(1000)
          const posts = await this.fetchGuildChannels(guildId)
          allPosts.push(...posts)
          console.log(`✅ Found ${posts.length} messages from guild ${guildId}`)
        }
      } else {
        console.log('⚠️ No guild IDs or channel IDs specified in .env')
      }
    } catch (error) {
      console.error('❌ Error fetching from Discord:', error)
    }

    console.log(`📊 Total posts fetched from Discord: ${allPosts.length}`)
    return allPosts
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  normalize(data: RawContent): RawContent {
    return data
  }
}