import Database from 'better-sqlite3'

const database = new Database('database.db')

export interface MessageStructure {
  author: string
  content: string
}

export interface MessageProps extends MessageStructure {
  id: number | bigint
  createdAt: number
}

export const createMessage = (message: MessageStructure) => {
  database.exec(`
    DELETE FROM messages
    WHERE createdAt = (SELECT MIN(createdAt) FROM messages)
    AND (SELECT COUNT(*) FROM messages) > 49;
  `)

  const row = database.prepare(`
    INSERT INTO messages (author, content) VALUES (?, ?);
  `).run(message.author, message.content);

  return { id: row.lastInsertRowid }
}

export const getAllMessages = () => {
  const messages = database.prepare(`SELECT * FROM messages;`).all() as MessageProps[]
  return messages
}