"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUserSlug = void 0;
const crypto_1 = __importDefault(require("crypto"));
const slugify_1 = __importDefault(require("slugify"));
const generateUserSlug = (name) => {
    const baseSlug = name
        ? (0, slugify_1.default)(name, { lower: true, strict: true, trim: true })
        : "user";
    // add a short random hex to ensure uniqueness
    const randomSuffix = crypto_1.default.randomBytes(3).toString("hex");
    return `${baseSlug}-${randomSuffix}`;
};
exports.generateUserSlug = generateUserSlug;
