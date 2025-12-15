import * as fs from "fs";
import * as path from "path";
import * as lockfile from "proper-lockfile";
import Disassembler from "stream-json/Disassembler";
import Stringer from "stream-json/Stringer";
import { pipeline } from "stream/promises";

/**
 * Safely writes a JSON object to a file using file locks and atomic operations.
 * This function is designed to be robust against race conditions and partial writes.
 *
 * @param filePath The absolute path to the file.
 * @param data The JSON object to write.
 */
export async function safeWriteJson(
  filePath: string,
  data: any
): Promise<void> {
  const dirname = path.dirname(filePath);
  const tempFilePath = path.join(dirname, `.${path.basename(filePath)}.tmp`);

  let release;
  try {
    // Ensure the directory exists
    await fs.promises.mkdir(dirname, { recursive: true });

    // Acquire a lock on the original file path to prevent race conditions
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 5,
        factor: 3,
        minTimeout: 100,
        maxTimeout: 300,
        randomize: true,
      },
      onCompromised: (err) => {
        console.error("Lock was compromised:", err);
        throw new Error("Failed to maintain file lock.");
      },
    });

    // Create a readable stream from the data, stringify it, and write to a temp file
    const readable = new Stringer({
      makeArray: Array.isArray(data),
    });
    
    const writeStream = fs.createWriteStream(tempFilePath);
    
    // Push data to the readable stream
    readable.push(data);
    readable.push(null); // End the stream

    await pipeline(readable, writeStream);

    // Atomically move the temp file to the final destination
    await fs.promises.rename(tempFilePath, filePath);
  } catch (error) {
    // If anything fails, attempt to clean up the temp file
    try {
      await fs.promises.unlink(tempFilePath);
    } catch (cleanupError) {
      // Suppress cleanup error, but log it for debugging
      console.warn("Failed to clean up temporary file:", cleanupError);
    }
    throw error; // Re-throw the original error
  } finally {
    // Always release the lock
    if (release) {
      await release();
    }
  }
}
