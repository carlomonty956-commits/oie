import { FastifyInstance } from 'fastify'

export async function setupRateLimit(app: FastifyInstance) {
  // @ts-ignore - ignore type issues for now
  const rateLimit = await import('@fastify/rate-limit')
  // @ts-ignore
  await app.register(rateLimit.default, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request: any) => {
      return request.ip || 'unknown'
    },
    errorResponseBuilder: (request: any, context: any) => {
      return {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${context.after} seconds.`,
        statusCode: 429
      }
    }
  })
}