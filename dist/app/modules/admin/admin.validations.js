"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminValidationSchemas = void 0;
const zod_1 = require("zod");
const update = zod_1.z.object({
    name: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional()
});
exports.adminValidationSchemas = {
    update
};
