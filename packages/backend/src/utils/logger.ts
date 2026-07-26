import { FastifyInstance } from 'fastify'

export function setupLogging(app: FastifyInstance) {
  app.addHook('onRequest', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      ip: request.ip
    }, 'Incoming request')
  })

  app.addHook('onResponse', async (request, reply) => {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime
    }, 'Request completed')
  })
}