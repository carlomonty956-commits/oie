import { FastifyInstance } from 'fastify'

export async function setupHelmet(app: FastifyInstance) {
  // @ts-ignore - ignore type issues for now
  const helmet = await import('@fastify/helmet')
  // @ts-ignore
  await app.register(helmet.default, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
}