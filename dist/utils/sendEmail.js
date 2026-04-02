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
exports.sendEmail = void 0;
const ejs_1 = __importDefault(require("ejs"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const transporter = nodemailer_1.default.createTransport({
    //   host: envVars.SMTP_HOST,
    host: "smtp.gmail.com",
    //   port: Number(envVars.SMTP_PORT),
    port: 587,
    secure: false,
    auth: {
        user: config_1.envVars.SMTP_USER,
        pass: config_1.envVars.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});
transporter.verify();
console.log("✅ SMTP Server is ready");
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, templateName, templateData, attachments }) {
    try {
        // const templatePath = path.join(process.cwd(), "src", "utils", "templates", `${templateName}.ejs`);
        const templatePath = path_1.default.join(process.cwd(), "src", "templates", `${templateName}.ejs`);
        console.log("Template path:", templatePath);
        console.log("Template path:", templatePath, templateData);
        const html = yield ejs_1.default.renderFile(templatePath, templateData);
        const info = yield transporter.sendMail({
            from: config_1.envVars.SMTP_FROM,
            // from: '"Tuki Buki" <mdrifathossainsinfo@gmail.com>',
            to: to,
            subject: subject,
            html: html,
            attachments: attachments === null || attachments === void 0 ? void 0 : attachments.map(attachment => ({
                filename: attachment.filename,
                content: attachment.content,
                contentType: attachment.contentType
            }))
        });
        console.log(`\u20709\uFE0F Email send to ${to} : ${info.messageId}`);
    }
    catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }
});
exports.sendEmail = sendEmail;
