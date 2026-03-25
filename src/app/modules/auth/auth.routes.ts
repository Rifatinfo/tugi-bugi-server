
import express from 'express'
import { AuthController } from './auth.controller';


const router = express.Router();

router.get(
    "/me",
    AuthController.getMe
)

router.post(
    "/login",
    AuthController.login
)

router.post(
    '/refresh-token',
    AuthController.refreshToken
)

export const AuthRoutes = router;