import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { postMessage } from "@/utils/vscode";
import { readUIMessageStream, UIMessage, UIMessageChunk } from "ai";
import {
  CommitChatGetChangedFilesResponse,
  CommitChatSendMessageResponse,
  ExtensionResponse,
  UIRequest,
} from "@shared/types/messages";
import {
  ArrowUp,
  FileCode2,
  GitCommitHorizontal,
  Loader2,
  X,
} from "lucide-react";
import React from "react";

type CommitChatMetadata = {
  commitMessage?: string;
  suggestions?: string[];
  targetFiles?: string[];
};

type CommitChatUIMessage = UIMessage<CommitChatMetadata>;

const extractTextFromMessage = (message: CommitChatUIMessage): string => {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
};

const parseDroppedFiles = (
  event: React.DragEvent<HTMLDivElement>,
): string[] => {
  const uriList = event.dataTransfer.getData("text/uri-list");
  const textPlain = event.dataTransfer.getData("text/plain");
  const raw = `${uriList}\n${textPlain}`.trim();

  if (!raw) {
    return [];
  }

  const filePaths = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (line.startsWith("file://")) {
        try {
          return [decodeURIComponent(line.replace("file://", ""))];
        } catch {
          return [];
        }
      }

      if (line.includes("/") || line.includes("\\")) {
        return [line.replace(/^[A-Z]\s+/, "")];
      }

      return [];
    });

  return [...new Set(filePaths)];
};

