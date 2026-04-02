"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileUploader = exports.multerConfig = void 0;
const multer_1 = __importDefault(require("multer"));
//  Use memory storage (you can switch to diskStorage if needed)
const storage = multer_1.default.memoryStorage();
// Common multer configuration
exports.multerConfig = {
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 5MB
        files: 10,
    },
    fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    },
};
//  Single file upload
const singleUpload = (fieldName) => (0, multer_1.default)(exports.multerConfig).single(fieldName);
//  Multiple files upload
const multipleUpload = (fieldName, maxCount = 6) => (0, multer_1.default)(exports.multerConfig).array(fieldName, maxCount);
// Export both
exports.fileUploader = {
    singleUpload,
    multipleUpload,
};
