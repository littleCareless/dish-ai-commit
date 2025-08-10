# TypeScript Best Practices for Dish AI Commit VSCode Extension

This document outlines the TypeScript best practices for the Dish AI Commit project. Adhering to these guidelines will help maintain code quality, readability, and consistency, which is crucial for our small development team.

## 1. Coding Style & Readability

Consistency is key. We use ESLint and Prettier to enforce a uniform style.

- **Naming Conventions:**
    - `PascalCase` for types, interfaces, enums, and classes.
    - `camelCase` for variables, functions, and methods.
    - `UPPER_SNAKE_CASE` for constants.
    - Prepend interfaces with `I` (e.g., `ICommitMessage`) is discouraged. Instead, name them clearly without the prefix (e.g., `CommitMessage`).

- **Modularity:**
    - Keep files small and focused on a single responsibility.
    - Use ES modules (`import`/`export`) for all new code.
    - Avoid default exports to promote consistency in imports: `import { MyClass } from './MyClass';` is preferred over `import MyClass from './MyClass';`.

- **Comments:**
    - Write comments for complex logic, not for what the code does. The code should be self-explanatory.
    - Use JSDoc for public functions and methods to enable better IntelliSense.

```typescript
/**
 * Generates a commit message using the selected AI provider.
 * @param diff The git diff to generate the message from.
 * @returns A promise that resolves to the generated commit message.
 */
async function generateCommitMessage(diff: string): Promise<string> {
  // implementation
}
```

## 2. Leveraging the Type System

TypeScript's power lies in its type system. Let's use it to its full potential.

- **Strict Mode:**
    - Always enable `strict: true` in `tsconfig.json`. This turns on a wide range of type-checking behavior that results in stronger guarantees of program correctness.

- **Avoid `any`:**
    - The `any` type is an escape hatch from the type system. Its use should be minimized.
    - If you truly have an unknown type, prefer `unknown` over `any` and perform type checking before using the value.

- **Use Specific Types:**
    - Prefer specific types over general ones. For example, use `string[]` instead of `Array<string>`.
    - Use `Readonly<T>` for function parameters that should not be mutated.
    - Use `enum` for a fixed set of constants.

```typescript
// Good
function processItems(items: readonly string[]) {
  // implementation
}

// Avoid
function processItems(items: Array<any>) {
  // implementation
}
```

## 3. Project Structure

A logical project structure is vital for maintainability. The current structure is good, let's stick to it.

- **Feature-based organization:** Group files by feature (e.g., `src/ai`, `src/commands`, `src/config`).
- **Clear separation:**
    - `src/extension.ts`: The main entry point of the extension.
    - `src/ai/`: All AI provider logic.
    - `src/commands/`: VSCode command implementations.
    - `src/config/`: Configuration management.
    - `src/scm/`: Source control management (Git/SVN) logic.
    - `src/webview-ui/`: All UI-related code for webviews.

## 4. Error Handling

A consistent error handling strategy is crucial for a stable extension.

- **Custom Error Classes:**
    - Create custom error classes that extend `Error` for different types of errors (e.g., `ApiError`, `ConfigError`). This allows for more specific error handling.

```typescript
class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'ApiError';
  }
}
```

- **Async/Await and `try...catch`:**
    - Use `async/await` for all asynchronous operations.
    - Wrap `await` calls in `try...catch` blocks to handle potential errors gracefully.
    - Avoid using `.then()` and `.catch()` for asynchronous operations unless necessary.

- **User-facing Errors:**
    - Use `vscode.window.showErrorMessage` to display user-facing errors. Provide clear and actionable messages.
    - Log the full error to the console for debugging purposes.

```typescript
try {
  const result = await someApiCall();
} catch (error) {
  console.error(error);
  if (error instanceof ApiError) {
    vscode.window.showErrorMessage(`API Error: ${error.message}`);
  } else {
    vscode.window.showErrorMessage('An unexpected error occurred.');
  }
}
```

## 5. Tooling and Automation

We already have a good set of tools. Let's ensure we use them effectively.

- **ESLint:** Keep the rules in `.eslintrc.json` up-to-date. Regularly review and add new rules that can improve code quality.
- **Vitest:** Write tests for all new features and bug fixes. Aim for a high test coverage.
- **`npm run lint`:** Run this command before every commit to catch issues early. The `lint-staged` setup helps automate this.
- **`npm run test`:** Run tests frequently during development.

## 6. VSCode Extension Specifics

- **Dispose of Disposables:**
    - Any object that implements the `Disposable` interface (e.g., command registrations, event listeners) must be added to the `context.subscriptions` array in `extension.ts`. This ensures they are cleaned up when the extension is deactivated.

- **Asynchronous Operations:**
    - The VSCode API is heavily asynchronous. Always use `async/await` and be mindful of the extension's activation and deactivation lifecycle.

- **Use VSCode's UI Components:**
    - Prefer using VSCode's built-in UI components (`QuickPick`, `InputBox`, notifications) for a consistent user experience.

- **Webviews:**
    - Keep the webview UI code separate from the extension's backend logic.
    - Use the provided messaging API to communicate between the webview and the extension.

By following these best practices, we can build a more robust, maintainable, and high-quality VSCode extension.