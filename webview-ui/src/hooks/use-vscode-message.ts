import { useLayoutEffect } from "react";

export function useVSCodeMessage<T = unknown>(
  command: string,
  handler: (payload: T) => void,
) {
  // Use layout effect so listeners are ready before mount-time fetch effects.
  useLayoutEffect(() => {
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
