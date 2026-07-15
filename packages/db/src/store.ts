import { randomUUID } from "crypto";

/**
 * In-memory fallback used ONLY when PostgreSQL is unreachable.
 * Lets the full application → approve → mint loop run in demos without a DB.
 * For production, DATABASE_URL is set and callers use the Prisma `prisma` client.
 */

export interface AppRecord {
  id: string;
  businessName: string;
  registrationNumber: string;
  countryCode: string;
  categoryId: string;
  productLine: string;
  standard: string;
  physicalAddress?: string | null;
  contactEmail?: string | null;
  status: string;
  submittedAt?: Date | null;
  createdAt: Date;
}

type ListRow = {
  id: string;
  businessName: string;
  registrationNumber: string;
  countryCode: string;
  categoryId: string;
  standard: string;
  status: string;
  submittedAt: Date | null;
};

const apps = new Map<string, AppRecord>();

export const memoryStore = {
  create(data: {
    businessName: string;
    registrationNumber: string;
    countryCode: string;
    categoryId: string;
    productLine: string;
    standard: string;
    physicalAddress?: string;
    contactEmail?: string;
  }): AppRecord {
    const id = randomUUID();
    const rec: AppRecord = {
      id,
      ...data,
      status: "SUBMITTED",
      submittedAt: new Date(),
      createdAt: new Date(),
    };
    apps.set(id, rec);
    return rec;
  },

  findUnique(id: string): AppRecord | null {
    return apps.get(id) ?? null;
  },

  update(id: string, status: string): AppRecord | null {
    const rec = apps.get(id);
    if (!rec) return null;
    rec.status = status;
    return rec;
  },

  list(): ListRow[] {
    return [...apps.values()]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((a) => ({
        id: a.id,
        businessName: a.businessName,
        registrationNumber: a.registrationNumber,
        countryCode: a.countryCode,
        categoryId: a.categoryId,
        standard: a.standard,
        status: a.status,
        submittedAt: a.submittedAt ?? null,
      }));
  },
};
