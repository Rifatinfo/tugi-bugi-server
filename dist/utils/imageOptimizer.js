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
exports.optimizeAndSaveImage = void 0;
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const optimizeAndSaveImage = (file, folder //  dynamic folder
) => __awaiter(void 0, void 0, void 0, function* () {
    const uploadDir = path_1.default.join(process.cwd(), "uploads", folder);
    if (!fs_1.default.existsSync(uploadDir)) {
        fs_1.default.mkdirSync(uploadDir, { recursive: true });
    }
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filepath = path_1.default.join(uploadDir, filename);
    yield (0, sharp_1.default)(file.buffer)
        .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
    })
        .webp({ quality: 80 })
        .toFile(filepath);
    return filename;
});
exports.optimizeAndSaveImage = optimizeAndSaveImage;
