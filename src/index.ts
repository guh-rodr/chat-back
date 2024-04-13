import 'dotenv/config'

import fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import cookie from '@fastify/cookie'
import { MessageProps, getAllMessages } from './lib/database'
import { router } from './routes'

export const messages: MessageProps[] = getAllMessages()
export const users = new Set()

const server = fastify()

const origin = process.env.WEBSITE_ORIGIN_URL as string

if (origin) {
  server.register(cors, {
    credentials: true,
    origin: [origin],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  })
}

server.register(websocket)
server.register(cookie)
server.register(router)

server.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error('Erro ao inciar o servidor:', err)
    process.exit(1)
  }
  console.log(`Servidor iniciado: ${address}`)
})