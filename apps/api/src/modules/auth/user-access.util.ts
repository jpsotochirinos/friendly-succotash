import { UnauthorizedException } from '@nestjs/common';
import type { User } from '@tracker/db';

/** If temporary disable expired, re-activate. Returns whether the entity was mutated (caller should flush). */
export function clearExpiredUserDisable(user: User): boolean {
  const now = new Date();
  if (user.disabledUntil && user.disabledUntil <= now) {
    user.disabledUntil = null;
    user.isActive = true;
    return true;
  }
  return false;
}

export function assertUserCanAuthenticate(user: User): void {
  const now = new Date();
  if (user.disabledUntil && user.disabledUntil > now) {
    throw new UnauthorizedException('Account temporarily disabled');
  }
  if (!user.isActive) {
    throw new UnauthorizedException('Account disabled');
  }
}
