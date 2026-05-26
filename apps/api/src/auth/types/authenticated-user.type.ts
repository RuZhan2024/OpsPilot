import { Role } from '@prisma/client';

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  workspaceId: string;
  role: Role;
};
