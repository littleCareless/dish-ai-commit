declare interface Window {
  vscode?: {
    postMessage: (message: any) => void;
  };
}