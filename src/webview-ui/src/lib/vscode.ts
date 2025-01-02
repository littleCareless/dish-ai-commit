import type { WebviewApi } from "vscode-webview";

/**
 * 1. 暴露VSCode API给webview层调用
 * 2. webview层与extension context的数据传递
 */
class VSCodeAPIWrapper {
  private readonly vsCodeApi: WebviewApi<unknown> | undefined;

  constructor() {
    if (typeof acquireVsCodeApi === "function") {
      this.vsCodeApi = acquireVsCodeApi();
    }
  }

  /**
   * 发送data给插件上下文
   */
  public postMessage(message: unknown) {
    if (this.vsCodeApi) {
      this.vsCodeApi.postMessage(message);
    } else {
      console.log(message);
    }
  }

  /**
   * 获取数据，如果是web browser环境则直接从localStorage取
   */
  public getState(): unknown | undefined {
    if (this.vsCodeApi) {
      return this.vsCodeApi.getState();
    } else {
      const state = localStorage.getItem("vscodeState");
      return state ? JSON.parse(state) : undefined;
    }
  }

  /**
   * 数据持久化存储，如果是web browser环境则直接调用localStorage.setItem()
   */
  public setState<T extends unknown | undefined>(newState: T): T {
    if (this.vsCodeApi) {
      return this.vsCodeApi.setState(newState);
    } else {
      localStorage.setItem("vscodeState", JSON.stringify(newState));
      return newState;
    }
  }
}

// 导出API
export const vscode = new VSCodeAPIWrapper();
