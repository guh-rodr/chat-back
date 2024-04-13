import { WebSocket, WebSocketServer } from 'ws';

export function sendToAllClients(websocketServer: WebSocketServer, data: object) {
  websocketServer.clients.forEach((client) => {
    if (client.readyState === 1) {
      const eventData = JSON.stringify(data)
      client.send(eventData)
    }
  })
}

export function sendToClient(socket: WebSocket, data: object) {
  if (socket.readyState === 1) {
    const eventData = JSON.stringify(data)
    socket.send(eventData)
  }
}