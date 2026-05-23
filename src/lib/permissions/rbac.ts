import { prisma } from '@/lib/db/prisma';

export async function checkPermission(
  roleId: string,
  permissionName: string
): Promise<boolean> {
  const rolePermission = await prisma.rolePermission.findFirst({
    where: {
      roleId,
      permission: {
        name: permissionName,
      },
    },
  });

  return !!rolePermission;
}

export async function checkUserPermissionInCompany(
  userId: string,
  companyId: string,
  permissionName: string
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      companyId,
      status: 'ACTIVE',
    },
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
  });

  if (!membership) {
    return false;
  }

  return membership.role.permissions.some(rp => rp.permission.name === permissionName);
}

export async function getUserRoleInCompany(
  userId: string,
  companyId: string
): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      companyId,
      status: 'ACTIVE',
    },
    include: {
      role: true,
    },
  });

  return membership?.role.name || null;
}

export async function checkFeatureAccess(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    return false;
  }

  return subscription.plan.features.some(
    f => f.featureKey === featureKey && f.enabled
  );
}

export async function getFeatureLimit(
  companyId: string,
  featureKey: string
): Promise<number | null> {
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    return null;
  }

  const feature = subscription.plan.features.find(f => f.featureKey === featureKey);
  return feature?.limit || null;
}

export async function checkUsageLimit(
  companyId: string,
  featureKey: string,
  currentUsage: number
): Promise<boolean> {
  const limit = await getFeatureLimit(companyId, featureKey);

  if (limit === null) {
    // No limit
    return true;
  }

  return currentUsage < limit;
}
