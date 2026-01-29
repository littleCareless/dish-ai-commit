import { Logger } from "@/utils/logger";

export class GenerationGate {
  private static instance: GenerationGate;
  private inFlight = new Map<string, Promise<any>>();
  private logger = Logger.getInstance("GenerationGate");

  private constructor() {}

  static getInstance(): GenerationGate {
    if (!GenerationGate.instance) {
      GenerationGate.instance = new GenerationGate();
    }
    return GenerationGate.instance;
  }

  async run<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (this.inFlight.has(key)) {
      this.logger.info("[GenerationGate] HIT - Reusing in-flight generation", {
        data: { key },
      });
      return this.inFlight.get(key)! as Promise<T>;
    }

    const promise = task().finally(() => {
      this.inFlight.delete(key);
      this.logger.info("[GenerationGate] Task completed", { data: { key } });
    });

    this.inFlight.set(key, promise);
    this.logger.info("[GenerationGate] Task started", { data: { key } });
    return promise;
  }

  static generateKey(
    repoPath: string,
    feature: string,
    changeHash: string,
  ): string {
    return `${repoPath}:${feature}:${changeHash}`;
  }

  hasInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  clear(): void {
    this.inFlight.clear();
    this.logger.info("[GenerationGate] All tasks cleared");
  }
}
