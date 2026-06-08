import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthenticatedUser } from './types/authenticated-user.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = user.memberships[0];

    if (!membership) {
      throw new UnauthorizedException('User does not belong to a workspace');
    }

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };

    const accessToken = await this.jwtService.signAsync(authenticatedUser);

    return {
      accessToken,
      user: authenticatedUser,
    };
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, 10);
    const workspaceName = registerDto.workspaceName.trim();
    const workspaceSlug = await this.createUniqueWorkspaceSlug(workspaceName);

    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name.trim(),
        email,
        passwordHash,
        memberships: {
          create: {
            role: Role.ADMIN,
            workspace: {
              create: {
                name: workspaceName,
                slug: workspaceSlug,
              },
            },
          },
        },
      },
      include: {
        memberships: {
          take: 1,
          include: {
            workspace: true,
          },
        },
      },
    });

    const membership = user.memberships[0];

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      workspaceId: membership.workspaceId,
      role: membership.role,
    };

    const accessToken = await this.jwtService.signAsync(authenticatedUser);

    return {
      accessToken,
      user: authenticatedUser,
    };
  }

  me(user: AuthenticatedUser) {
    return user;
  }

  private async createUniqueWorkspaceSlug(workspaceName: string) {
    const baseSlug = this.slugify(workspaceName);
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.workspace.findUnique({
        where: {
          slug: candidate,
        },
        select: {
          id: true,
        },
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private slugify(value: string) {
    const slug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return slug || 'workspace';
  }
}
