"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRoutes = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
router.get("/me", auth_controller_1.AuthController.getMe);
router.post("/login", 
// authLimiter,
auth_controller_1.AuthController.login);
router.post('/refresh-token', auth_controller_1.AuthController.refreshToken);
router.post('/change-password', (0, auth_1.default)(client_1.UserRole.ADMIN, client_1.UserRole.CUSTOMER), auth_controller_1.AuthController.changePassword);
router.post('/forgot-password', auth_controller_1.AuthController.forgotPassword);
router.post('/reset-password', (req, res, next) => {
    //user is resetting password without token and logged in newly created admin or doctor
    if (!req.headers.authorization && req.cookies.accessToken) {
        console.log(req.headers.authorization, "from reset password route guard");
        console.log(req.cookies.accessToken, "from reset password route guard");
        (0, auth_1.default)(client_1.UserRole.ADMIN, client_1.UserRole.CUSTOMER)(req, res, next);
    }
    else {
        //user is resetting password via email link with token
        next();
    }
}, auth_controller_1.AuthController.resetPassword);
// router.post(
//   '/reset-password',
//   (req: Request, res: Response, next: NextFunction) => {
//     const hasToken = req.headers.authorization;
//     const hasCookie = req.cookies.accessToken;
//     console.log("Token:", hasToken);
//     console.log("Cookie:", hasCookie);
//     // ✅ Case 1: Logged-in user (cookie exists, no token)
//     if (!hasToken && hasCookie) {
//       return auth(UserRole.ADMIN, UserRole.CUSTOMER)(req, res, next);
//     }
//     // ✅ Case 2: Token-based reset (from email)
//     if (hasToken) {
//       return next();
//     }
//     //  Neither token nor cookie
//     return next(new ApiError(400, "Unauthorized request reset-password"));
//   },
//   AuthController.resetPassword
// );
exports.AuthRoutes = router;
