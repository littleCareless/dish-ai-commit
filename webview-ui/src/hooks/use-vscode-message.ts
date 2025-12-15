import { useEffect } from "react";

export function useVSCodeMessage<T = unknown>(
  command: string,
  handler: (payload: T) => void,
) {
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.command === command) {
        handler(event.data as T);
      }
    };

    window.addEventListener("message", messageHandler);

    return () => {
      window.removeEventListener("message", messageHandler);
    };
  }, [command, handler]);
}
