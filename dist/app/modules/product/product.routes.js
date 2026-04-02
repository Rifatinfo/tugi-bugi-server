"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRoutes = void 0;
const express_1 = require("express");
const fileUploader_1 = require("../../../utils/fileUploader");
const product_controller_1 = require("./product.controller");
const product_validation_1 = require("./product.validation");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const productUpload = (0, multer_1.default)(fileUploader_1.multerConfig).fields([
    { name: "thumbnailImage", maxCount: 1 },
    { name: "sizeGuidImage", maxCount: 1 },
    { name: "file", maxCount: 4 }, // gallery images
]);
router.post("/create", (req, res, next) => {
    productUpload(req, res, (err) => {
        var _a, _b;
        if (err)
            return next(err);
        const files = req.files;
        req.thumbnailImage = (_a = files["thumbnailImage"]) === null || _a === void 0 ? void 0 : _a[0];
        req.sizeGuidImage = (_b = files["sizeGuidImage"]) === null || _b === void 0 ? void 0 : _b[0];
        req.galleryFiles = files["file"] || [];
        next();
    });
}, (req, _res, next) => {
    var _a;
    try {
        if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.data)) {
            throw new Error("Product data missing");
        }
        const parsed = JSON.parse(req.body.data);
        req.body = product_validation_1.createProductSchema.parse(parsed);
        next();
    }
    catch (error) {
        next(error);
    }
}, product_controller_1.ProductController.createProduct);
router.get("/", product_controller_1.ProductController.getAllProduct);
router.get("/slug/:slug", product_controller_1.ProductController.getProductBySlug);
router.delete("/:productId", product_controller_1.ProductController.deleteProduct);
router.patch("/:productId", (req, res, next) => {
    productUpload(req, res, (err) => {
        var _a, _b;
        if (err)
            return next(err);
        const files = req.files;
        req.thumbnailImage = (_a = files === null || files === void 0 ? void 0 : files["thumbnailImage"]) === null || _a === void 0 ? void 0 : _a[0];
        req.sizeGuidImage = (_b = files === null || files === void 0 ? void 0 : files["sizeGuidImage"]) === null || _b === void 0 ? void 0 : _b[0];
        req.galleryFiles = (files === null || files === void 0 ? void 0 : files["file"]) || [];
        next();
    });
}, (req, _res, next) => {
    var _a;
    try {
        if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.data) {
            const parsed = JSON.parse(req.body.data);
            req.body = product_validation_1.updateProductSchema.parse(parsed);
        }
        next();
    }
    catch (error) {
        next(error);
    }
}, product_controller_1.ProductController.updateProduct);
exports.ProductRoutes = router;
