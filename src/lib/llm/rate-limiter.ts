import { createServiceRoleClient } from "@/lib/supabase/server";
import { RateLimitInfo } from "@/types";

interface RateLimitConfig {
  rpm: number;
  rpd: number;
  tpm: number;
}

interface SlidingWindowResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Sliding window rate limiter implementation.
 * Uses a combination of fixed windows with weighted overlap
 * for smooth rate limiting behavior.
 */
export class RateLimiter {
  private supabase = createServiceRoleClient();

  /**
   * Check and record a request against all rate limits.
   * Returns rate limit info if allowed, throws if exceeded.
   */
  async checkRateLimit(
    keyId: string,
    config: RateLimitConfig,
    tokenCount: number = 0
  ): Promise<RateLimitInfo> {
    const now = new Date();

    // Check requests per minute
    const rpmResult = await this.slidingWindowCheck(
      `rpm:${keyId}`,
      60,
      config.rpm,
      now
    );

    if (!rpmResult.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded: ${config.rpm} requests per minute`,
        rpmResult.resetAt
      );
    }

    // Check requests per day
    const rpdResult = await this.slidingWindowCheck(
      `rpd:${keyId}`,
      86400,
      config.rpd,
      now
    );

    if (!rpdResult.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded: ${config.rpd} requests per day`,
        rpdResult.resetAt
      );
    }

    // Check tokens per minute
    const tpmResult = await this.slidingWindowCheck(
      `tpm:${keyId}`,
      60,
      config.tpm,
      now,
      tokenCount
    );

    if (!tpmResult.allowed) {
      throw new RateLimitError(
        `Rate limit exceeded: ${config.tpm} tokens per minute`,
        tpmResult.resetAt
      );
    }

    // Record the request
    await this.recordRequest(`rpm:${keyId}`, 60, now, 1);
    await this.recordRequest(`rpd:${keyId}`, 86400, now, 1);
    if (tokenCount > 0) {
      await this.recordRequest(`tpm:${keyId}`, 60, now, tokenCount);
    }

    return {
      remaining_rpm: rpmResult.remaining,
      remaining_rpd: rpdResult.remaining,
      remaining_tpm: tpmResult.remaining,
      reset_at: rpmResult.resetAt.toISOString(),
    };
  }

  /**
   * Sliding window rate limit check.
   * Calculates the weighted count across the current and previous windows.
   */
  private async slidingWindowCheck(
    key: string,
    windowSizeSeconds: number,
    limit: number,
    now: Date,
    incrementBy: number = 1
  ): Promise<SlidingWindowResult> {
    const currentWindowStart = new Date(
      Math.floor(now.getTime() / (windowSizeSeconds * 1000)) *
        windowSizeSeconds *
        1000
    );
    const previousWindowStart = new Date(
      currentWindowStart.getTime() - windowSizeSeconds * 1000
    );

    // Get counts for current and previous windows
    const { data: windows } = await this.supabase
      .from("rate_limit_windows")
      .select("window_start, request_count, token_count")
      .eq("key", key)
      .eq("window_size_seconds", windowSizeSeconds)
      .in("window_start", [
        currentWindowStart.toISOString(),
        previousWindowStart.toISOString(),
      ]);

    const currentWindow = windows?.find(
      (w) => new Date(w.window_start).getTime() === currentWindowStart.getTime()
    );
    const previousWindow = windows?.find(
      (w) => new Date(w.window_start).getTime() === previousWindowStart.getTime()
    );

    const currentCount = currentWindow?.request_count || 0;
    const previousCount = previousWindow?.request_count || 0;

    // Calculate the overlap weight (how far we are into the current window)
    const elapsedInWindow =
      (now.getTime() - currentWindowStart.getTime()) / (windowSizeSeconds * 1000);
    const previousWeight = 1 - elapsedInWindow;

    // Weighted count = previous * (1 - elapsed%) + current
    const weightedCount =
      Math.floor(previousCount * previousWeight) + currentCount + incrementBy;

    const resetAt = new Date(
      currentWindowStart.getTime() + windowSizeSeconds * 1000
    );

    return {
      allowed: weightedCount <= limit,
      remaining: Math.max(0, limit - weightedCount),
      resetAt,
    };
  }

  /**
   * Record a request in the sliding window.
   */
  private async recordRequest(
    key: string,
    windowSizeSeconds: number,
    now: Date,
    count: number
  ): Promise<void> {
    const windowStart = new Date(
      Math.floor(now.getTime() / (windowSizeSeconds * 1000)) *
        windowSizeSeconds *
        1000
    );

    await this.supabase.rpc("increment_rate_limit", {
      p_key: key,
      p_window_start: windowStart.toISOString(),
      p_window_size: windowSizeSeconds,
      p_count: count,
    });
  }
}

export class RateLimitError extends Error {
  resetAt: Date;

  constructor(message: string, resetAt: Date) {
    super(message);
    this.name = "RateLimitError";
    this.resetAt = resetAt;
  }
}
