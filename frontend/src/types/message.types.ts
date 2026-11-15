// Messagerie : conversations plates + messages rattachés par conversationId.

export interface Conversation {
  id: string;
  companyId: string;
  clientId: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  readAt?: string;
}
