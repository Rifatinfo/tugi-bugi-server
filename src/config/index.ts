
import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
    PORT: string,
    DATABASE_URL: string,
    NODE_ENV: string,
    JWT_SECRET: string,
    FRONTEND_URL: string,
    BCRYPT_SALT_ROUNDS: string,
    REFRESH_TOKEN_SECRET: string,
    REFRESH_TOKEN_EXPIRES_IN: string,
    JWT_SECRET_EXPIRES_IN: string,
    RESET_PASS_LINK: string,
    RESET_PASS_SECRET: string,
    RESET_PASS_TOKEN_EXPIRES_IN: string,
    SMTP_HOST : string,
    SMTP_PORT : string,
    SMTP_USER : string,
    SMTP_PASS : string,
    SMTP_FROM : string
}

const loadEnvVariable = (): EnvConfig => {
    const requiredEnvVariable: string[] = ["PORT", "DATABASE_URL", "NODE_ENV", "JWT_SECRET", "FRONTEND_URL", "BCRYPT_SALT_ROUNDS", "REFRESH_TOKEN_SECRET", "REFRESH_TOKEN_EXPIRES_IN", "JWT_SECRET_EXPIRES_IN", "RESET_PASS_LINK",  "RESET_PASS_SECRET", "RESET_PASS_TOKEN_EXPIRES_IN", "SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASS","SMTP_FROM"]

    requiredEnvVariable.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable ${key}`);
        }
    })


    return {
        PORT: process.env.PORT as string,
        DATABASE_URL: process.env.DATABASE_URL as string,
        NODE_ENV: process.env.NODE_ENV as string,
        JWT_SECRET: process.env.JWT_SECRET as string,
        FRONTEND_URL: process.env.FRONTEND_URL as string,
        BCRYPT_SALT_ROUNDS: process.env.BCRYPT_SALT_ROUNDS as string,
        REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET as string,
        REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN as string,
        JWT_SECRET_EXPIRES_IN: process.env.JWT_SECRET_EXPIRES_IN as string,
        RESET_PASS_LINK: process.env.RESET_PASS_LINK as string,
        RESET_PASS_SECRET: process.env.RESET_PASS_SECRET as string,
        RESET_PASS_TOKEN_EXPIRES_IN: process.env.RESET_PASS_TOKEN_EXPIRES_IN as string,
        SMTP_HOST: process.env.SMTP_HOST as string,
        SMTP_PORT: process.env.SMTP_PORT as string,
        SMTP_USER: process.env.SMTP_USER as string,
        SMTP_PASS: process.env.SMTP_PASS as string,
        SMTP_FROM: process.env.SMTP_FROM as string,
    }
}

export const envVars = loadEnvVariable();  