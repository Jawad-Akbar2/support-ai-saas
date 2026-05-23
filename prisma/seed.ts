import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  // ==================== PERMISSIONS ====================
  const permissions = [
    { name: 'MANAGE_COMPANY', description: 'Can manage company settings' },
    { name: 'MANAGE_USERS', description: 'Can manage team members' },
    { name: 'UPLOAD_DOCUMENTS', description: 'Can upload documents' },
    { name: 'VIEW_DOCUMENTS', description: 'Can view documents' },
    { name: 'ASK_QUESTIONS', description: 'Can ask AI questions' },
    { name: 'VIEW_ANALYTICS', description: 'Can view analytics' },
    { name: 'VIEW_AUDIT_LOGS', description: 'Can view audit logs' },
    { name: 'MANAGE_AI_SETTINGS', description: 'Can manage AI settings' },
    { name: 'MANAGE_ROLES', description: 'Can manage roles and permissions' },
    { name: 'MANAGE_SUBSCRIPTION', description: 'Can manage subscription' },
  ];

  const createdPermissions = await Promise.all(
    permissions.map(p => prisma.permission.create({ data: p }))
  );

  // ==================== ROLES ====================
  const roleData = [
    {
      name: 'SUPER_ADMIN',
      description: 'Platform super admin',
      permissions: createdPermissions, // All permissions
    },
    {
      name: 'COMPANY_ADMIN',
      description: 'Company admin',
      permissions: createdPermissions, // All permissions for company
    },
    {
      name: 'MANAGER',
      description: 'Support manager',
      permissions: createdPermissions.filter(p => 
        ['VIEW_DOCUMENTS', 'VIEW_ANALYTICS', 'VIEW_AUDIT_LOGS', 'ASK_QUESTIONS'].includes(p.name)
      ),
    },
    {
      name: 'KNOWLEDGE_MANAGER',
      description: 'Knowledge base manager',
      permissions: createdPermissions.filter(p => 
        ['UPLOAD_DOCUMENTS', 'VIEW_DOCUMENTS', 'MANAGE_AI_SETTINGS'].includes(p.name)
      ),
    },
    {
      name: 'AGENT',
      description: 'Support agent',
      permissions: createdPermissions.filter(p => 
        ['ASK_QUESTIONS', 'VIEW_DOCUMENTS'].includes(p.name)
      ),
    },
  ];

  const roles = await Promise.all(
    roleData.map(async (roleData) => {
      const role = await prisma.role.create({
        data: {
          name: roleData.name,
          description: roleData.description,
        },
      });

      // Add permissions to role
      await Promise.all(
        roleData.permissions.map(p =>
          prisma.rolePermission.create({
            data: {
              roleId: role.id,
              permissionId: p.id,
            },
          })
        )
      );

      return role;
    })
  );

  // ==================== PLANS ====================
  const plans = [
    {
      name: 'Free Trial',
      description: 'Free trial plan',
      monthlyPrice: 0,
      tier: 'FREE' as const,
      features: [
        { featureName: 'AI Chat', featureKey: 'AI_CHAT', limit: 1000 },
        { featureName: 'Document Upload', featureKey: 'DOCUMENT_UPLOAD', limit: 10 },
        { featureName: 'Storage', featureKey: 'STORAGE', limit: 100 }, // MB
        { featureName: 'Team Members', featureKey: 'TEAM_MEMBERS', limit: 3 },
      ],
    },
    {
      name: 'Starter',
      description: 'Perfect for small teams',
      monthlyPrice: 2999, // $29.99
      tier: 'STARTER' as const,
      features: [
        { featureName: 'AI Chat', featureKey: 'AI_CHAT', limit: 10000 },
        { featureName: 'Document Upload', featureKey: 'DOCUMENT_UPLOAD', limit: 50 },
        { featureName: 'Storage', featureKey: 'STORAGE', limit: 1024 }, // MB
        { featureName: 'Team Members', featureKey: 'TEAM_MEMBERS', limit: 10 },
        { featureName: 'Analytics', featureKey: 'ANALYTICS', limit: null },
      ],
    },
    {
      name: 'Professional',
      description: 'For growing teams',
      monthlyPrice: 9999, // $99.99
      tier: 'PROFESSIONAL' as const,
      features: [
        { featureName: 'AI Chat', featureKey: 'AI_CHAT', limit: 100000 },
        { featureName: 'Document Upload', featureKey: 'DOCUMENT_UPLOAD', limit: 500 },
        { featureName: 'Storage', featureKey: 'STORAGE', limit: 10240 }, // MB
        { featureName: 'Team Members', featureKey: 'TEAM_MEMBERS', limit: 50 },
        { featureName: 'Analytics', featureKey: 'ANALYTICS', limit: null },
        { featureName: 'Custom Branding', featureKey: 'CUSTOM_BRANDING', limit: null },
        { featureName: 'API Access', featureKey: 'API_ACCESS', limit: null },
      ],
    },
    {
      name: 'Enterprise',
      description: 'For large organizations',
      monthlyPrice: 29999, // $299.99
      tier: 'ENTERPRISE' as const,
      features: [
        { featureName: 'AI Chat', featureKey: 'AI_CHAT', limit: null },
        { featureName: 'Document Upload', featureKey: 'DOCUMENT_UPLOAD', limit: null },
        { featureName: 'Storage', featureKey: 'STORAGE', limit: 102400 }, // MB
        { featureName: 'Team Members', featureKey: 'TEAM_MEMBERS', limit: null },
        { featureName: 'Analytics', featureKey: 'ANALYTICS', limit: null },
        { featureName: 'Custom Branding', featureKey: 'CUSTOM_BRANDING', limit: null },
        { featureName: 'API Access', featureKey: 'API_ACCESS', limit: null },
        { featureName: 'Priority Support', featureKey: 'PRIORITY_SUPPORT', limit: null },
      ],
    },
  ];

  const createdPlans = await Promise.all(
    plans.map(async (planData) => {
      const plan = await prisma.plan.create({
        data: {
          name: planData.name,
          description: planData.description,
          monthlyPrice: planData.monthlyPrice,
          tier: planData.tier,
        },
      });

      await Promise.all(
        planData.features.map(f =>
          prisma.planFeature.create({
            data: {
              planId: plan.id,
              featureName: f.featureName,
              featureKey: f.featureKey,
              limit: f.limit,
            },
          })
        )
      );

      return plan;
    })
  );

  // ==================== DEMO USER & COMPANY ====================
  const demoUser = await prisma.user.create({
    data: {
      email: 'demo@supportai.com',
      name: 'Demo User',
      passwordHash: await bcryptjs.hash('demo123456', 10),
      emailVerified: new Date(),
    },
  });

  const demoCompany = await prisma.company.create({
    data: {
      name: 'Demo Company',
      slug: 'demo-company',
      description: 'Demo company for testing',
    },
  });

  // Add user to company with COMPANY_ADMIN role
  const adminRole = roles.find(r => r.name === 'COMPANY_ADMIN')!;
  await prisma.membership.create({
    data: {
      userId: demoUser.id,
      companyId: demoCompany.id,
      roleId: adminRole.id,
    },
  });

  // Create subscription for demo company
  const starterPlan = createdPlans.find(p => p.tier === 'STARTER')!;
  await prisma.companySubscription.create({
    data: {
      companyId: demoCompany.id,
      planId: starterPlan.id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  // Create company settings
  await prisma.companySettings.create({
    data: {
      companyId: demoCompany.id,
    },
  });

  // Create AI settings
  await prisma.aiSettings.create({
    data: {
      companyId: demoCompany.id,
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📚 Demo credentials:');
  console.log('   Email: demo@supportai.com');
  console.log('   Password: demo123456');
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
