export interface KBChunk {
  id: string;
  category: "Admission & Screening" | "Fees & Payments" | "Documents Checklist" | "Course Registration & Matriculation";
  title: string;
  content: string;
  metadata: {
    source: string;
    session: string;
    keywords: string[];
  };
}

export interface Citation {
  id: string;
  title: string;
  category: string;
  source: string;
  score: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: string;
  citations?: Citation[];
  error?: boolean;
}

export interface RAGStatus {
  isReady: boolean;
  isInitializing: boolean;
  isFallbackMode: boolean;
  totalChunks: number;
  loadedChunks: number;
  sessionYear: string;
}
