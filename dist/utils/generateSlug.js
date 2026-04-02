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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUniqueSlug = void 0;
const slugify_1 = __importDefault(require("slugify"));
const prisma_1 = __importDefault(require("../shared/prisma")); // adjust path
const generateUniqueSlug = (name) => __awaiter(void 0, void 0, void 0, function* () {
    const baseSlug = (0, slugify_1.default)(name, {
        lower: true,
        strict: true, // removes special chars
        trim: true,
    });
    // Find all similar slugs
    const existingSlugs = yield prisma_1.default.product.findMany({
        where: {
            slug: {
                startsWith: baseSlug,
            },
        },
        select: { slug: true },
    });
    if (existingSlugs.length === 0) {
        return baseSlug;
    }
    const numbers = existingSlugs
        .map((p) => {
        const match = p.slug.match(new RegExp(`^${baseSlug}-(\\d+)$`));
        return match ? Number(match[1]) : null;
    })
        .filter((n) => n !== null);
    const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
    return `${baseSlug}-${nextNumber}`;
});
exports.generateUniqueSlug = generateUniqueSlug;
