import { getRequestContext } from '@/lib/auth/request-context';

export const prisma = (() => {
  if (process.env.NODE_ENV === 'production') {
    return new (require('@prisma/client').PrismaClient)();
  } else {
    let prismaInstance: any;

    if (!global.prismaGlobal) {
      global.prismaGlobal = new (require('@prisma/client').PrismaClient)();
    }

    prismaInstance = global.prismaGlobal;
    return prismaInstance;
  }
})();

declare global {
  var prismaGlobal: any;
}
