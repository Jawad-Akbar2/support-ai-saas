import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/db/prisma';

export interface RequestContext {
  userId: string;
  userEmail: string;
  userName?: string;
  companyId?: string;
  roles?: string[];
  permissions?: string[];
}

export async function getRequestContext(): Promise<RequestContext | null> {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      memberships: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Get the first company (user can switch later)
  const firstMembership = user.memberships[0];

  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name || undefined,
    companyId: firstMembership?.companyId,
    roles: [firstMembership?.role.name].filter(Boolean),
    permissions: firstMembership?.role.permissions
      .map(rp => rp.permission.name)
      .filter(Boolean),
  };
}

export async function requireAuth(): Promise<RequestContext> {
  const context = await getRequestContext();

  if (!context) {
    throw new Error('Unauthorized');
  }

  return context;
}

export async function requireCompanyAccess(companyId: string): Promise<RequestContext> {
  const context = await requireAuth();

  if (!context.companyId || context.companyId !== companyId) {
    throw new Error('Forbidden');
  }

  return context;
}

export async function requirePermission(permission: string): Promise<RequestContext> {
  const context = await requireAuth();

  if (!context.permissions?.includes(permission)) {
    throw new Error('Forbidden');
  }

  return context;
}

export async function requireCompanyAndPermission(
  companyId: string,
  permission: string
): Promise<RequestContext> {
  const context = await requireCompanyAccess(companyId);

  if (!context.permissions?.includes(permission)) {
    throw new Error('Forbidden');
  }

  return context;
}
