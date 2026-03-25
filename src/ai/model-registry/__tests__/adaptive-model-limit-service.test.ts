import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { AdaptiveModelLimitService } from "@/ai/model-registry/adaptive-model-limit-service";
import { stateManager } from "@/utils/state/state-manager";

const STORAGE_KEY = "model.registry.learnedInputLimits";

function createMockContext() {
  const globalStore = new Map<string, any>();
  const workspaceStore = new Map<string, any>();
  const secretStore = new Map<string, string>();

  return {
    globalState: {
      get<T>(key: string, defaultValue?: T): T | undefined {
        return globalStore.has(key) ? globalStore.get(key) : defaultValue;
      },
      async update(key: string, value: any) {
        if (value === undefined) {
          globalStore.delete(key);
        } else {
          globalStore.set(key, value);
        }
      },
    },
    workspaceState: {
      get<T>(key: string, defaultValue?: T): T | undefined {
        return workspaceStore.has(key) ? workspaceStore.get(key) : defaultValue;
      },
      async update(key: string, value: any) {
        if (value === undefined) {
          workspaceStore.delete(key);
        } else {
          workspaceStore.set(key, value);
        }
      },
    },
    secrets: {
      async get(key: string) {
        return secretStore.get(key);
      },
      async store(key: string, value: string) {
        secretStore.set(key, value);
      },
      async delete(key: string) {
        secretStore.delete(key);
      },
    },
  } as any;
}

describe("AdaptiveModelLimitService", () => {
  const service = AdaptiveModelLimitService.getInstance();

  beforeAll(() => {
    stateManager.initialize(createMockContext());
  });

  beforeEach(async () => {
    await stateManager.deleteGlobal(STORAGE_KEY);
  });

  it("records a learned limit", async () => {
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 250000);

    expect(
      service.getLearnedInputLimit("gemini", "gemini-2.5-flash"),
    ).toBe(250000);
  });

  it("keeps stricter learned limit when a looser value arrives", async () => {
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 250000);
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 300000);

    expect(
      service.getLearnedInputLimit("gemini", "gemini-2.5-flash"),
    ).toBe(250000);
  });

  it("updates when a stricter value arrives", async () => {
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 250000);
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 200000);

    expect(
      service.getLearnedInputLimit("gemini", "gemini-2.5-flash"),
    ).toBe(200000);
  });

  it("ignores unreasonable learned limits", async () => {
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 999);
    await service.recordLearnedInputLimit("gemini", "gemini-2.5-flash", 12000000);

    expect(
      service.getLearnedInputLimit("gemini", "gemini-2.5-flash"),
    ).toBeNull();
  });
});

