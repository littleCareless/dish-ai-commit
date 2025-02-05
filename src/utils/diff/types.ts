export interface DiffChunk {
  filename: string;
  content: string;
}

export interface DiffConfig {
  enabled: boolean;
  contextLines: number;
  maxLineLength: number;
}
