export * from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { memoryStore } from "./store";

declare global {
  // eslint-disable-next-line no-var
  var __halaalPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__halaalPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__halaalPrisma = prisma;
}

export { memoryStore };
