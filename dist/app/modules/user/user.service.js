"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const imageOptimizer_1 = require("../../../utils/imageOptimizer");
const user_constant_1 = require("./user.constant");
const generateSlug_1 = require("../../../utils/generateSlug");
const client_1 = require("@prisma/client");
const paginationHelper_1 = require("../../../helpers/paginationHelper");
const generateUserSlug_1 = require("../../../utils/generateUserSlug");
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
const createCustomer = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body;
    // ===== 1. Generate slug =====
    const slug = (0, generateUserSlug_1.generateUserSlug)(name === null || name === void 0 ? void 0 : name.trim());
    // ===== 2. Parallel processing  =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const [hashedPassword, filename] = yield Promise.all([
        bcryptjs_1.default.hash(password, saltRounds),
        req.file
            ? (0, imageOptimizer_1.optimizeAndSaveImage)(req.file, `users/${slug}`)
            : Promise.resolve(null),
    ]);
    const avatarUrl = filename
        ? `/uploads/users/${slug}/${filename}`
        : null;
    // ===== 3. Create User =====
    const user = yield prisma_1.default.user.create({
        data: {
            email,
            name,
            slug,
            password: hashedPassword,
            avatar: avatarUrl,
            role: client_1.UserRole.CUSTOMER,
        },
    });
    // ===== 4. Create related data (Batch Transaction ) =====
    yield prisma_1.default.$transaction([
        prisma_1.default.authProvider.create({
            data: {
                provider: "CREDENTIALS",
                password: hashedPassword,
                userId: user.id,
            },
        }),
        prisma_1.default.customer.create({
            data: {
                userId: user.id,
                name,
                email,
                avatar: avatarUrl,
                password: hashedPassword
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
});
const getAllFromDB = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm } = params, filterData = __rest(params, ["searchTerm"]);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            OR: user_constant_1.userSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        });
    }
    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: filterData[key]
                }
            }))
        });
    }
    const whereConditions = andConditions.length > 0 ? {
        AND: andConditions
    } : {};
    const result = yield prisma_1.default.user.findMany({
        skip,
        take: limit,
        where: whereConditions,
        orderBy: {
            [sortBy]: sortOrder
        }
    });
    const total = yield prisma_1.default.user.count({
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
});
const createAdmin = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password, phone } = req.body;
    // ===== Generate slug =====
    const slug = name ? yield (0, generateSlug_1.generateUniqueSlug)(name.trim()) : `user-${crypto_1.default.randomBytes(6).toString("hex")}`;
    let avatarUrl = null;
    if (req.file) {
        const userFolder = `users/${slug}`;
        const filename = yield (0, imageOptimizer_1.optimizeAndSaveImage)(req.file, userFolder);
        avatarUrl = `/uploads/${userFolder}/${filename}`;
    }
    // ===== Hash password =====
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = yield bcryptjs_1.default.hash(password, saltRounds);
    // ===== Prisma Transaction =====
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // 1 Create User
        const user = yield tx.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                avatar: avatarUrl,
                role: client_1.UserRole.ADMIN,
            },
        });
        // 3 Create Admin Profile
        const admin = yield tx.admin.create({
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
    }));
    return result;
});
exports.UserService = {
    createCustomer,
    getAllFromDB,
    createAdmin,
};
