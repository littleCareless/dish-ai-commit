/**
 * Diff sample fixtures for testing.
 *
 * Provides pre-built diff strings covering common patterns:
 * single-file, multi-file, SVN-style, empty, and binary diffs.
 */

/** A single-file unified diff (git-style). */
export const SINGLE_FILE_DIFF = `diff --git a/src/utils/helper.ts b/src/utils/helper.ts
index abc1234..def5678 100644
--- a/src/utils/helper.ts
+++ b/src/utils/helper.ts
@@ -1,5 +1,6 @@
 import { format } from 'util';
+import { validate } from './validate';

 export function process(input: string): string {
-  return format(input);
+  const result = format(input);
+  return validate(result);
 }
`;

/** A multi-file unified diff with 3 changed files. */
export const MULTI_FILE_DIFF = `diff --git a/src/config.ts b/src/config.ts
index 1111111..2222222 100644
--- a/src/config.ts
+++ b/src/config.ts
@@ -1,3 +1,4 @@
 export const APP_NAME = 'test';
+export const VERSION = '2.0.0';
 export const DEBUG = false;
diff --git a/src/main.ts b/src/main.ts
index 3333333..4444444 100644
--- a/src/main.ts
+++ b/src/main.ts
@@ -1,4 +1,5 @@
 import { APP_NAME } from './config';
+import { VERSION } from './config';

 export function run() {
   console.log(APP_NAME);
diff --git a/src/utils.ts b/src/utils.ts
index 5555555..6666666 100644
--- a/src/utils.ts
+++ b/src/utils.ts
@@ -1,2 +1,2 @@
-export function noop() {}
+export function noop(): void {}
`;

/** An SVN-style diff. */
export const SVN_DIFF = `Index: src/utils/helper.ts
===================================================================
--- src/utils/helper.ts  (revision 100)
+++ src/utils/helper.ts  (working copy)
@@ -1,5 +1,6 @@
 import { format } from 'util';
+import { validate } from './validate';

 export function process(input: string): string {
-  return format(input);
+  const result = format(input);
+  return validate(result);
 }
`;

/** An empty diff (no changes). */
export const EMPTY_DIFF = "";

/** A binary file diff. */
export const BINARY_DIFF = `diff --git a/assets/logo.png b/assets/logo.png
Binary files /dev/null and b/assets/logo.png differ
`;

/**
 * All diff samples as a keyed collection for easy iteration in tests.
 */
export const ALL_DIFFS = {
  singleFile: SINGLE_FILE_DIFF,
  multiFile: MULTI_FILE_DIFF,
  svn: SVN_DIFF,
  empty: EMPTY_DIFF,
  binary: BINARY_DIFF,
} as const;
