/**
 * Idea Expiry Logic
 * Ideas expire after 30 days, resetting likes/dislikes to keep the feed fresh
 */

export const IDEA_EXPIRY_DAYS = 30;
export const IDEA_EXPIRY_MS = IDEA_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface IdeaWithExpiry {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
  daysRemaining: number;
}

/**
 * Calculate expiry date from creation date
 */
export function calculateExpiryDate(createdAt: Date): Date {
  return new Date(createdAt.getTime() + IDEA_EXPIRY_MS);
}

/**
 * Check if an idea has expired
 */
export function isIdeaExpired(createdAt: Date): boolean {
  const expiresAt = calculateExpiryDate(createdAt);
  return new Date() > expiresAt;
}

/**
 * Get days remaining until expiry
 */
export function getDaysRemaining(createdAt: Date): number {
  const expiresAt = calculateExpiryDate(createdAt);
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 0;

  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

/**
 * Format expiry text for display
 */
export function formatExpiryText(createdAt: Date): string {
  const daysRemaining = getDaysRemaining(createdAt);

  if (daysRemaining === 0) return "Expired";
  if (daysRemaining === 1) return "Expires tomorrow";
  if (daysRemaining <= 7) return `Expires in ${daysRemaining} days`;

  return `Expires in ${daysRemaining} days`;
}

/**
 * Get expiry status with color coding
 */
export function getExpiryStatus(createdAt: Date): {
  text: string;
  color: "green" | "yellow" | "red";
  daysRemaining: number;
} {
  const daysRemaining = getDaysRemaining(createdAt);

  if (daysRemaining === 0) {
    return { text: "Expired", color: "red", daysRemaining };
  }

  if (daysRemaining <= 7) {
    return { text: `${daysRemaining}d left`, color: "red", daysRemaining };
  }

  if (daysRemaining <= 14) {
    return { text: `${daysRemaining}d left`, color: "yellow", daysRemaining };
  }

  return { text: `${daysRemaining}d left`, color: "green", daysRemaining };
}

/**
 * Filter out expired ideas from feed
 */
export function filterExpiredIdeas<T extends { createdAt: Date }>(ideas: T[]): T[] {
  return ideas.filter((idea) => !isIdeaExpired(idea.createdAt));
}

/**
 * Sort ideas by expiry (soonest first) for urgency
 */
export function sortByExpiry<T extends { createdAt: Date }>(ideas: T[]): T[] {
  return [...ideas].sort((a, b) => {
    const aDays = getDaysRemaining(a.createdAt);
    const bDays = getDaysRemaining(b.createdAt);
    return aDays - bDays;
  });
}

/**
 * Check if idea can be renewed (must be within 7 days of expiry or expired)
 */
export function canRenewIdea(createdAt: Date): boolean {
  const daysRemaining = getDaysRemaining(createdAt);
  return daysRemaining <= 7;
}

/**
 * Calculate new expiry date for renewal (adds another 30 days from now)
 */
export function renewIdea(): Date {
  return calculateExpiryDate(new Date());
}
