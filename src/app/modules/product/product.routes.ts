import { Router } from "express";
import { multerConfig } from "../../../utiles/fileUploader";
import { ProductController } from "./product.controller";
import { createProductSchema, updateProductSchema } from "./product.validation";
import multer from "multer";

const router = Router();
const productUpload = multer(multerConfig).fields([
  { name: "thumbnailImage", maxCount: 1 },
  { name: "sizeGuidImage", maxCount: 1 },
  { name: "file", maxCount: 4 }, // gallery images
]);
router.post(
  "/create",
  (req, res, next) => {
    productUpload(req, res, (err) => {
      if (err) return next(err);

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };

      (req as any).thumbnailImage = files["thumbnailImage"]?.[0];
      (req as any).sizeGuidImage = files["sizeGuidImage"]?.[0];
      (req as any).galleryFiles = files["file"] || [];

      next();
    });
  },
  (req, _res, next) => {
    try {
      if (!req.body?.data) {
        throw new Error("Product data missing");
      }

      const parsed = JSON.parse(req.body.data);
      req.body = createProductSchema.parse(parsed);

      next();
    } catch (error) {
      next(error);
    }
  },
  ProductController.createProduct
);
router.get("/", ProductController.getAllProduct);
router.get("/slug/:slug", ProductController.getProductBySlug);
router.delete("/:productId", ProductController.deleteProduct);
router.patch("/:productId", 
  (req, res, next) => {
    productUpload(req, res, (err) => {
      if(err) return next(err);

      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      }

      (req as any).thumbnailImage = files?.["thumbnailImage"]?.[0];
      (req as any).sizeGuidImage = files?.["sizeGuidImage"]?.[0];
      (req as any).galleryFiles = files?.["file"] || [];

      next();
    })
  },
  (req, _res, next) => {
    try {
      if(req.body?.data){
         const parsed = JSON.parse(req.body.data);
         req.body = updateProductSchema.parse(parsed);
      }
      next();
    }catch(error) {
      next(error);
    }
  },
  ProductController.updateProduct
)
export const ProductRoutes = router;
