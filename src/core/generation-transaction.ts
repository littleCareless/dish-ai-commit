export interface GenerationTransaction {
  key: string;
  requestId: string;
  status: "pending" | "active" | "completed" | "failed";
  startTime: number;
  source: "command" | "event" | "auto";
  repoPath?: string;
  feature: string;
}

export interface GenerationRequest {
  source: "command" | "event" | "auto";
  repoPath: string;
  feature: string;
  changeHash: string;
  params: any;
}
