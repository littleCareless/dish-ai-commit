import { SemanticCommitGroup } from "@/commands/generate-commit/types";

export interface SemanticGroupSession {
  id: string;
  repositoryPath: string;
  selectedFilesSignature: string;
  remainingGroups: SemanticCommitGroup[];
  createdAt: number;
  updatedAt: number;
}

const SESSION_TTL_MS = 1000 * 60 * 60;

export class SemanticGroupSessionService {
  private static instance: SemanticGroupSessionService;
  private sessions = new Map<string, SemanticGroupSession>();

  public static getInstance(): SemanticGroupSessionService {
    if (!SemanticGroupSessionService.instance) {
      SemanticGroupSessionService.instance = new SemanticGroupSessionService();
    }
    return SemanticGroupSessionService.instance;
  }

  public getSession(
    repositoryPath: string | undefined,
    selectedFiles: string[],
  ): SemanticGroupSession | undefined {
    if (!repositoryPath || selectedFiles.length === 0) {
      return undefined;
    }

    this.pruneExpiredSessions();

    const signature = this.buildSignature(selectedFiles);
    const normalizedRepo = this.normalizePath(repositoryPath);

    for (const session of this.sessions.values()) {
      if (
        this.normalizePath(session.repositoryPath) === normalizedRepo &&
        session.selectedFilesSignature === signature &&
        session.remainingGroups.length > 0
      ) {
        return {
          ...session,
          remainingGroups: [...session.remainingGroups],
        };
      }
    }

    return undefined;
  }

  public saveSession(
    repositoryPath: string,
    selectedFiles: string[],
    groups: SemanticCommitGroup[],
  ): SemanticGroupSession {
    const signature = this.buildSignature(selectedFiles);
    const normalizedRepo = this.normalizePath(repositoryPath);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        this.normalizePath(session.repositoryPath) === normalizedRepo &&
        session.selectedFilesSignature === signature
      ) {
        this.sessions.delete(sessionId);
      }
    }

    const session: SemanticGroupSession = {
      id: `semantic-group-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      repositoryPath,
      selectedFilesSignature: signature,
      remainingGroups: [...groups],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return {
      ...session,
      remainingGroups: [...session.remainingGroups],
    };
  }

  public consumeGroup(sessionId: string, groupId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return 0;
    }

    session.remainingGroups = session.remainingGroups.filter(
      (group) => group.id !== groupId,
    );
    session.updatedAt = Date.now();

    if (session.remainingGroups.length === 0) {
      this.sessions.delete(sessionId);
      return 0;
    }

    this.sessions.set(session.id, session);
    return session.remainingGroups.length;
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  private pruneExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.updatedAt > SESSION_TTL_MS) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private buildSignature(selectedFiles: string[]): string {
    return selectedFiles
      .map((file) => this.normalizePath(file))
      .filter(Boolean)
      .sort()
      .join("\n");
  }

  private normalizePath(filePath: string): string {
    return (filePath || "")
      .replace(/\\/g, "/")
      .replace(/^\.\//, "")
      .trim();
  }
}