const sendRequest = <TData,>(
  command: UIRequest,
  expectedResponse: ExtensionResponse,
  data?: unknown,
): Promise<TData> => {
  const requestId = `${command}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise<TData>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error(`Request timeout: ${command}`));
    }, 15000);

    const onMessage = (event: MessageEvent) => {
      const incoming = event.data;
      if (
        incoming?.command === expectedResponse &&
        incoming?.requestId === requestId
      ) {
        window.clearTimeout(timeout);
        window.removeEventListener("message", onMessage);
        resolve(incoming.data as TData);
      }
    };

    window.addEventListener("message", onMessage);

    postMessage(command, data, {
      allowDuplicate: true,
      requestId,
    });
  });
};

const CommitChatView: React.FC = () => {
  const [messages, setMessages] = React.useState<CommitChatUIMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [targetFiles, setTargetFiles] = React.useState<string[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const scrollBottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const appendDroppedFiles = React.useCallback((files: string[]) => {
    if (!files.length) {
      return;
    }
    setTargetFiles((prev) => [...new Set([...prev, ...files])]);
  }, []);

  const removeTargetFile = React.useCallback((file: string) => {
    setTargetFiles((prev) => prev.filter((item) => item !== file));
  }, []);

  const handleFetchChangedFiles = React.useCallback(async () => {
    const result = await sendRequest<CommitChatGetChangedFilesResponse>(
      UIRequest.CommitChatGetChangedFiles,
      ExtensionResponse.CommitChatChangedFilesLoaded,
    );
    appendDroppedFiles(result.files);
  }, [appendDroppedFiles]);

  const sendMessage = React.useCallback(async () => {
    const userInput = input.trim();
    if (!userInput || isPending) {
      return;
    }

    const userMessage: CommitChatUIMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: userInput }],
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsPending(true);

    try {
      const requestId = `${UIRequest.CommitChatSendMessage}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const textId = `text-${Date.now()}`;
      let controllerRef: ReadableStreamDefaultController<
        UIMessageChunk<CommitChatMetadata>
      > | null = null;
      let started = false;

      const stream = new ReadableStream<UIMessageChunk<CommitChatMetadata>>({
        start(controller) {
          controllerRef = controller;
        },
      });

      const completion = new Promise<CommitChatSendMessageResponse>(
        (resolve, reject) => {
          const timeout = window.setTimeout(() => {
            window.removeEventListener("message", onMessage);
            if (controllerRef) {
              controllerRef.enqueue({
                type: "error",
                errorText: "Request timeout.",
              });
              controllerRef.close();
            }
            reject(new Error("Request timeout."));
          }, 30000);

          const onMessage = (event: MessageEvent) => {
            const incoming = event.data;
            if (incoming?.requestId !== requestId) {
              return;
            }

            if (
              incoming?.command === ExtensionResponse.CommitChatStreamStarted &&
              controllerRef &&
              !started
            ) {
              started = true;
              controllerRef.enqueue({
                type: "start",
                messageMetadata: {
                  targetFiles,
                },
              });
              controllerRef.enqueue({ type: "text-start", id: textId });
              return;
            }

            if (
              incoming?.command === ExtensionResponse.CommitChatStreamDelta &&
              controllerRef
            ) {
              if (!started) {
                started = true;
                controllerRef.enqueue({
                  type: "start",
                  messageMetadata: {
                    targetFiles,
                  },
                });
                controllerRef.enqueue({ type: "text-start", id: textId });
              }
              controllerRef.enqueue({
                type: "text-delta",
                id: textId,
                delta: incoming.data?.delta || "",
              });
              return;
            }

            if (
              incoming?.command === ExtensionResponse.CommitChatStreamError &&
              controllerRef
            ) {
              window.clearTimeout(timeout);
              window.removeEventListener("message", onMessage);
              controllerRef.enqueue({
                type: "error",
                errorText: incoming.data?.error || "Streaming error.",
              });
              controllerRef.close();
              reject(new Error(incoming.data?.error || "Streaming error."));
              return;
            }

            if (
              incoming?.command === ExtensionResponse.CommitChatResponse &&
              controllerRef
            ) {
              window.clearTimeout(timeout);
              window.removeEventListener("message", onMessage);
              if (!started) {
                started = true;
                controllerRef.enqueue({
                  type: "start",
                  messageMetadata: {
                    targetFiles,
                  },
                });
                controllerRef.enqueue({ type: "text-start", id: textId });
                if (incoming.data?.reply) {
                  controllerRef.enqueue({
                    type: "text-delta",
                    id: textId,
                    delta: incoming.data.reply,
                  });
                }
              }
              controllerRef.enqueue({ type: "text-end", id: textId });
              controllerRef.enqueue({
                type: "finish",
                finishReason: "stop",
                messageMetadata: {
                  commitMessage: incoming.data?.commitMessage,
                  suggestions: incoming.data?.suggestions,
                  targetFiles: incoming.data?.targetFiles || targetFiles,
                },
              });
              controllerRef.close();
              resolve(incoming.data as CommitChatSendMessageResponse);
            }
          };

          window.addEventListener("message", onMessage);
          postMessage(
            UIRequest.CommitChatSendMessage,
            {
              messages: [...messages, userMessage].map((msg) => ({
                role: msg.role === "assistant" ? "assistant" : "user",
                content: extractTextFromMessage(msg),
              })),
              targetFiles,
            },
            {
              allowDuplicate: true,
              requestId,
            },
          );
        },
      );

      let currentAssistantId: string | null = null;

      for await (const message of readUIMessageStream<CommitChatUIMessage>({
        stream,
      })) {
        if (!currentAssistantId) {
          currentAssistantId = message.id;
          setMessages((prev) => [...prev, message]);
          continue;
        }

        setMessages((prev) =>
          prev.map((item) => (item.id === currentAssistantId ? message : item)),
        );
      }

      await completion;
    } catch (error) {
      const errorMessage: CommitChatUIMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text:
              error instanceof Error
                ? error.message
                : "Failed to get response.",
          },
        ],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsPending(false);
    }
  }, [input, isPending, messages, targetFiles]);

  const handleDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      appendDroppedFiles(parseDroppedFiles(event));
    },
    [appendDroppedFiles],
  );

  return (
    <div className="h-full p-4">
      <div
        className={`flex h-full flex-col rounded-xl border bg-card ${
          isDragging ? "border-primary ring-2 ring-primary/30" : ""
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <GitCommitHorizontal className="h-4 w-4" />
            Commit Chat
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchChangedFiles}
          >
            Add Changed Files
          </Button>
        </div>

        {targetFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b px-4 py-2">
            {targetFiles.map((file) => (
              <Badge key={file} variant="secondary" className="gap-1">
                <FileCode2 className="h-3 w-3" />
                {file}
                <button
                  type="button"
                  className="ml-1 opacity-70 hover:opacity-100"
                  onClick={() => removeTargetFile(file)}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1 px-4 py-3">
          <div className="space-y-3">
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Ask for a commit message, and drag files from the SCM diff list
                into this panel to focus on specific files.
              </div>
            )}

            {messages.map((message) => {
              const isAssistant = message.role === "assistant";
              const content = extractTextFromMessage(message);

              return (
                <div
                  key={message.id}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    isAssistant
                      ? "border-primary/20 bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {isAssistant ? "Assistant" : "You"}
                  </div>
                  <div className="whitespace-pre-wrap">{content}</div>
                  {isAssistant && message.metadata?.commitMessage && (
                    <div className="mt-3 rounded-md border bg-background p-2 font-mono text-xs">
                      {message.metadata.commitMessage}
                    </div>
                  )}
                </div>
              );
            })}

            {isPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </div>
            )}
            <div ref={scrollBottomRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <Input
              value={input}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setInput(event.target.value)
              }
              placeholder="Describe your changes and intent..."
              onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void sendMessage()}
              disabled={isPending || !input.trim()}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommitChatView;
