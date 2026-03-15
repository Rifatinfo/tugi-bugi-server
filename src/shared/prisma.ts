import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { envVars } from "../config";


const connectionString = envVars.DATABASE_URL


console.log("DB -- ", connectionString);
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

export default prisma;
