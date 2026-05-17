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
exports.saveInvoicePdf = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const saveInvoicePdf = (buffer, fileName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Make sure uploads/invoices folder exists
        const invoicesFolder = path_1.default.join(process.cwd(), "uploads", "invoices");
        if (!fs_1.default.existsSync(invoicesFolder)) {
            fs_1.default.mkdirSync(invoicesFolder, { recursive: true });
        }
        // Create unique file name
        const timestamp = Date.now();
        const filePath = path_1.default.join(invoicesFolder, `${fileName}-${timestamp}.pdf`);
        // Write buffer to file
        yield fs_1.default.promises.writeFile(filePath, buffer);
        // Return relative path or URL to serve
        return `/uploads/invoices/${fileName}-${timestamp}.pdf`;
        // If you want to serve via express static:
        // app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
    }
    catch (err) {
        console.error("Error saving PDF:", err);
        throw new Error(`Error saving PDF: ${err.message}`);
    }
});
exports.saveInvoicePdf = saveInvoicePdf;
