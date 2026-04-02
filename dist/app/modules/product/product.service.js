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
exports.ProductService = void 0;
const paginationHelper_1 = require("../../../helpers/paginationHelper");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const generateSlug_1 = require("../../../utils/generateSlug");
const imageOptimizer_1 = require("../../../utils/imageOptimizer");
const product_constant_1 = require("./product.constant");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const createProduct = (req) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    console.log("Data : ", data);
    // ============= generate slug automatically ================//
    const slug = yield (0, generateSlug_1.generateUniqueSlug)(data.name);
    const productFolder = `products/${slug}`;
    //============= Access files from request ===================//
    const files = req.galleryFiles; // already set in middleware
    const thumbnailFile = req.thumbnailImage;
    const sizeGuidFile = req.sizeGuidImage;
    // ========== Parallel image optimization ==========
    const imagePromises = [];
    if (thumbnailFile)
        imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(thumbnailFile, productFolder));
    if (sizeGuidFile)
        imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(sizeGuidFile, productFolder));
    if (files === null || files === void 0 ? void 0 : files.length)
        files.forEach((file) => imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(file, productFolder)));
    const filenames = yield Promise.all(imagePromises);
    let idx = 0;
    //=================== Process images =======================// 
    const thumbnailUrl = thumbnailFile ? `/uploads/${productFolder}/${filenames[idx++]}` : null;
    const sizeGuidUrl = sizeGuidFile ? `/uploads/${productFolder}/${filenames[idx++]}` : null;
    const imageUrls = (files === null || files === void 0 ? void 0 : files.length) ? filenames.slice(idx).map(f => `/uploads/${productFolder}/${f}`) : [];
    return prisma_1.default.product.create({
        data: {
            name: data.name,
            slug,
            sku: data.sku,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            stockQuantity: data.stockQuantity || 0,
            stockStatus: data.stockStatus || "IN_STOCK",
            shortDescription: data.shortDescription,
            fullDescription: data.fullDescription,
            thumbnailImage: thumbnailUrl,
            sizeGuidImage: sizeGuidUrl,
            // ====== Images ======
            images: {
                create: imageUrls.map((url) => ({ url })),
            },
            // ===== Categories =====
            categories: data.categories
                ? {
                    create: data.categories.map((category) => ({
                        category: {
                            connectOrCreate: {
                                where: { id: category },
                                create: { id: category, name: category },
                            },
                        },
                    })),
                }
                : undefined,
            // ===== SubCategories =====
            subCategories: data.subCategories
                ? {
                    create: data.subCategories.map((subCategory) => {
                        if (typeof subCategory === "string") {
                            return {
                                subCategory: {
                                    connectOrCreate: {
                                        where: { id: subCategory },
                                        create: { id: subCategory, name: subCategory },
                                    },
                                },
                            };
                        }
                        else {
                            // it's an object with id, name, parentId
                            return {
                                subCategory: {
                                    connectOrCreate: {
                                        where: { id: subCategory.id },
                                        create: {
                                            id: subCategory.id,
                                            name: subCategory.name,
                                            parentId: subCategory.parentId || null,
                                        },
                                    },
                                },
                            };
                        }
                    }),
                }
                : undefined,
            // ===== Variants =====
            variants: data.variants
                ? {
                    create: data.variants.map((variant) => {
                        var _a;
                        return ({
                            color: variant.color,
                            size: variant.size,
                            quantity: (_a = variant.quantity) !== null && _a !== void 0 ? _a : 0,
                        });
                    }),
                }
                : undefined,
            // ===== Tags =====
            tags: data.tags
                ? {
                    connectOrCreate: data.tags.map((tagName) => ({
                        where: { name: tagName },
                        create: { name: tagName },
                    })),
                }
                : undefined,
            // ===== Additional Info =====
            additionalInformation: data.additionalInformation
                ? {
                    create: data.additionalInformation.map((info) => ({
                        label: info.label,
                        value: info.value,
                    })),
                }
                : undefined,
        },
        include: {
            categories: true,
            subCategories: true,
            variants: true,
            images: true,
            additionalInformation: true,
            tags: true,
        }
    });
});
const getProducts = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm, category, subCategory } = params, filterData = __rest(params, ["searchTerm", "category", "subCategory"]);
    const andConditions = [];
    if (searchTerm) {
        andConditions.push({
            OR: product_constant_1.productSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        });
    }
    if (category) {
        andConditions.push({
            categories: {
                some: {
                    categoryId: category,
                },
            },
        });
    }
    if (subCategory) {
        andConditions.push({
            subCategories: {
                some: {
                    subCategoryId: subCategory,
                },
            },
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
    const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = yield prisma_1.default.product.findMany({
        skip,
        take: limit,
        orderBy: {
            [sortBy]: sortOrder
        },
        where: whereCondition,
        include: {
            categories: true,
            subCategories: true,
            variants: true,
            images: true,
            additionalInformation: true,
            tags: true,
        }
    });
    const total = yield prisma_1.default.product.count({ where: whereCondition });
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: result,
    };
});
const getProductBySlug = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    const product = yield prisma_1.default.product.findUnique({
        where: {
            slug,
        },
        include: {
            categories: true,
            subCategories: true,
            variants: true,
            images: true,
            tags: true,
            additionalInformation: true,
        },
    });
    if (!product) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Product not found");
    }
    return product;
});
const deleteProduct = (productId) => __awaiter(void 0, void 0, void 0, function* () {
    //================ 1. Check if product exists ==============//
    const existingProduct = yield prisma_1.default.product.findUnique({
        where: {
            id: productId,
        },
    });
    if (!existingProduct) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Product not found");
    }
    //================== 2. Delete product ====================//
    const deletedProduct = yield prisma_1.default.product.delete({
        where: {
            id: productId,
        },
    });
    return deletedProduct;
});
const updateProduct = (productId, req) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const data = req.body;
    // 1️ Check existing product
    const existingProduct = yield prisma_1.default.product.findUnique({
        where: { id: productId },
        include: { images: true },
    });
    if (!existingProduct) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Product not found");
    }
    // 2️ Generate new slug if name changed
    let slug = existingProduct.slug;
    if (data.name && data.name !== existingProduct.name) {
        slug = yield (0, generateSlug_1.generateUniqueSlug)(data.name);
    }
    const productFolder = `products/${slug}`;
    // 3️ Process images outside DB
    const files = req.galleryFiles;
    const thumbnailFile = req.thumbnailImage;
    const sizeGuidFile = req.sizeGuidImage;
    const imagePromises = [];
    if (thumbnailFile)
        imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(thumbnailFile, productFolder));
    if (sizeGuidFile)
        imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(sizeGuidFile, productFolder));
    if (files === null || files === void 0 ? void 0 : files.length)
        files.forEach((file) => imagePromises.push((0, imageOptimizer_1.optimizeAndSaveImage)(file, productFolder)));
    const filenames = yield Promise.all(imagePromises);
    let idx = 0;
    const thumbnailUrl = thumbnailFile
        ? `/uploads/${productFolder}/${filenames[idx++]}`
        : existingProduct.thumbnailImage;
    const sizeGuidUrl = sizeGuidFile
        ? `/uploads/${productFolder}/${filenames[idx++]}`
        : existingProduct.sizeGuidImage;
    const newGalleryUrls = (files === null || files === void 0 ? void 0 : files.length)
        ? filenames.slice(idx).map((f) => `/uploads/${productFolder}/${f}`)
        : [];
    // 4️ Delete old relations before update
    yield Promise.all([
        prisma_1.default.productCategory.deleteMany({ where: { productId } }),
        prisma_1.default.productSubCategory.deleteMany({ where: { productId } }),
        prisma_1.default.variant.deleteMany({ where: { productId } }),
        prisma_1.default.additionalInfo.deleteMany({ where: { productId } }),
        newGalleryUrls.length
            ? prisma_1.default.productImage.deleteMany({ where: { productId } })
            : Promise.resolve(),
    ]);
    // 5️ Update product with new data
    const updatedProduct = yield prisma_1.default.product.update({
        where: { id: productId },
        data: {
            name: (_a = data.name) !== null && _a !== void 0 ? _a : existingProduct.name,
            slug,
            sku: (_b = data.sku) !== null && _b !== void 0 ? _b : existingProduct.sku,
            regularPrice: (_c = data.regularPrice) !== null && _c !== void 0 ? _c : existingProduct.regularPrice,
            salePrice: (_d = data.salePrice) !== null && _d !== void 0 ? _d : existingProduct.salePrice,
            stockQuantity: (_e = data.stockQuantity) !== null && _e !== void 0 ? _e : existingProduct.stockQuantity,
            stockStatus: (_f = data.stockStatus) !== null && _f !== void 0 ? _f : existingProduct.stockStatus,
            shortDescription: (_g = data.shortDescription) !== null && _g !== void 0 ? _g : existingProduct.shortDescription,
            fullDescription: (_h = data.fullDescription) !== null && _h !== void 0 ? _h : existingProduct.fullDescription,
            thumbnailImage: thumbnailUrl,
            sizeGuidImage: sizeGuidUrl,
            // Images
            images: newGalleryUrls.length
                ? {
                    create: newGalleryUrls.map((url) => ({ url })),
                }
                : undefined,
            // Categories
            categories: data.categories
                ? {
                    create: data.categories.map((category) => ({
                        category: {
                            connectOrCreate: {
                                where: { id: category },
                                create: { id: category, name: category },
                            },
                        },
                    })),
                }
                : undefined,
            // SubCategories
            subCategories: data.subCategories
                ? {
                    create: data.subCategories.map((subCategory) => {
                        if (typeof subCategory === "string") {
                            return {
                                subCategory: {
                                    connectOrCreate: {
                                        where: { id: subCategory },
                                        create: { id: subCategory, name: subCategory },
                                    },
                                },
                            };
                        }
                        else {
                            return {
                                subCategory: {
                                    connectOrCreate: {
                                        where: { id: subCategory.id },
                                        create: {
                                            id: subCategory.id,
                                            name: subCategory.name,
                                            parentId: subCategory.parentId || null,
                                        },
                                    },
                                },
                            };
                        }
                    }),
                }
                : undefined,
            // Variants
            variants: data.variants
                ? {
                    create: data.variants.map((variant) => {
                        var _a;
                        return ({
                            color: variant.color,
                            size: variant.size,
                            quantity: (_a = variant.quantity) !== null && _a !== void 0 ? _a : 0,
                        });
                    }),
                }
                : undefined,
            // Tags
            tags: data.tags
                ? {
                    set: [], // reset old
                    connectOrCreate: data.tags.map((tagName) => ({
                        where: { name: tagName },
                        create: { name: tagName },
                    })),
                }
                : undefined,
            // Additional Info
            additionalInformation: data.additionalInformation
                ? {
                    create: data.additionalInformation.map((info) => ({
                        label: info.label,
                        value: info.value,
                    })),
                }
                : undefined,
        },
        include: {
            categories: true,
            subCategories: true,
            variants: true,
            images: true,
            additionalInformation: true,
            tags: true,
        },
    });
    return updatedProduct;
});
exports.ProductService = {
    createProduct,
    getProducts,
    getProductBySlug,
    deleteProduct,
    updateProduct
};
