export type DocumentId = 'agreement' | 'wages';

export interface Citation {
  documentId: DocumentId;
  documentTitle: string;
  section: string;
  pageNumber: number;
  pageLabel: string;
  quote: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  grounded?: boolean;
  citations?: Citation[];
  timestamp: string;
  isError?: boolean;
}

export interface DocumentSection {
  id: string;
  documentId: DocumentId;
  code: string;
  title: string;
  summary: string;
  pdfPage: number;
  pageLabel: string;
  category: 'wages' | 'agreement' | 'mou';
  sampleQuestion: string;
}
