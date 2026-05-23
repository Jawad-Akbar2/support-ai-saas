import { prisma } from '@/lib/db/prisma';

export async function verifyUserInCompany(
  userId: string,
  companyId: string
): Promise<boolean> {
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      companyId,
      status: 'ACTIVE',
    },
  });

  return !!membership;
}

export async function getCompanyUsers(companyId: string) {
  return prisma.membership.findMany({
    where: {
      companyId,
      status: 'ACTIVE',
    },
    include: {
      user: true,
      role: true,
    },
  });
}

export async function getUserCompanies(userId: string) {
  return prisma.membership.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      company: true,
      role: true,
    },
  });
}

export async function getCompany(companyId: string) {
  return prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: {
        include: {
          plan: {
            include: {
              features: true,
            },
          },
        },
      },
      settings: true,
      aiSettings: true,
    },
  });
}

export async function filterByCompanyId<T extends { companyId: string }>(
  items: T[],
  companyId: string
): Promise<T[]> {
  return items.filter(item => item.companyId === companyId);
}
