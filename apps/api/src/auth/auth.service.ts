import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashed,
        ownedWorkspaces: {
          create: {
            name: dto.workspaceName,
            slug: dto.workspaceName
              .toLowerCase()
              .replace(/\s+/g, '-')
              .replace(/[^a-z0-9-]/g, ''),
            members: {
              create: {
                role: 'OWNER',
                user: {
                  connect: { email: dto.email },
                },
              },
            },
            subscription: {
              create: {
                plan: 'FREE',
                status: 'TRIALING',
                trialEndsAt: new Date(
                  Date.now() + 7 * 24 * 60 * 60 * 1000,
                ),
              },
            },
          },
        },
      },
      include: {
        ownedWorkspaces: true,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      workspace: user.ownedWorkspaces[0],
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        ownedWorkspaces: true,
      },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      workspace: user.ownedWorkspaces[0],
      ...tokens,
    };
  }

  async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}
