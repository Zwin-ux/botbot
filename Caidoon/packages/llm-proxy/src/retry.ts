/**
 * Retry logic with exponential backoff for OpenAI API calls
 */

export interface RetryOptions {
  maxRetries: number;
  delays: number[]; // Delay in milliseconds for each retry
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  delays: [1000, 2000, 4000], // 1s, 2s, 4s
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
  logger?: (message: string) => void
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, throw the error
      if (attempt === options.maxRetries) {
        if (logger) {
          logger(`All ${options.maxRetries} retry attempts failed: ${lastError.message}`);
        }
        throw lastError;
      }

      // Get the delay for this retry attempt
      const delay = options.delays[attempt] || options.delays[options.delays.length - 1];

      if (logger) {
        logger(
          `Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`
        );
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
