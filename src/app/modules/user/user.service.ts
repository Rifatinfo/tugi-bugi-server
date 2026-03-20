
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request } from "express";
import prisma from "../../../shared/prisma";
import { optimizeAndSaveImage } from "../../../utiles/imageOptimizer";

import { userSearchableFields } from "./user.constant";
import { generateUniqueSlug } from "../../../utiles/generateSlug";
import { Prisma, UserRole } from "@prisma/client";
import { IOptions, paginationHelper } from "../../../helpers/paginationHelper";
import { generateUserSlug } from "../../../utiles/generateUserSlug";


// const createCustomer = async (req: Request & { file?: Express.Multer.File }) => {
//   const { name, email, password } = req.body;
//   console.log("file" , req.file)
//   // ===== Generate slug (random suffix, no DB needed) =====
//   const slug = generateUserSlug(name?.trim());
//   console.log("slug" , slug);
//   // ===== Handle avatar =====
//   let avatarUrl: string | null = null;
//   if (req.file) {
//       const userFolder = `users/${slug}`;
//       const filename = await optimizeAndSaveImage(req.file, userFolder);
//       avatarUrl = `/uploads/${userFolder}/${filename}`;
//   }

//   // ===== Hash password =====
//   const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
//   const hashedPassword = await bcrypt.hash(password, saltRounds);

//   // ===== Create user and related data =====
//   const result = await prisma.$transaction(async (tx) => {
//       const user = await tx.user.create({
//           data: {
//               email,
//               name,
//               password: hashedPassword,
//               avatar: avatarUrl,
//               role: UserRole.CUSTOMER,
//           },
//       });

//       await tx.authProvider.create({
//           data: {
//               provider: "CREDENTIALS",
//               password: hashedPassword,
//               userId: user.id,
//           },
//       });

//       const customer = await tx.customer.create({
//           data: {
//               userId: user.id,
//               name,
//               email,
//               avatar: avatarUrl,
//               password: hashedPassword,
//           },
//       });

//       return customer;
//   });

//   return result;
// };


const createCustomer = async (
  req: Request & { file?: Express.Multer.File }
) => {
  const { name, email, password } = req.body;

  // ===== 1. Generate slug =====
  const slug = generateUserSlug(name?.trim());

  // ===== 2. Parallel processing  =====
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

  const [hashedPassword, filename] = await Promise.all([
    bcrypt.hash(password, saltRounds),

    req.file
      ? optimizeAndSaveImage(req.file, `users/${slug}`)
      : Promise.resolve(null),
  ]);

  const avatarUrl = filename
    ? `/uploads/users/${slug}/${filename}`
    : null;

  // ===== 3. Create User =====
  const user = await prisma.user.create({
    data: {
      email,
      name,
      slug, 
      password: hashedPassword,
      avatar: avatarUrl,
      role: UserRole.CUSTOMER,
    },
  });

  // ===== 4. Create related data (Batch Transaction ) =====
  await prisma.$transaction([
    prisma.authProvider.create({
      data: {
        provider: "CREDENTIALS",
        password: hashedPassword,
        userId: user.id,
      },
    }),

    prisma.customer.create({
      data: {
        userId: user.id,
        name,
        email,
        avatar: avatarUrl,
        password : hashedPassword
      },
    }),
  ]);

  // ===== 5. Return clean response =====
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
};

const getAllFromDB = async (params: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options)
    const { searchTerm, ...filterData } = params;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: userSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: (filterData as any)[key]
                }
            }))
        })
    }

    const whereConditions: Prisma.UserWhereInput = andConditions.length > 0 ? {
        AND: andConditions
    } : {}

    const result = await prisma.user.findMany({
        skip,
        take: limit,
        where: whereConditions,
        orderBy: {
            [sortBy]: sortOrder
        }
    });

    const total = await prisma.user.count({
        where: whereConditions
    });
    return {
        meta: {
            page,
            limit,
            total
        },
        data: result
    };
}


const createAdmin = async (req: Request & { file?: Express.Multer.File }) => {
    const { name, email, password, phone } = req.body;

    // ===== Generate slug =====
    const slug = name ? await generateUniqueSlug(name.trim()) : `user-${crypto.randomBytes(6).toString("hex")}`;
    let avatarUrl: string | null = null;

    if (req.file) {
        const userFolder = `users/${slug}`;
        const filename = await optimizeAndSaveImage(req.file, userFolder);
        avatarUrl = `/uploads/${userFolder}/${filename}`;
    }

    // ===== Hash password =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ===== Prisma Transaction =====
    const result = await prisma.$transaction(async (tx) => {
        // 1 Create User
        const user = await tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                avatar: avatarUrl,
                role: UserRole.ADMIN,
            },
        });


        // 3 Create Admin Profile
        const admin = await tx.admin.create({
            data: {
                userId: user.id,
                name,
                email,
                phone,
                avatar: avatarUrl,
                password: hashedPassword,
            },
        });

        return admin;
    });

    return result;
};


export const UserService = {
    createCustomer,
    getAllFromDB,
    createAdmin,
};