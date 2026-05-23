import { prisma } from '@/lib/db/prisma';

export async function getCompanySubscription(companyId: string) {
  return prisma.companySubscription.findUnique({
    where: { companyId },
    include: {
      plan: {
        include: {
          features: true,
        },
      },
    },
  });
}

export async function checkFeatureEnabled(
  companyId: string,
  featureKey: string
): Promise<boolean> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription || subscription.status !== 'ACTIVE') {
    return false;
  }

  const feature = subscription.plan.features.find(f => f.featureKey === featureKey);
  return feature?.enabled === true;
}

export async function getFeatureQuota(
  companyId: string,
  featureKey: string
): Promise<number | null> {
  const subscription = await getCompanySubscription(companyId);

  if (!subscription) {
    return null;
  }

  const feature = subscription.plan.features.find(f => f.featureKey === featureKey);
  return feature?.limit || null;
}

export async function checkQuotaRemaining(
  companyId: string,
  featureKey: string,
  currentUsage: number
): Promise<boolean> {
  const quota = await getFeatureQuota(companyId, featureKey);

  if (quota === null) {
    // Unlimited
    return true;
  }

  return currentUsage < quota;
}

export async function trackUsage(
  companyId: string,
  userId: string | undefined,
  metricType: string,
  value: number,
  metadata?: Record<string, any>
) {
  return prisma.usageLog.create({
    data: {
      companyId,
      userId,
      metricType,
      value,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

export async function getUsageSummary(
  companyId: string,
  timeframe: 'DAY' | 'MONTH' | 'YEAR' = 'MONTH'
) {
  const now = new Date();
  let startDate: Date;

  switch (timeframe) {
    case 'DAY':
      startDate = new Date(now.setDate(now.getDate() - 1));
      break;
    case 'YEAR':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    case 'MONTH':
    default:
      startDate = new Date(now.setMonth(now.getMonth() - 1));
  }

  const logs = await prisma.usageLog.groupBy({
    by: ['metricType'],
    where: {
      companyId,
      createdAt: {
        gte: startDate,
      },
    },
    _sum: {
      value: true,
    },
  });

  return logs.reduce(
    (acc, log) => {
      acc[log.metricType] = log._sum.value || 0;
      return acc;
    },
    {} as Record<string, number>
  );
}
