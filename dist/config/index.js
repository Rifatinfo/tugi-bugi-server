"use strict";
// import dotenv from 'dotenv';
// import path from 'path';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.envVars = void 0;
// dotenv.config({ path: path.join(process.cwd(), '.env') });
// export default {
//     env: process.env.NODE_ENV,
//     port: process.env.PORT,
// }
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const loadEnvVariable = () => {
    const requiredEnvVariable = ["PORT", "DATABASE_URL", "NODE_ENV"];
    requiredEnvVariable.forEach(key => {
        if (!process.env[key]) {
            throw new Error(`Missing required environment variable ${key}`);
        }
    });
    return {
        PORT: process.env.PORT,
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV
    };
};
exports.envVars = loadEnvVariable();
