import { FastifyInstance, FastifyRequest } from "fastify";
import { users, messages } from ".";
import { MessageStructure, MessageProps, createMessage } from "./lib/database";
import { sendToAllClients, sendToClient } from "./lib/events";

type ConnectionRequest = FastifyRequest<{
  Querystring: { username: string }
}>

export function router(fastify: FastifyInstance, _: any, done: () => void) {
  // -----------------------------
  // LISTA DE USUÁRIOS CONECTADOS
  // -----------------------------

  fastify.get('/users', (_, reply) => {
    const usernames = [...users].map(o => o[0])

    reply.status(200).send([...usernames])
  })

  // -----------------------------
  //    ESCOLHER NOME DE USUÁRIO
  // -----------------------------

  fastify.post<{ Body: { username: string } }>('/username', (request, reply) => {
    const { username } = request.body

    if (!username) {
      return reply.status(422).send({
        error: 'Um nome precisa ser fornecido.'
      })
    }

    if (users.has(username)) {
      return reply.status(409).send({
        error: 'Já existe um usuário online com esse nome.'
      })
    }

    reply.status(200).send({ ok: true })
  })

  // -----------------------------
  //        ENVIAR MENSAGEM
  // -----------------------------

  fastify.post('/message', (request, reply) => {
    const receivedMessage = request.body as MessageStructure

    if (receivedMessage.content.length === 0 || receivedMessage.content.length > 300) {
      return reply.status(422).send({
        error: 'Conteúdo da mensagem muito curto ou muito longo!'
      })
    }

    const { id } = createMessage(receivedMessage)

    const createdMessage: MessageProps = {
      id,
      ...receivedMessage,
      createdAt: Date.now()
    }

    if (messages.length > 49) {
      messages.shift()
    }

    messages.push(createdMessage)

    sendToAllClients(fastify.websocketServer, {
      name: 'messageSent',
      message: createdMessage,
      removeOld: messages.length > 49
    })

    reply.code(201).send({ ok: true })
  })

  // -----------------------------
  //    CONEXÃO COM O WEBSOCKET
  // -----------------------------

  fastify.get('/', { websocket: true }, (socket, request: ConnectionRequest) => {
    const { username } = request.query

    const userExists = users.get(username)
    const usernameAlreadyInUse = userExists && userExists.ip !== request.ip

    if (usernameAlreadyInUse) {
      socket.close(4001, `Já existe um usuário com o nome ${username} conectado, escolha outro nome de usuário.`)
    } else {
      if (socket.readyState === 1) {
        users.set(username, { ip: request.ip })
      }

      const newUsersCount = users.size
      const isRepeatedConnection = userExists && userExists.ip === request.ip

      sendToClient(socket, { name: 'messagesList', messages })
      sendToAllClients(fastify.websocketServer, {
        name: 'userJoin',
        user: username,
        counter: newUsersCount,
        repeatedConn: isRepeatedConnection
      })

      socket.on('close', () => {
        if (!isRepeatedConnection) {
          users.delete(username)
        }

        const newUsersCount = users.size

        sendToAllClients(fastify.websocketServer, {
          name: 'userLeft',
          user: username,
          counter: newUsersCount,
          repeatedConn: isRepeatedConnection
        })
      })
    }
  })

  done()
}