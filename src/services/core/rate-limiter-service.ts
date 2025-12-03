import { Logger } from "@/utils/logger";

interface RateLimitState {
    timestamps: number[];
}

export class RateLimiterService {
    private static instance: RateLimiterService;
    private logger: Logger;
    private states: Map<string, RateLimitState> = new Map();

    private constructor() {
        this.logger = Logger.getInstance("RateLimiterService");
    }

    public static getInstance(): RateLimiterService {
        if (!RateLimiterService.instance) {
            RateLimiterService.instance = new RateLimiterService();
        }
        return RateLimiterService.instance;
    }

    /**
     * Acquire a token for a request. If the limit is reached, this method will wait
     * until a token becomes available.
     * 
     * @param providerId The ID of the provider (e.g., "openai", "anthropic")
     * @param maxRequests Maximum number of requests allowed in the window
     * @param windowSeconds Time window in seconds
     * @param onWait Optional callback to notify when waiting starts
     */
    public async acquire(
        providerId: string,
        maxRequests: number,
        windowSeconds: number,
        onWait?: (waitTimeMs: number) => void
    ): Promise<void> {
        if (maxRequests <= 0 || windowSeconds <= 0) {
            return; // No rate limiting
        }

        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        const windowStart = now - windowMs;

        let state = this.states.get(providerId);
        if (!state) {
            state = { timestamps: [] };
            this.states.set(providerId, state);
        }

        // Clean up old timestamps
        state.timestamps = state.timestamps.filter(t => t > windowStart);

        if (state.timestamps.length >= maxRequests) {
            // Limit reached, calculate wait time
            const oldestTimestamp = state.timestamps[0];
            const waitTimeMs = windowMs - (now - oldestTimestamp) + 100; // Add small buffer

            this.logger.info(`Rate limit reached for ${providerId}. Waiting ${waitTimeMs}ms.`);

            if (onWait) {
                onWait(waitTimeMs);
            }

            await new Promise(resolve => setTimeout(resolve, waitTimeMs));

            // Recursive call to re-check and acquire (in case multiple requests were waiting)
            return this.acquire(providerId, maxRequests, windowSeconds, onWait);
        }

        // Acquire token
        state.timestamps.push(Date.now());
        this.logger.debug(`Token acquired for ${providerId}. Current usage: ${state.timestamps.length}/${maxRequests}`);
    }
}
