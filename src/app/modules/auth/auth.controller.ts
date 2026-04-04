import { Request, Response } from "express"
import catchAsync from "../../../shared/catchAsync"
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { AuthService } from "./auth.service";
import ApiError from "../../errors/ApiError";

const login = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.login(req.body);

    const {
        accessToken,
        refreshToken,
        accessTokenMaxAge,
        refreshTokenMaxAge,
        needPasswordChange,
    } = result;

    res.cookie("accessToken", accessToken, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: accessTokenMaxAge,
    });

    res.cookie("refreshToken", refreshToken, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: refreshTokenMaxAge,
    });

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User Login Successfully!",
        data: {
            needPasswordChange,
        },
    });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Refresh token missing!");
    }

    const result = await AuthService.refreshToken(token);
    res.cookie("accessToken", result.accessToken, {
        secure: true,
        httpOnly: true,
        sameSite: "none",
        maxAge: result.accessTokenMaxAge,
    });

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Access token generated successfully!",
        data: {
            message: "Access token generated successfully!",
        },
    });
})
const getMe = catchAsync(async (req: Request, res: Response) => {
    const userSession = req.cookies;
    const result = await AuthService.getMe(userSession);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "User retrieve successfully!",
        data: result,
    });
})

const changePassword = catchAsync(
    async (req: Request & { user?: any }, res: Response) => {
        const user = req.user;

        const result = await AuthService.changePassword(user, req.body);

        sendResponse(res, {
            statusCode: StatusCodes.OK,
            success: true,
            message: "Password Changed successfully",
            data: result,
        });
    }
);

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
    await AuthService.forgotPassword(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Check your email!",
        data: null,
    });
});

const resetPassword = catchAsync(async (req: Request & { user?: any }, res: Response) => {
    // Extract token from Authorization header (remove "Bearer " prefix)
    // const authHeader = req.headers.authorization;

    // const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    // let token: string | undefined;
    // const authHeader = req.headers.authorization;
    // if (authHeader?.startsWith("Bearer ")) {
    //     token = authHeader.split(" ")[1];
    // } else if (req.cookies?.accessToken) {
    //     token = req.cookies.accessToken;
    // }
    const token = req.headers.authorization?.split(" ")[1];
    const user = req.user; // Will be populated if authenticated via middleware
    console.log("TokenC : ", token, "UserC", user);
    await AuthService.resetPassword(token as string, req.body, user);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Password Reset!",
        data: null,
    });
});
export const AuthController = {
    login,
    refreshToken,
    getMe,
    changePassword,
    forgotPassword,
    resetPassword
}

