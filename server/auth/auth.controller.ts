import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './google.guard';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly jwtService: JwtService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user;
    const token = this.authService.signJwt(user);
    res.cookie('auth_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    res.redirect('http://localhost:3333/');
  }

  @Get('me')
  async me(@Req() req: any) {
    // In first iteration, decode token if present
    const token = req.cookies?.auth_token;
    if (!token) return { authenticated: false };
    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'dev_jwt_secret' });
      return { authenticated: true, user: { id: payload.sub, email: payload.email, name: payload.name } };
    } catch {
      return { authenticated: false };
    }
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('auth_token', { httpOnly: true, sameSite: 'lax', secure: false });
    res.status(200).json({ success: true });
  }
}


