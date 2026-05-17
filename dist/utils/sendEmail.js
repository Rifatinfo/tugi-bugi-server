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
        rejectUnauthorized: false,
    },
});
// async verify (better practice)
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP connection failed:", error);
    }
    else {
        console.log("✅ SMTP Server is ready");
    }
});
const sendEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, subject, html, templateName, templateData, attachments, }) {
    try {
        let finalHtml = "";
        /**
         * 1️⃣ If templateName exists → use EJS FILE
         */
        if (templateName) {
            const templatePath = path_1.default.join(process.cwd(), "templates", `${templateName}.ejs`);
            finalHtml = yield ejs_1.default.renderFile(templatePath, templateData || {});
        }
        /**
         * 2️⃣ If NO template file → use direct HTML
         *    (this is your main requirement)
         */
        else if (html) {
            finalHtml = templateData
                ? ejs_1.default.render(html, templateData) // supports variables like {{name}}
                : html; // pure HTML, no processing
        }
        /**
         * 3️⃣ Validation
         */
        if (!finalHtml) {
            throw new Error("No email content provided (html or template required)");
        }
        /**
         * 4️⃣ Send Email
         */
        const info = yield transporter.sendMail({
            from: config_1.envVars.SMTP_FROM,
            to,
            subject,
            html: finalHtml,
            attachments,
        });
        console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);
        return true;
    }
    catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }
});
exports.sendEmail = sendEmail;
