import { ContextLengthExceededError } from "@/ai/types";
import { ContextManager, RequestTooLargeError } from "@/utils/context-manager";
import { notify } from "@/utils/notification";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/utils/notification", () => ({
  notify: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

function createManagerStub() {
  const manager = Object.create(ContextManager.prototype) as ContextManager;
  (manager as any).buildMessages = vi.fn(() => [
    { role: "system", content: "system" },
    { role: "user", content: "user" },
  ]);
  (manager as any).smartTruncate = vi.fn(() => true);
  return manager;
}

describe("ContextManager executeWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retries with smart truncation when context length exceeds in non-streaming request", async () => {
    const manager = createManagerStub();
    const executeRequest = vi
      .fn()
      .mockRejectedValueOnce(new ContextLengthExceededError("too long"))
      .mockResolvedValueOnce({ content: "feat: retry-success" });

    const result = await manager.executeWithRetry(
      {
        diff: "mock-diff",
        additionalContext: "",
      },
      executeRequest,
      3,
    );

    expect(result).toEqual({ content: "feat: retry-success" });
    expect(executeRequest).toHaveBeenCalledTimes(2);
    expect((manager as any).smartTruncate).toHaveBeenCalledTimes(1);
    expect(notify.warn).toHaveBeenCalledTimes(1);
  });

  it("throws RequestTooLargeError when truncation cannot reduce context", async () => {
    const manager = createManagerStub();
    (manager as any).smartTruncate = vi.fn(() => false);

    await expect(
      manager.executeWithRetry(
        {
          diff: "mock-diff",
          additionalContext: "",
        },
        vi.fn().mockRejectedValueOnce(new ContextLengthExceededError("too long")),
        3,
      ),
    ).rejects.toBeInstanceOf(RequestTooLargeError);
  });
});
