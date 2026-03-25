import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import { Request, Response } from "express";
import sendResponse from "../../../shared/sendResponse";
import { ProductService } from "./product.service";
import pick from "../../../shared/pick";
import { productFilterableFields } from "./product.constant";


const createProduct = catchAsync(async (req: Request, res: Response) => {
    const product = await ProductService.createProduct(req as Request & { files?: Express.Multer.File[] });
    console.log("product : ", product);
    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: 'Product created successfully',
        data: product
    });
});

const getAllProduct = catchAsync(async (req: Request, res: Response) => {
    //================= searching , filtering ================//
    const filters = pick(req.query, productFilterableFields);
    // ================= pagination and sorting =================//
    const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"])
    const products = await ProductService.getProducts(filters, options);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Products retrieved successfully',
        meta: products.meta,
        data: products.data,
    });
});

const getProductBySlug = catchAsync(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const product = await ProductService.getProductBySlug(slug as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product fetched successfully",
        data: product,
    });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    await ProductService.deleteProduct(productId as string);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Product deleted successfully',
        data: null
    });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const result = await ProductService.updateProduct(
        productId as string,
        req as Request & { files?: Express.Multer.File[] }
    );

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Product updated successfully",
        data: result,
    });
});

export const ProductController = {
    createProduct,
    getAllProduct,
    getProductBySlug,
    deleteProduct,
    updateProduct
};


