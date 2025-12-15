declare namespace JSX {
  interface IntrinsicElements {
    "vscode-label": any;
    "vscode-button": any;
    "vscode-text-field": any;
    "vscode-dropdown": any;
    // 其他你需要的 vscode-* 元素
  }
}

interface Window {
  initialData: {
    language?: string;
    localesBaseUri?: string;
    qdrantUrl?: string;
    qdrantCollectionName?: string;
  };
  initialRoute?: string;
}
