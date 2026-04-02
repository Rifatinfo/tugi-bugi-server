"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRoutes = void 0;
const express_1 = __importDefault(require("express"));
const fileUploader_1 = require("../../../utils/fileUploader");
const user_validation_1 = require("./user.validation");
const user_controller_1 = require("./user.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
/* ===============================================
 ====================== Customer Created ============
 ============================================== */
router.post("/create-customer", fileUploader_1.fileUploader.singleUpload("file"), (req, _res, next) => {
    var _a;
    try {
        if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.data)) {
            throw new Error("Customer data missing");
        }
        const parsed = JSON.parse(req.body.data);
        req.body = user_validation_1.UserValidation.createUserValidationSchema.parse(parsed);
        next();
    }
    catch (error) {
        next(error);
    }
}, user_controller_1.UserController.createCustomer);
/* ===============================================
 ====================== Admin Created ============
 ============================================== */
router.post("/create-admin", fileUploader_1.fileUploader.singleUpload("file"), (req, _res, next) => {
    var _a;
    try {
        if (!((_a = req.body) === null || _a === void 0 ? void 0 : _a.data)) {
            throw new Error("Admin data missing");
        }
        const parsed = JSON.parse(req.body.data);
        req.body = user_validation_1.UserValidation.createAdminValidationSchema.parse(parsed);
        next();
    }
    catch (error) {
        next(error);
    }
}, user_controller_1.UserController.createAdmin);
router.get("/", (0, auth_1.default)(client_1.UserRole.ADMIN), user_controller_1.UserController.getAllFromDB);
exports.UserRoutes = router;
