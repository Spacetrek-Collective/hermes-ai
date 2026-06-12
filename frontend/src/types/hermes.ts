export type Role = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: Role
  content: string
  /** True while tokens are still streaming into this message. */
  streaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

/** Shape of a parsed SSE event from the Hermes agent. */
export interface HermesEvent {
  type: 'token' | 'done' | 'error'
  text?: string
  message?: string
}
