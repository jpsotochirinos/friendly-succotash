import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID', ''),
      clientSecret: config.get('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: config.get('GOOGLE_CALLBACK_URL', 'http://localhost:3000/api/auth/google/callback'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ) {
    const { id, emails, name, photos } = profile;
    const email = emails?.[0]?.value;
    if (!email) {
      return done(new Error('GOOGLE_OAUTH_NO_EMAIL'));
    }
    const json = (profile as unknown as { _json?: { email_verified?: boolean } })._json;
    if (json?.email_verified === false) {
      return done(new Error('GOOGLE_OAUTH_EMAIL_NOT_VERIFIED'));
    }
    const user = {
      googleId: id,
      email,
      firstName: name?.givenName,
      lastName: name?.familyName,
      avatarUrl: photos?.[0]?.value,
    };
    done(null, user);
  }
}
