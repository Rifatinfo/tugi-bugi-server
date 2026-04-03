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
    host: "smtp.gmail.com",
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
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, templateName, templateData, html, attachments }) {
    try {
        let finalHtml = html;
        // 👉 If templateName exists → use EJS file
        if (templateName) {
            const templatePath = path_1.default.join(process.cwd(), "templates", `${templateName}.ejs`);
            console.log("Template path:", templatePath);
            finalHtml = yield ejs_1.default.renderFile(templatePath, templateData);
        }
        // 👉 If NO templateName but html exists → render dynamic variables inline
        else if (html) {
            finalHtml = ejs_1.default.render(html, templateData);
        }
        if (!finalHtml) {
            throw new Error("No email content provided");
        }
        const info = yield transporter.sendMail({
            from: config_1.envVars.SMTP_FROM,
            to,
            subject,
            html: finalHtml,
            attachments
        });
        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }
});
exports.sendEmail = sendEmail;
