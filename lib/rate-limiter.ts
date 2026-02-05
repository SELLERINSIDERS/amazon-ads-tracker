/**
 * Token Bucket Rate Limiter for Amazon Advertising API
 *
 * Amazon API limits:
 * - 10 req/sec burst limit
 * - 2 req/sec sustained rate (tokens regenerate at this rate)
 */

interface RateLimiterConfig {
  maxTokens: number // Maximum bucket size (burst limit)
  refillRate: number // Tokens added per second (sustained rate)
}

export class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number
  private lastRefill: number
  private queue: Array<{
    resolve: () => void
    reject: (error: Error) => void
  }> = []

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens
    this.refillRate = config.refillRate
    this.tokens = config.maxTokens // Start with full bucket
    this.lastRefill = Date.now()
  }

  private refill(): void {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000 // Convert to seconds
    const tokensToAdd = elapsed * this.refillRate

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  private processQueue(): void {
    while (this.queue.length > 0 && this.tokens >= 1) {
      const request = this.queue.shift()
      if (request) {
        this.tokens -= 1
        request.resolve()
      }
    }
  }

  /**
   * Acquire a token to make a request.
   * Returns immediately if a token is available, otherwise waits.
   */
  async acquire(): Promise<void> {
    this.refill()

    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }

    // No tokens available, add to queue
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject })

      // Set up periodic check for token availability
      const checkInterval = setInterval(() => {
        this.refill()
        if (this.tokens >= 1) {
          clearInterval(checkInterval)
          this.processQueue()
        }
      }, 100) // Check every 100ms

      // Timeout after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval)
        const index = this.queue.findIndex((q) => q.resolve === resolve)
        if (index !== -1) {
          this.queue.splice(index, 1)
          reject(new Error('Rate limit timeout: request queued too long'))
        }
      }, 30000)
    })
  }

  /**
   * Get current token count (for debugging/monitoring)
   */
  getTokenCount(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /**
   * Get queue length (for debugging/monitoring)
   */
  getQueueLength(): number {
    return this.queue.length
  }
}

// Create default rate limiter for Amazon API
// 10 req/sec burst, 2 req/sec sustained
export const amazonRateLimiter = new RateLimiter({
  maxTokens: 10,
  refillRate: 2,
})

/**
 * Execute a function with rate limiting
 */
export async function withRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await amazonRateLimiter.acquire()
  return fn()
}
