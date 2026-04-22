import { Injectable, ConflictException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { User } from '@tracker/db';
import * as bcrypt from 'bcrypt';
import { BaseCrudService } from '../../common/services/base-crud.service';

@Injectable()
export class UsersService extends BaseCrudService<User> {
  constructor(em: EntityManager) {
    super(em, User);
  }

  async createUser(data: {
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    roleId?: string;
    organizationId: string;
  }): Promise<User> {
    const existing = await this.em.findOne(User, { email: data.email }, { filters: false });
    if (existing) throw new ConflictException('Email already in use');

    const user = this.em.create(User, {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.password ? await bcrypt.hash(data.password, 12) : undefined,
      role: data.roleId || undefined,
      organization: data.organizationId,
      isActive: true,
    } as any);

    await this.em.flush();
    return user;
  }

  /**
   * Fuzzy name search for assistant assignee resolution (typo-tolerant).
   */
  async searchUsersForAssignee(
    organizationId: string,
    query: string,
  ): Promise<{
    query: string;
    matches: Array<{
      id: string;
      displayName: string;
      email: string;
      distance: number;
    }>;
    hint: 'use_top_match' | 'ask_user' | 'no_match';
  }> {
    const q = normalizeForMatch(query);
    if (!q) {
      return { query, matches: [], hint: 'no_match' };
    }

    const users = await this.em.find(
      User,
      { organization: organizationId, isActive: true } as any,
      { filters: false },
    );

    const scored = users
      .map((u) => {
        const dist = bestNameDistance(q, u);
        return {
          user: u,
          distance: dist,
          displayName: u.getFullName(),
        };
      })
      .filter((s) => s.distance <= 5)
      .sort((a, b) => a.distance - b.distance || a.displayName.localeCompare(b.displayName));

    const top = scored.slice(0, 12).map((s) => ({
      id: s.user.id,
      displayName: s.displayName,
      email: s.user.email,
      distance: s.distance,
    }));

    if (!top.length) {
      return { query, matches: [], hint: 'no_match' };
    }

    const d0 = top[0].distance;
    const d1 = top[1]?.distance ?? 999;

    if (d0 > 3) {
      return { query, matches: top, hint: 'no_match' };
    }

    if (top.length >= 2 && top[0].distance === top[1].distance && top[0].distance <= 3) {
      return { query, matches: top, hint: 'ask_user' };
    }

    if (d1 <= d0 + 1 && d1 <= 3) {
      return { query, matches: top, hint: 'ask_user' };
    }

    return { query, matches: top, hint: 'use_top_match' };
  }
}

function normalizeForMatch(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function bestNameDistance(q: string, u: User): number {
  const full = normalizeForMatch([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email);
  const first = normalizeForMatch(u.firstName || '');
  const last = normalizeForMatch(u.lastName || '');
  const local = normalizeForMatch(u.email.split('@')[0] || '');

  const candidates = [full, first, last, local].filter(Boolean);
  let best = 999;
  for (const c of candidates) {
    if (!c) continue;
    if (c === q || c.includes(q) || q.includes(c)) {
      best = 0;
      break;
    }
    best = Math.min(best, levenshtein(q, c));
  }
  return best;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}
