import { prisma } from './prisma'
import type { SafetyLimit } from '@prisma/client'

export interface ValidationResult {
  valid: boolean
  error?: string
}

// Get or create safety limits (single row per installation)
export async function getSafetyLimits(): Promise<SafetyLimit> {
  let limits = await prisma.safetyLimit.findFirst()

  if (!limits) {
    // Create default limits
    limits = await prisma.safetyLimit.create({
      data: {
        maxBidChangePct: 50,
        maxBudgetChangePct: 100,
        minBidFloor: 0.02,
        maxBidCeiling: 100,
      },
    })
  }

  return limits
}

// Update safety limits
export async function updateSafetyLimits(
  updates: Partial<Omit<SafetyLimit, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SafetyLimit> {
  const existing = await getSafetyLimits()

  return prisma.safetyLimit.update({
    where: { id: existing.id },
    data: updates,
  })
}

// Validate a bid change against safety limits
export function validateBidChange(
  currentBid: number,
  newBid: number,
  limits: SafetyLimit
): ValidationResult {
  // Check minimum bid floor
  if (newBid < limits.minBidFloor) {
    return {
      valid: false,
      error: `Bid $${newBid.toFixed(2)} is below minimum floor of $${limits.minBidFloor.toFixed(2)}`,
    }
  }

  // Check maximum bid ceiling
  if (newBid > limits.maxBidCeiling) {
    return {
      valid: false,
      error: `Bid $${newBid.toFixed(2)} exceeds maximum ceiling of $${limits.maxBidCeiling.toFixed(2)}`,
    }
  }

  // Check percentage change
  if (currentBid > 0) {
    const changePercent = Math.abs((newBid - currentBid) / currentBid) * 100
    if (changePercent > limits.maxBidChangePct) {
      return {
        valid: false,
        error: `Bid change of ${changePercent.toFixed(1)}% exceeds maximum allowed change of ${limits.maxBidChangePct}%`,
      }
    }
  }

  return { valid: true }
}

// Validate a budget change against safety limits
export function validateBudgetChange(
  currentBudget: number,
  newBudget: number,
  limits: SafetyLimit
): ValidationResult {
  // Check daily spend limit
  if (limits.maxDailySpend !== null && newBudget > limits.maxDailySpend) {
    return {
      valid: false,
      error: `Budget $${newBudget.toFixed(2)} exceeds maximum daily spend limit of $${limits.maxDailySpend.toFixed(2)}`,
    }
  }

  // Check percentage change
  if (currentBudget > 0) {
    const changePercent = Math.abs((newBudget - currentBudget) / currentBudget) * 100
    if (changePercent > limits.maxBudgetChangePct) {
      return {
        valid: false,
        error: `Budget change of ${changePercent.toFixed(1)}% exceeds maximum allowed change of ${limits.maxBudgetChangePct}%`,
      }
    }
  }

  return { valid: true }
}

// Validate that a value is within absolute limits
export function validateAbsoluteBid(
  bid: number,
  limits: SafetyLimit
): ValidationResult {
  if (bid < limits.minBidFloor) {
    return {
      valid: false,
      error: `Bid $${bid.toFixed(2)} is below minimum floor of $${limits.minBidFloor.toFixed(2)}`,
    }
  }

  if (bid > limits.maxBidCeiling) {
    return {
      valid: false,
      error: `Bid $${bid.toFixed(2)} exceeds maximum ceiling of $${limits.maxBidCeiling.toFixed(2)}`,
    }
  }

  return { valid: true }
}
