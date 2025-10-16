import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { db } from '../database/database';
import { users } from '../database/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async findOrCreateGoogleUser(profile: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
  }) {
    const existing = await db.select().from(users).where(
      eq(users.provider, 'google')
    ).where(eq(users.providerUserId, profile.id));

    let user = existing[0];
    if (!user) {
      const result = await db.insert(users).values({
        provider: 'google',
        providerUserId: profile.id,
        email: profile.email,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
      });
      const insertedId = (result as any).insertId;
      user = (await db.select().from(users).where(eq(users.id, insertedId)))[0];
    }
    return user;
  }

  signJwt(user: any) {
    const payload = { sub: user.id, name: user.name, email: user.email };
    return this.jwtService.sign(payload);
  }
}


