
export interface SmartFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;
  isImage: boolean;
  aiInsights?: string;
  summary?: string;
  tags?: string[];
  suggestedFolder?: string;
  isDeleted?: boolean;
}

export enum AnalysisStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
  SCANNING = 'SCANNING'
}
