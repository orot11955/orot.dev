import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { Request, Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.username, user.role);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    this.setRefreshCookie(req, res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      user: { id: user.id, username: user.username, role: user.role },
    };
  }

  async refresh(
    userId: number,
    username: string,
    role: string,
    req: Request,
    res: Response,
  ) {
    const tokens = await this.generateTokens(userId, username, role);
    await this.saveRefreshToken(userId, tokens.refreshToken);
    this.setRefreshCookie(req, res, tokens.refreshToken);

    return { accessToken: tokens.accessToken };
  }

  async logout(
    userId: number,
    refreshToken: string,
    req: Request,
    res: Response,
  ) {
    await this.prisma.refreshToken
      .deleteMany({ where: { userId, token: refreshToken } })
      .catch(() => {});
    this.clearRefreshCookie(req, res);
    return { message: 'Logged out' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch)
      throw new BadRequestException('현재 비밀번호가 일치하지 않습니다.');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Password updated' };
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async generateTokens(userId: number, username: string, role: string) {
    const payload = { sub: userId, username, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('auth.accessSecret'),
        expiresIn: this.configService.get('auth.accessExpiresIn'),
      }),
      this.jwtService.signAsync(
        {
          ...payload,
          jti: randomUUID(),
        },
        {
          secret: this.configService.get<string>('auth.refreshSecret'),
          expiresIn: this.configService.get('auth.refreshExpiresIn'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: number, token: string) {
    const expiresIn =
      this.configService.get<string>('auth.refreshExpiresIn') || '30d';
    const days = parseInt(expiresIn.replace('d', ''), 10) || 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    // cleanup old tokens (keep last 5)
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
    });
    if (tokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: tokens.map((t) => t.id) } },
      });
    }
  }

  private isSecureRequest(req: Request): boolean {
    if (req.secure) {
      return true;
    }

    const forwardedProto = req.headers['x-forwarded-proto'];
    if (Array.isArray(forwardedProto)) {
      return forwardedProto[0] === 'https';
    }

    return forwardedProto === 'https';
  }

  private resolveRefreshCookieOptions(req: Request) {
    const secure = this.configService.get<boolean>('cookie.secure');
    const domain = this.configService.get<string>('cookie.domain');

    return {
      httpOnly: true,
      secure: Boolean(secure) && this.isSecureRequest(req),
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      ...(domain ? { domain } : {}),
    } as const;
  }

  private setRefreshCookie(req: Request, res: Response, token: string) {
    res.cookie('refresh_token', token, this.resolveRefreshCookieOptions(req));
  }

  private clearRefreshCookie(req: Request, res: Response) {
    res.clearCookie('refresh_token', this.resolveRefreshCookieOptions(req));
  }
}
