
import express, { NextFunction, Request, Response } from 'express'
import { AuthController } from './auth.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { authLimiter } from '../../middlewares/rateLimiter';
import ApiError from '../../errors/ApiError';


const router = express.Router();

router.get(
    "/me",
    AuthController.getMe
)

router.post(
    "/login",
    // authLimiter,
    AuthController.login
)

router.post(
    '/refresh-token',
    AuthController.refreshToken
)

router.post(
    '/change-password',
    auth(
        UserRole.ADMIN,
        UserRole.CUSTOMER,
    ),
    AuthController.changePassword
);

router.post(
    '/forgot-password',
    AuthController.forgotPassword
);

router.post(
    '/reset-password',
    (req: Request, res: Response, next: NextFunction) => {

        //user is resetting password without token and logged in newly created admin or doctor
        if (!req.headers.authorization && req.cookies.accessToken) {
            console.log(req.headers.authorization, "from reset password route guard");
            console.log(req.cookies.accessToken, "from reset password route guard");
            auth(
                UserRole.ADMIN,
                UserRole.CUSTOMER,
            ) (req, res, next);
        } else {
            //user is resetting password via email link with token
            next();
        }
    },
    AuthController.resetPassword
)
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
export const AuthRoutes = router;