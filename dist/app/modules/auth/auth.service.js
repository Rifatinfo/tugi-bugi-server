"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const jwtHelpers_1 = require("../../../helpers/jwtHelpers");
const config_1 = require("../../../config");
const sendEmail_1 = require("../../../utils/sendEmail");
const convertToMs = (time) => {
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
const login = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    const user = yield prisma_1.default.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: client_1.UserStatus.ACTIVE,
        },
    });
    const isCorrectPassword = yield bcryptjs_1.default.compare(payload.password, user.password);
    if (!isCorrectPassword) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Password is incorrect!");
    }
    const accessTokenExpiresIn = config_1.envVars.JWT_SECRET_EXPIRES_IN;
    const refreshTokenExpiresIn = config_1.envVars.REFRESH_TOKEN_EXPIRES_IN;
    const accessToken = jwtHelpers_1.jwtHelper.generateToken({ email: user.email, role: user.role }, config_1.envVars.JWT_SECRET, accessTokenExpiresIn);
    const refreshToken = jwtHelpers_1.jwtHelper.generateToken({ email: user.email, role: user.role }, config_1.envVars.REFRESH_TOKEN_SECRET, refreshTokenExpiresIn);
    return {
        accessToken,
        refreshToken,
        accessTokenMaxAge: convertToMs(accessTokenExpiresIn),
        refreshTokenMaxAge: convertToMs(refreshTokenExpiresIn),
        needPasswordChange: user.needPasswordChange,
    };
});
const refreshToken = (token) => __awaiter(void 0, void 0, void 0, function* () {
    let decodedData;
    try {
        decodedData = jwtHelpers_1.jwtHelper.verifyToken(token, config_1.envVars.REFRESH_TOKEN_SECRET);
    }
    catch (_a) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, "You are not authorized!");
    }
    const userData = yield prisma_1.default.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
        },
    });
    if (userData.status !== client_1.UserStatus.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "User is not active");
    }
    const accessTokenExpiresIn = config_1.envVars.JWT_SECRET_EXPIRES_IN;
    const accessToken = jwtHelpers_1.jwtHelper.generateToken({
        email: userData.email,
        role: userData.role,
    }, config_1.envVars.JWT_SECRET, accessTokenExpiresIn);
    return {
        accessToken,
        accessTokenMaxAge: convertToMs(accessTokenExpiresIn),
        needPasswordChange: userData.needPasswordChange,
    };
});
const getMe = (session) => __awaiter(void 0, void 0, void 0, function* () {
    const accessToken = session.accessToken;
    const decodedData = jwtHelpers_1.jwtHelper.verifyToken(accessToken, config_1.envVars.JWT_SECRET);
    const userData = yield prisma_1.default.user.findUniqueOrThrow({
        where: {
            email: decodedData.email,
            status: client_1.UserStatus.ACTIVE
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
});
const forgotPassword = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userData = yield prisma_1.default.user.findUniqueOrThrow({
        where: {
            email: payload.email,
            status: client_1.UserStatus.ACTIVE
        }
    });
    if (!userData.email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "User email not found");
    }
    const resetPassToken = jwtHelpers_1.jwtHelper.generateToken({ email: userData.email, role: userData.role }, config_1.envVars.RESET_PASS_SECRET, config_1.envVars.RESET_PASS_TOKEN_EXPIRES_IN);
    // const resetPassLink = `${envVars.RESET_PASS_LINK}?email=${encodeURIComponent(userData.email)}&userId=${userData.id}&token=${resetPassToken}`;
    const resetPassLink = config_1.envVars.RESET_PASS_LINK + `?email=${encodeURIComponent(userData.email)}&token=${resetPassToken}`;
    yield (0, sendEmail_1.sendEmail)({
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
                                        <td style="padding: 40px 40px 20px 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">PH Health Care</h1>
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
                                                We received a request to reset your password for your PH Health Care account. Click the button below to create a new password:
                                            </p>

                                            <!-- Button -->
                                            <table role="presentation" style="margin: 0 auto;">
                                                <tr>
                                                    <td style="border-radius: 6px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                                        <a href="<%= resetLink %>" style="border: none; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 16px; font-weight: 600; display: inline-block; border-radius: 6px;">
                                                            Reset Password
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="margin: 30px 0 20px 0; color: #666666; font-size: 14px; line-height: 20px;">
                                                Or copy and paste this link into your browser:
                                            </p>

                                            <p style="margin: 0 0 30px 0; color: #667eea; font-size: 14px; line-height: 20px; word-break: break-all;">
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
                                                © <%= year %> PH Health Care. All rights reserved.
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
            name: (_a = userData.name) !== null && _a !== void 0 ? _a : "User",
            resetLink: resetPassLink,
            year: new Date().getFullYear()
        }
    });
});
const resetPassword = (token, payload, user) => __awaiter(void 0, void 0, void 0, function* () {
    let userEmail;
    console.log("Token", token, "user", user);
    // Case 1: Token-based reset (from forgot password email)
    if (token) {
        const decodedToken = jwtHelpers_1.jwtHelper.verifyToken(token, config_1.envVars.RESET_PASS_SECRET);
        // const decodedToken = jwtHelper.verifyToken(token, envVars.JWT_SECRET! as Secret)
        if (!decodedToken) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "Invalid or expired reset token!");
        }
        // Verify email from token matches the email in payload
        if (payload.email && decodedToken.email !== payload.email) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "Email mismatch! Invalid reset request.");
        }
        userEmail = decodedToken.email;
    }
    // Case 2: Authenticated user with needPasswordChange (newly created admin/doctor)
    else if (user && user.email) {
        const authenticatedUser = yield prisma_1.default.user.findUniqueOrThrow({
            where: {
                email: user.email,
                status: client_1.UserStatus.ACTIVE
            }
        });
        // Verify user actually needs password change
        if (!authenticatedUser.needPasswordChange) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "You don't need to reset your password. Use change password instead.");
        }
        userEmail = user.email;
    }
    else {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid request. Either provide a valid token or be authenticated.");
    }
    // hash password
    const password = yield bcryptjs_1.default.hash(payload.password, Number(config_1.envVars.BCRYPT_SALT_ROUNDS));
    // update into database
    yield prisma_1.default.user.update({
        where: {
            email: userEmail
        },
        data: {
            password,
            needPasswordChange: true
        }
    });
});
const changePassword = (user, payload) => __awaiter(void 0, void 0, void 0, function* () {
    const userData = yield prisma_1.default.user.findUniqueOrThrow({
        where: {
            email: user.email,
            status: client_1.UserStatus.ACTIVE
        }
    });
    if (!userData.password) {
        throw new Error("User password not found!");
    }
    if (!userData.email) {
        throw new Error("User email not found");
    }
    const isCorrectPassword = yield bcryptjs_1.default.compare(payload.oldPassword, userData.password);
    if (!isCorrectPassword) {
        throw new Error("Password incorrect!");
    }
    const hashedPassword = yield bcryptjs_1.default.hash(payload.newPassword, Number(config_1.envVars.BCRYPT_SALT_ROUNDS));
    yield prisma_1.default.user.update({
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
});
exports.AuthService = {
    login,
    refreshToken,
    getMe,
    resetPassword,
    forgotPassword,
    changePassword
};
