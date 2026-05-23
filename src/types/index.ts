// Type definitions for the application

export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'KNOWLEDGE_MANAGER' | 'AGENT';

export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ARCHIVED';

export type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type FeatureKey = 
  | 'AI_CHAT'
  | 'DOCUMENT_UPLOAD'
  | 'ANALYTICS'
  | 'AUDIT_LOGS'
  | 'CUSTOM_BRANDING'
  | 'API_ACCESS'
  | 'PRIORITY_SUPPORT';

export interface User {
  id: string;
  email: string;
  name: string | null;
  image?: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  tokensUsed?: number;
  createdAt: Date;
}

export interface Document {
  id: string;
  companyId: string;
  title: string;
  description?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: DocumentStatus;
  processingError?: string;
  totalChunks: number;
  category?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  tier: 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}
