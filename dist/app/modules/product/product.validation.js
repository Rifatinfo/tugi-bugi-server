"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductSchema = exports.updateProductSchema = exports.createProductSchema = void 0;
const zod_1 = require("zod");
exports.createProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().optional(),
    sku: zod_1.z.string().min(1),
    regularPrice: zod_1.z.number().min(0),
    salePrice: zod_1.z.number().optional(),
    stockQuantity: zod_1.z.number().min(0).optional(),
    stockStatus: zod_1.z.enum(["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK"]),
    shortDescription: zod_1.z.string().optional(),
    fullDescription: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).min(1), // category IDs
    subCategories: zod_1.z.array(zod_1.z.string()).optional(), // subcategory IDs
    variants: zod_1.z
        .array(zod_1.z.object({
        color: zod_1.z.string().optional(),
        size: zod_1.z.string().optional(),
        quantity: zod_1.z.number().int().min(0)
    }))
        .optional(),
    sizeGuidImage: zod_1.z.string().optional(),
    thumbnailImage: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(), // image URLs
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    additionalInformation: zod_1.z
        .array(zod_1.z.object({
        label: zod_1.z.string(),
        value: zod_1.z.string(),
    }))
        .optional(),
});
exports.updateProductSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    slug: zod_1.z.string().optional(),
    sku: zod_1.z.string().min(1).optional(),
    regularPrice: zod_1.z.number().min(0).optional(),
    salePrice: zod_1.z.number().optional(),
    stockQuantity: zod_1.z.number().min(0).optional(),
    stockStatus: zod_1.z.enum(["IN_STOCK", "OUT_OF_STOCK", "LOW_STOCK"]).optional(),
    shortDescription: zod_1.z.string().optional(),
    fullDescription: zod_1.z.string().optional(),
    categories: zod_1.z.array(zod_1.z.string()).min(1).optional(), // category IDs
    subCategories: zod_1.z.array(zod_1.z.string()).optional(), // subcategory IDs
    variants: zod_1.z
        .array(zod_1.z.object({
        color: zod_1.z.string().optional(),
        size: zod_1.z.string().optional(),
        quantity: zod_1.z.number().int().min(0).optional(),
    }))
        .optional(),
    sizeGuidImage: zod_1.z.string().optional(),
    thumbnailImage: zod_1.z.string().optional(),
    images: zod_1.z.array(zod_1.z.string()).optional(), // image URLs
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    additionalInformation: zod_1.z
        .array(zod_1.z.object({
        label: zod_1.z.string(),
        value: zod_1.z.string(),
    }))
        .optional(),
});
exports.ProductSchema = {
    createProductSchema: exports.createProductSchema,
    updateProductSchema: exports.updateProductSchema,
};
