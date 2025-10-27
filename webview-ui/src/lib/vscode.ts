declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  setState: (state: any) => void;
  getState: () => any;
};

export const vscode =
  typeof acquireVsCodeApi !== "undefined" ? acquireVsCodeApi() : null;
