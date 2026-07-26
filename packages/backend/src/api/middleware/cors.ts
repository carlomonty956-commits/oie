import { FastifyInstance } from 'fastify'

export async function setupCors(app: FastifyInstance) {
  // @ts-ignore - ignore type issues for now
  const cors = await import('@fastify/cors')
  // @ts-ignore
  await app.register(cors.default, {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173'] 
      : process.env.ALLOWED_ORIGINS?.split(',') || [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true
  })
}