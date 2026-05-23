import { prisma } from '@/lib/db/prisma';

export async function logAuditEvent(
  companyId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValue?: any,
  newValue?: any,
  details?: string,
  ipAddress?: string,
  userAgent?: string
) {
  return prisma.auditLog.create({
    data: {
      companyId,
      userId,
      action,
      entityType,
      entityId,
      oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
      newValue: newValue ? JSON.stringify(newValue) : undefined,
      details,
      ipAddress,
      userAgent,
    },
  });
}

export async function getCompanyAuditLogs(
  companyId: string,
  limit: number = 100,
  offset: number = 0
) {
  return prisma.auditLog.findMany({
    where: { companyId },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });
}

export async function getAuditLogsByAction(
  companyId: string,
  action: string,
  limit: number = 100
) {
  return prisma.auditLog.findMany({
    where: {
      companyId,
      action,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

export async function getAuditLogsByUser(
  companyId: string,
  userId: string,
  limit: number = 100
) {
  return prisma.auditLog.findMany({
    where: {
      companyId,
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}
