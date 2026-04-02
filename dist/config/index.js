"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVars = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const loadEnvVariable = () => {
    const requiredEnvVariable = ["PORT", "DATABASE_URL", "NODE_ENV", "JWT_SECRET", "FRONTEND_URL", "BCRYPT_SALT_ROUNDS", "REFRESH_TOKEN_SECRET", "REFRESH_TOKEN_EXPIRES_IN", "JWT_SECRET_EXPIRES_IN", "RESET_PASS_LINK", "RESET_PASS_SECRET", "RESET_PASS_TOKEN_EXPIRES_IN", "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
    requiredEnvVariable.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable ${key}`);
        }
    });
    return {
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        JWT_SECRET: process.env.JWT_SECRET,
        FRONTEND_URL: process.env.FRONTEND_URL,
        BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN,
        JWT_SECRET_EXPIRES_IN: process.env.JWT_SECRET_EXPIRES_IN,
        RESET_PASS_LINK: process.env.RESET_PASS_LINK,
        RESET_PASS_SECRET: process.env.RESET_PASS_SECRET,
        RESET_PASS_TOKEN_EXPIRES_IN: process.env.RESET_PASS_TOKEN_EXPIRES_IN,
        SMTP_HOST: process.env.SMTP_HOST,
        SMTP_PORT: process.env.SMTP_PORT,
        SMTP_USER: process.env.SMTP_USER,
        SMTP_PASS: process.env.SMTP_PASS,
        SMTP_FROM: process.env.SMTP_FROM,
    };
};
exports.envVars = loadEnvVariable();
