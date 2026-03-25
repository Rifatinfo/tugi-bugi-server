import { Prisma } from "@prisma/client";
import { IOptions, paginationHelper } from "../../../helpers/paginationHelper";
import prisma from "../../../shared/prisma";
import { generateUniqueSlug } from "../../../utiles/generateSlug";
import { optimizeAndSaveImage } from "../../../utiles/imageOptimizer";
import { CreateProductInput } from "./product.interface";
import { Request as ExpressRequest } from "express";
import { productSearchableFields } from "./product.constant";
import ApiError from "../../errors/ApiError";
import { StatusCodes } from "http-status-codes";

const createProduct = async (req: ExpressRequest & { files?: Express.Multer.File[] }) => {
    const data = req.body as CreateProductInput;
    console.log("Data : ", data);
    // ============= generate slug automatically ================//
    const slug = await generateUniqueSlug(data.name);

    const productFolder = `products/${slug}`;

    //============= Access files from request ===================//
    const files = (req as any).galleryFiles; // already set in middleware
    const thumbnailFile = (req as any).thumbnailImage;
    const sizeGuidFile = (req as any).sizeGuidImage;

    // ========== Parallel image optimization ==========
    const imagePromises: Promise<string>[] = [];

    if (thumbnailFile) imagePromises.push(optimizeAndSaveImage(thumbnailFile, productFolder));
    if (sizeGuidFile) imagePromises.push(optimizeAndSaveImage(sizeGuidFile, productFolder));
    if (files?.length) files.forEach((file: any) => imagePromises.push(optimizeAndSaveImage(file, productFolder)));
    const filenames = await Promise.all(imagePromises);

    let idx = 0;
    //=================== Process images =======================// 
    const thumbnailUrl = thumbnailFile ? `/uploads/${productFolder}/${filenames[idx++]}` : null;
    const sizeGuidUrl = sizeGuidFile ? `/uploads/${productFolder}/${filenames[idx++]}` : null;
    const imageUrls = files?.length ? filenames.slice(idx).map(f => `/uploads/${productFolder}/${f}`) : [];


    return prisma.product.create({
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
                    create: data.subCategories.map((subCategory: any) => {
                        if (typeof subCategory === "string") {
                            return {
                                subCategory: {
                                    connectOrCreate: {
                                        where: { id: subCategory },
                                        create: { id: subCategory, name: subCategory },
                                    },
                                },
                            };
                        } else {
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
                    create: data.variants.map((variant) => ({
                        color: variant.color,
                        size: variant.size,
                        quantity: variant.quantity ?? 0,
                    })),
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
};
const getProducts = async (params: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);
    const { searchTerm, category, subCategory, ...filterData } = params;

    const andConditions: Prisma.ProductWhereInput[] = [];
    if (searchTerm) {
        andConditions.push({
            OR: productSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
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
                    equals: (filterData as any)[key]
                }
            }))
        })
    }

    const whereCondition: Prisma.ProductWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};
    const result = await prisma.product.findMany({
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
    const total = await prisma.product.count({ where: whereCondition })
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: result,
    };
};

const getProductBySlug = async (slug: string) => {
    const product = await prisma.product.findUnique({
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
        throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
    }

    return product;
};

const deleteProduct = async (productId: string) => {
    //================ 1. Check if product exists ==============//
    const existingProduct = await prisma.product.findUnique({
        where: {
            id: productId,
        },
    });

    if (!existingProduct) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
    }

    //================== 2. Delete product ====================//
    const deletedProduct = await prisma.product.delete({
        where: {
            id: productId,
        },
    });

    return deletedProduct;
};

const updateProduct = async (
    productId: string,
    req: ExpressRequest & { files?: Express.Multer.File[] }
) => {
    const data = req.body as Partial<CreateProductInput>;

    // 1️ Check existing product
    const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: { images: true },
    });

    if (!existingProduct) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
    }

    // 2️ Generate new slug if name changed
    let slug = existingProduct.slug;
    if (data.name && data.name !== existingProduct.name) {
        slug = await generateUniqueSlug(data.name);
    }

    const productFolder = `products/${slug}`;

    // 3️ Process images outside DB
    const files = (req as any).galleryFiles;
    const thumbnailFile = (req as any).thumbnailImage;
    const sizeGuidFile = (req as any).sizeGuidImage;

    const imagePromises: Promise<string>[] = [];
    if (thumbnailFile)
        imagePromises.push(optimizeAndSaveImage(thumbnailFile, productFolder));
    if (sizeGuidFile)
        imagePromises.push(optimizeAndSaveImage(sizeGuidFile, productFolder));
    if (files?.length)
        files.forEach((file: any) =>
            imagePromises.push(optimizeAndSaveImage(file, productFolder))
        );

    const filenames = await Promise.all(imagePromises);
    let idx = 0;

    const thumbnailUrl = thumbnailFile
        ? `/uploads/${productFolder}/${filenames[idx++]}`
        : existingProduct.thumbnailImage;

    const sizeGuidUrl = sizeGuidFile
        ? `/uploads/${productFolder}/${filenames[idx++]}`
        : existingProduct.sizeGuidImage;

    const newGalleryUrls = files?.length
        ? filenames.slice(idx).map((f) => `/uploads/${productFolder}/${f}`)
        : [];

    // 4️ Delete old relations before update
    await Promise.all([
        prisma.productCategory.deleteMany({ where: { productId } }),
        prisma.productSubCategory.deleteMany({ where: { productId } }),
        prisma.variant.deleteMany({ where: { productId } }),
        prisma.additionalInfo.deleteMany({ where: { productId } }),
        newGalleryUrls.length
            ? prisma.productImage.deleteMany({ where: { productId } })
            : Promise.resolve(),
    ]);

    // 5️ Update product with new data
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
            name: data.name ?? existingProduct.name,
            slug,
            sku: data.sku ?? existingProduct.sku,
            regularPrice: data.regularPrice ?? existingProduct.regularPrice,
            salePrice: data.salePrice ?? existingProduct.salePrice,
            stockQuantity: data.stockQuantity ?? existingProduct.stockQuantity,
            stockStatus: data.stockStatus ?? existingProduct.stockStatus,
            shortDescription:
                data.shortDescription ?? existingProduct.shortDescription,
            fullDescription: data.fullDescription ?? existingProduct.fullDescription,

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
                        } else {
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
                    create: data.variants.map((variant) => ({
                        color: variant.color,
                        size: variant.size,
                        quantity: variant.quantity ?? 0,
                    })),
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
};

export const ProductService = {
    createProduct,
    getProducts,
    getProductBySlug,
    deleteProduct,
    updateProduct
}

