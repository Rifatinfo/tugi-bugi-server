import { UserStatus } from "@prisma/client"
import prisma from "../../../shared/prisma"
import bcrypt from "bcryptjs";
import ApiError from "../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelpers";
import { Secret } from "jsonwebtoken";
import { envVars } from "../../../config";
import { sendEmail } from "../../../utils/sendEmail";

const convertToMs = (time: string): number => {
    const unit = time.slice(-1);
    const value = parseInt(time.slice(0, -1));

    switch (unit) {
        case "y": return value * 365 * 24 * 60 * 60 * 1000;
        case "M": return value * 30 * 24 * 60 * 60 * 1000;
        case "w": return value * 7 * 24 * 60 * 60 * 1000;
        case "d": return value * 24 * 60 * 60 * 1000;
        case "h": return value * 60 * 60 * 1000;
        case "m": return value * 60 * 1000;
        case "s": return value * 1000;
        default: return 1000 * 60 * 60; // default 1h
    }
};

const login = async (payload: { email: string; password: string }) => {
    const user = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: UserStatus.ACTIVE,
        },
    });

    const isCorrectPassword = await bcrypt.compare(
        payload.password,
        user.password as string
    );

    if (!isCorrectPassword) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Password is incorrect!");
    }

    const accessTokenExpiresIn = envVars.JWT_SECRET_EXPIRES_IN as string;
    const refreshTokenExpiresIn = envVars.REFRESH_TOKEN_EXPIRES_IN as string;

    const accessToken = jwtHelper.generateToken(
        { email: user.email, role: user.role },
        envVars.JWT_SECRET as Secret,
        accessTokenExpiresIn
    );

    const refreshToken = jwtHelper.generateToken(
        { email: user.email, role: user.role },
        envVars.REFRESH_TOKEN_SECRET as Secret,
        refreshTokenExpiresIn
    );

    return {
        accessToken,
        refreshToken,
        accessTokenMaxAge: convertToMs(accessTokenExpiresIn),
        refreshTokenMaxAge: convertToMs(refreshTokenExpiresIn),
        needPasswordChange: user.needPasswordChange,
    };
};

const refreshToken = async (token: string) => {
    let decodedData;

    try {
        decodedData = jwtHelper.verifyToken(
            token,
            envVars.REFRESH_TOKEN_SECRET as Secret
        );
    } catch {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
    }

    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
        },
    });

    if (userData.status !== UserStatus.ACTIVE) {
        throw new ApiError(StatusCodes.BAD_REQUEST, "User is not active");
    }

    const accessTokenExpiresIn = envVars.JWT_SECRET_EXPIRES_IN as string;

    const accessToken = jwtHelper.generateToken(
        {
            email: userData.email,
            role: userData.role,
        },
        envVars.JWT_SECRET as Secret,
        accessTokenExpiresIn
    );

    return {
        accessToken,
        accessTokenMaxAge: convertToMs(accessTokenExpiresIn),
        needPasswordChange: userData.needPasswordChange,
    };
}
const getMe = async (session: any) => {
    const accessToken = session.accessToken;
    const decodedData = jwtHelper.verifyToken(accessToken, envVars.JWT_SECRET as Secret);

    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: UserStatus.ACTIVE
        }
    });

    const { id, email, role, needPasswordChange, status } = userData;

    return {
        id,
        email,
        role,
        needPasswordChange,
        status
    };
}

const forgotPassword = async (payload: { email: string }) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: UserStatus.ACTIVE
        }
    });
    if (!userData.email) {
        throw new ApiError(StatusCodes.NOT_FOUND, "User email not found");
    }
    const resetPassToken = jwtHelper.generateToken(
        { email: userData.email!, role: userData.role },
        envVars.RESET_PASS_SECRET as Secret,
        envVars.RESET_PASS_TOKEN_EXPIRES_IN as string
    );

    // const resetPassLink = `${envVars.RESET_PASS_LINK}?email=${encodeURIComponent(userData.email)}&userId=${userData.id}&token=${resetPassToken}`;
    
    const resetPassLink = envVars.RESET_PASS_LINK + `?email=${encodeURIComponent(userData.email)}&token=${resetPassToken}`


    await sendEmail({
        to: userData.email,
        subject: "Reset Your Password | Tuki Buki",
        templateName: "forgotPassword",
        templateData: {
            name: userData.name ?? "Valued Customer",
            resetLink: resetPassLink,
            year: new Date().getFullYear(),
        },
    });

};


const resetPassword = async (token: string | null, payload: { email?: string, password: string }, user?: { email: string }) => {
    let userEmail: string;
    console.log("Token", token, "user", user);
    // Case 1: Token-based reset (from forgot password email)
    if (token) {
        const decodedToken = jwtHelper.verifyToken(token, envVars.RESET_PASS_SECRET as Secret)
        // const decodedToken = jwtHelper.verifyToken(token, envVars.JWT_SECRET! as Secret)

        if (!decodedToken) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Invalid or expired reset token!")
        }

        // Verify email from token matches the email in payload
        if (payload.email && decodedToken.email !== payload.email) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Email mismatch! Invalid reset request.")
        }

        userEmail = decodedToken.email;
    }
    // Case 2: Authenticated user with needPasswordChange (newly created admin/doctor)
    else if (user && user.email) {

        const authenticatedUser = await prisma.user.findUniqueOrThrow({
            where: {
                email: user.email,
                status: UserStatus.ACTIVE
            }
        });

        // Verify user actually needs password change
        if (!authenticatedUser.needPasswordChange) {
            throw new ApiError(StatusCodes.BAD_REQUEST, "You don't need to reset your password. Use change password instead.")
        }

        userEmail = user.email;
    } else {
        throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid request. Either provide a valid token or be authenticated.")
    }

    // hash password
    const password = await bcrypt.hash(payload.password, Number(envVars.BCRYPT_SALT_ROUNDS));

    // update into database
    await prisma.user.update({
        where: {
            email: userEmail
        },
        data: {
            password,
            needPasswordChange: true
        }
    })
};

const changePassword = async (user: any, payload: any) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            email: user.email,
            status: UserStatus.ACTIVE
        }
    });

    if (!userData.password) {
        throw new Error("User password not found!");
    }
    if (!userData.email) {
        throw new Error("User email not found");
    }

    const isCorrectPassword = await bcrypt.compare(
        payload.oldPassword,
        userData.password
    );

    if (!isCorrectPassword) {
        throw new Error("Password incorrect!");
    }

    const hashedPassword = await bcrypt.hash(
        payload.newPassword,
        Number(envVars.BCRYPT_SALT_ROUNDS)
    );

    await prisma.user.update({
        where: {
            email: userData.email
        },
        data: {
            password: hashedPassword,
            needPasswordChange: false
        }
    });

    return {
        message: "Password changed successfully!"
    };
};


export const AuthService = {
    login,
    refreshToken,
    getMe,
    resetPassword,
    forgotPassword,
    changePassword
}

