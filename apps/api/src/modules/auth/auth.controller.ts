import {
  Controller, Post, Get, Body, UseGuards, Req, Res,
  HttpCode, HttpStatus, Query, Next,
} from '@nestjs/common';
import { Response, Request, NextFunction } from 'express';
import passport from 'passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MagicLinkRequestDto } from './dto/magic-link.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('availability')
  async checkEmailAvailability(@Query('email') email: string) {
    return this.authService.checkEmailAvailability(email ?? '');
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Get('google')
  googleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
    @Query('state') state?: string,
  ) {
    const opts: passport.AuthenticateOptions = {
      scope: ['email', 'profile'],
      session: false,
    };
    if (state) {
      (opts as Record<string, unknown>).state = state;
    }
    passport.authenticate('google', opts)(req, res, next);
  }

  @Public()
  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response) {
    passport.authenticate(
      'google',
      { session: false },
      (err: unknown, user: false | Record<string, unknown>) => {
        void (async () => {
          try {
            if (err || !user) {
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
              return res.redirect(`${frontendUrl}/auth/callback?error=google`);
            }
            const result = await this.authService.googleLogin(user as any);
            this.setRefreshTokenCookie(res, result.refreshToken);
            const state = typeof req.query.state === 'string' ? req.query.state : undefined;
            if (state === 'desktop') {
              const token = encodeURIComponent(result.accessToken);
              const refresh = encodeURIComponent(result.refreshToken);
              return res.redirect(
                `alega-desktop://auth/callback?token=${token}&refresh=${refresh}`,
              );
            }
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(
              `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}`,
            );
          } catch {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/auth/callback?error=google`);
          }
        })();
      },
    )(req, res);
  }

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    await this.authService.sendMagicLink(dto.email);
    return { message: 'If the email exists, a magic link has been sent' };
  }

  @Public()
  @Get('magic-link/verify')
  async verifyMagicLink(
    @Query('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMagicLink(token);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as any;
    const result = await this.authService.refreshTokens(user.id, user.refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie('refreshToken');
    return { message: 'Logged out' };
  }

  @Get('me')
  async me(
    @CurrentUser()
    user: {
      id: string;
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      birthDate?: string | null;
      organizationId: string;
      roleName?: string | null;
      permissions: string[];
    },
  ) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      birthDate: user.birthDate ?? null,
      organizationId: user.organizationId,
      roleName: user.roleName ?? null,
      permissions: Array.isArray(user.permissions) ? [...user.permissions] : [],
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
