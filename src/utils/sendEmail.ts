import ejs from "ejs";
import nodemailer from "nodemailer";
import path from "path";
import { envVars } from "../config";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: envVars.SMTP_USER,
        pass: envVars.SMTP_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});

transporter.verify();
console.log("✅ SMTP Server is ready");

interface SendEmailOptions {
    to: string;
    subject: string;
    templateName?: string;   // optional now
    templateData?: Record<string, any>;
    html?: string;           // 👈 direct HTML support
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}

export const sendEmail = async ({
    to,
    subject,
    templateName,
    templateData,
    html,
    attachments
}: SendEmailOptions) => {
    try {
        let finalHtml = html;

        // 👉 If templateName exists → use EJS file
        if (templateName) {
            const templatePath = path.join(process.cwd(), "templates", `${templateName}.ejs`);
            console.log("Template path:", templatePath);

            finalHtml = await ejs.renderFile(templatePath, templateData);
        }

        // 👉 If NO templateName but html exists → render dynamic variables inline
        else if (html) {
            finalHtml = ejs.render(html, templateData); 
        }

        if (!finalHtml) {
            throw new Error("No email content provided");
        }

        const info = await transporter.sendMail({
            from: envVars.SMTP_FROM,
            to,
            subject,
            html: finalHtml,
            attachments
        });

        console.log(`📧 Email sent to ${to}: ${info.messageId}`);
        return true;

    } catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }
};