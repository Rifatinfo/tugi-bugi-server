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
    console.log("Secreate : ", envVars.RESET_PASS_SECRET, envVars.RESET_PASS_TOKEN_EXPIRES_IN)
    const resetPassToken = jwtHelper.generateToken(
        { email: userData.email!, role: userData.role },
        envVars.RESET_PASS_SECRET as Secret,
        envVars.RESET_PASS_TOKEN_EXPIRES_IN as string
    );

    // const resetPassLink = `${envVars.RESET_PASS_LINK}?email=${encodeURIComponent(userData.email)}&userId=${userData.id}&token=${resetPassToken}`;

    const resetPassLink = envVars.RESET_PASS_LINK + `?email=${encodeURIComponent(userData.email)}&token=${resetPassToken}`

    await sendEmail({
        to: userData.email,
        subject: "Reset Your Password",
        html: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #FF5000 0%, #FF5000 100%); border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Mi Shop</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px; font-weight: 600;">Reset Your Password</h2>

                            <p style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 24px;">
                                Hello <%= name %>,
                            </p>

                            <p style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 24px;">
                                We received a request to reset your password for your Mi Shop account. Click the button below to create a new password:
                            </p>

                            <!-- Button -->
                            <table role="presentation" style="margin: 0 auto;">
                                <tr>
                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #FF5000 0%, #FF5000 100%);">
                                        <a href="<%= resetLink %>" style="border: none; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block; border-radius: 6px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 20px;">
                                Or copy and paste this link into your browser:
                            </p>

                            <p style="margin: 0 0 30px 0; color: #FF5000; font-size: 14px; line-height: 20px; word-break: break-all;">
                                <%= resetLink %>
                            </p>

                            <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
                                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px; line-height: 20px;">
                                    <strong>Security Notice:</strong>
                                </p>
                                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #999999; font-size: 14px; line-height: 20px;">
                                    <li>This link will expire in 15 minutes</li>
                                    <li>If you didn't request this password reset, please ignore this email</li>
                                    <li>For security reasons, never share this link with anyone</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                                © <%= year %> Mi Shop. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                This is an automated email. Please do not reply.
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
               </html>`,
        templateData: {
            name: userData.name ?? "User",
            resetLink: resetPassLink,
            year: new Date().getFullYear()
        }
    });

};


const resetPassword = async (token: string | null, payload: { email?: string, password: string }, user?: { email: string }) => {
    let userEmail: string;
    console.log("Token", token, "user", user);
    // Case 1: Token-based reset (from forgot password email)
    if (token) {
        const decodedToken = jwtHelper.verifyToken(token, envVars.RESET_PASS_SECRET as Secret);
        // const decodedToken = jwtHelper.verifyToken(token, envVars.JWT_SECRET! as Secret)

        if (!decodedToken) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Invalid or expired reset token!");
        }

        // Verify email from token matches the email in payload
        if (payload.email && decodedToken.email !== payload.email) {
            throw new ApiError(StatusCodes.FORBIDDEN, "Email mismatch! Invalid reset request.");
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
            needPasswordChange: true
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

