import { UserStatus } from "@prisma/client"
import prisma from "../../../shared/prisma"
import bcrypt from "bcryptjs";
import ApiError from "../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { jwtHelper } from "../../../helpers/jwtHelpers";
import { Secret } from "jsonwebtoken";
import { envVars } from "../../../config";

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

    export const AuthService = {
        login,
        refreshToken,
        getMe
    }

