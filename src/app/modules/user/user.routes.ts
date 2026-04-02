import express from "express";
import { fileUploader } from "../../../utils/fileUploader";
import { UserValidation } from "./user.validation";
import { UserController } from "./user.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

/* ===============================================
 ====================== Customer Created ============
 ============================================== */

router.post(
    "/create-customer",
    fileUploader.singleUpload("file"),
    (req, _res, next) => {
        try {
            if (!req.body?.data) {
                throw new Error("Customer data missing");
            }

            const parsed = JSON.parse(req.body.data);
            req.body = UserValidation.createUserValidationSchema.parse(parsed);

            next();
        } catch (error) {
            next(error);
        }
    },
    UserController.createCustomer
);

/* ===============================================
 ====================== Admin Created ============
 ============================================== */

router.post(
    "/create-admin",
    fileUploader.singleUpload("file"),
    (req, _res, next) => {
        try {
            if (!req.body?.data) {
                throw new Error("Admin data missing");
            }

            const parsed = JSON.parse(req.body.data);
            req.body = UserValidation.createAdminValidationSchema.parse(parsed);

            next();
        } catch (error) {
            next(error);
        }
    },
    UserController.createAdmin
);


router.get("/",  auth(UserRole.ADMIN), UserController.getAllFromDB);

export const UserRoutes = router;
