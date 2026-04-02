"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserValidation = void 0;
const zod_1 = require("zod");
// Validation schema for creating a new user 
const createUserValidationSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters long").optional(),
    email: zod_1.z
        .email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(6, "Password must be at least 6 characters long"),
});
const createAdminValidationSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, "Name must be at least 2 characters long").optional(),
    email: zod_1.z
        .email("Invalid email address"),
    password: zod_1.z
        .string()
        .min(6, "Password must be at least 6 characters long"),
    phone: zod_1.z.string().min(11, "Phone must be at least 11 characters long").optional(),
});
exports.UserValidation = {
    createUserValidationSchema,
    createAdminValidationSchema
};
