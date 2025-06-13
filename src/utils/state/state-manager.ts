import * as vscode from 'vscode';

/**
 * Manages the state for the VSCode extension.
 * This includes global state, workspace state, and secret storage.
 * It ensures that states are only accessed after the extension is initialized.
 */
class StateManager {
  private static instance: StateManager;
  private _context: vscode.ExtensionContext | undefined;

  private constructor() {
    // Private constructor to ensure singleton instance
  }

  /**
   * Gets the singleton instance of the StateManager.
   * @returns The singleton instance of StateManager.
   */
  public static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  /**
   * Initializes the StateManager with the extension context.
   * This method must be called once during extension activation.
   * @param context - The extension context provided by VSCode.
   */
  public initialize(context: vscode.ExtensionContext): void {
    if (this._context) {
      console.warn('StateManager is already initialized.');
      return;
    }
    this._context = context;
  }

  private get context(): vscode.ExtensionContext {
    if (!this._context) {
      throw new Error('StateManager not initialized. Call initialize(context) first.');
    }
    return this._context;
  }

  // --- Global State Methods ---

  /**
   * Retrieves a value from the global state.
   * @template T - The type of the value to retrieve.
   * @param key - The key of the value to retrieve.
   * @param defaultValue - An optional default value to return if the key is not found.
   * @returns The retrieved value or the default value if provided and the key is not found.
   *
   * @example
   * // Get a string value, or 'defaultString' if not set
   * const myString = stateManager.getGlobal<string>('myGlobalKey', 'defaultString');
   *
   * // Get a number value (will be undefined if not set and no default is provided)
   * const myNumber = stateManager.getGlobal<number>('myNumericKey');
   */
  public getGlobal<T>(key: string): T | undefined;
  public getGlobal<T>(key: string, defaultValue: T): T;
  public getGlobal<T>(key: string, defaultValue?: T): T | undefined {
    return this.context.globalState.get<T>(key, defaultValue as T);
  }

  /**
   * Stores a value in the global state.
   * @template T - The type of the value to store.
   * @param key - The key under which to store the value.
   * @param value - The value to store.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * // Set a string value
   * await stateManager.setGlobal('myGlobalKey', 'hello world');
   *
   * // Set a complex object
   * await stateManager.setGlobal('myComplexObject', { id: 1, name: 'test' });
   */
  public async setGlobal<T>(key: string, value: T): Promise<void> {
    return this.context.globalState.update(key, value);
  }

  /**
   * Deletes a value from the global state.
   * @param key - The key of the value to delete.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * await stateManager.deleteGlobal('myGlobalKey');
   */
  public async deleteGlobal(key: string): Promise<void> {
    return this.context.globalState.update(key, undefined);
  }

  // --- Workspace State Methods ---

  /**
   * Retrieves a value from the workspace state.
   * @template T - The type of the value to retrieve.
   * @param key - The key of the value to retrieve.
   * @param defaultValue - An optional default value to return if the key is not found.
   * @returns The retrieved value or the default value if provided and the key is not found.
   *
   * @example
   * // Get a boolean value, or false if not set
   * const myFlag = stateManager.getWorkspace<boolean>('myWorkspaceFlag', false);
   *
   * // Get an array (will be undefined if not set and no default is provided)
   * const myList = stateManager.getWorkspace<string[]>('myWorkspaceList');
   */
  public getWorkspace<T>(key: string): T | undefined;
  public getWorkspace<T>(key: string, defaultValue: T): T;
  public getWorkspace<T>(key: string, defaultValue?: T): T | undefined {
    return this.context.workspaceState.get<T>(key, defaultValue as T);
  }

  /**
   * Stores a value in the workspace state.
   * @template T - The type of the value to store.
   * @param key - The key under which to store the value.
   * @param value - The value to store.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * // Set a number value
   * await stateManager.setWorkspace('myCounter', 123);
   *
   * // Set a configuration object
   * await stateManager.setWorkspace('userPreferences', { theme: 'dark', fontSize: 14 });
   */
  public async setWorkspace<T>(key: string, value: T): Promise<void> {
    return this.context.workspaceState.update(key, value);
  }

  /**
   * Deletes a value from the workspace state.
   * @param key - The key of the value to delete.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * await stateManager.deleteWorkspace('myWorkspaceFlag');
   */
  public async deleteWorkspace(key: string): Promise<void> {
    return this.context.workspaceState.update(key, undefined);
  }

  // --- Secret Storage Methods ---

  /**
   * Retrieves a secret value from the secret storage.
   * @param key - The key of the secret to retrieve.
   * @returns A Thenable that resolves to the secret string, or undefined if not found.
   *
   * @example
   * // Get an API token
   * const apiToken = await stateManager.getSecret('myApiToken');
   * if (apiToken) {
   *   // Use the token
   * }
   */
  public async getSecret(key: string): Promise<string | undefined> {
    return this.context.secrets.get(key);
  }

  /**
   * Stores a secret value in the secret storage.
   * @param key - The key under which to store the secret.
   * @param value - The secret string to store.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * // Store an API token
   * await stateManager.setSecret('myApiToken', 'supersecretvalue');
   */
  public async setSecret(key: string, value: string): Promise<void> {
    return this.context.secrets.store(key, value);
  }

  /**
   * Deletes a secret value from the secret storage.
   * @param key - The key of the secret to delete.
   * @returns A Thenable that resolves when the operation is complete.
   *
   * @example
   * // Delete an API token
   * await stateManager.deleteSecret('myApiToken');
   */
  public async deleteSecret(key: string): Promise<void> {
    return this.context.secrets.delete(key);
  }
}

// Export a singleton instance for easy use across the extension
export const stateManager = StateManager.getInstance();

/*
// --- Example Usage (typically in your extension.ts activate function) ---

import * as vscode from 'vscode';
import { stateManager } from './path/to/StateManager'; // Adjust path as needed

export function activate(context: vscode.ExtensionContext) {
  // Initialize the StateManager
  stateManager.initialize(context);

  // --- Global State Example ---
  // Set a global value
  stateManager.setGlobal('userGreeting', 'Hello from My Extension!');

  // Get a global value (with a default if not found)
  const greeting = stateManager.getGlobal<string>('userGreeting', 'Default Greeting');
  console.log('Global Greeting:', greeting);

  // Delete a global value
  // stateManager.deleteGlobal('userGreeting');


  // --- Workspace State Example ---
  // Set a workspace-specific value
  stateManager.setWorkspace('currentProjectVersion', '1.0.2');

  // Get a workspace value
  const projectVersion = stateManager.getWorkspace<string>('currentProjectVersion');
  if (projectVersion) {
    console.log('Current Project Version:', projectVersion);
  }

  // Delete a workspace value
  // stateManager.deleteWorkspace('currentProjectVersion');


  // --- Secret Storage Example ---
  async function manageSecrets() {
    // Store a secret (e.g., an API key)
    await stateManager.setSecret('myApiKey', 'verySecureKey123');
    console.log('Secret stored.');

    // Retrieve the secret
    const apiKey = await stateManager.getSecret('myApiKey');
    if (apiKey) {
      console.log('Retrieved API Key:', apiKey);
    } else {
      console.log('API Key not found.');
    }

    // Delete the secret
    // await stateManager.deleteSecret('myApiKey');
    // console.log('Secret deleted.');
  }

  manageSecrets().catch(console.error);
}

export function deactivate() {
  // Cleanup if needed
}
*/