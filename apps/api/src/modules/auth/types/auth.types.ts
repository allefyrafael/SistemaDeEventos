import type { UserType } from '@prisma/client';

export interface JwtAccessPayload {
  sub: string;           // user id
  tipoPerfil: UserType;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;           // rotacao: revogavel via Redis
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  tipoPerfil: UserType;
  nome: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
