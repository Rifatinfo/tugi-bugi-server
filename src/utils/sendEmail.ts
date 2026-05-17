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
        rejectUnauthorized: false,
    },
});

// async verify (better practice)
transporter.verify((error, success) => {
    if (error) {
        console.error("❌ SMTP connection failed:", error);
    } else {
        console.log("✅ SMTP Server is ready");
    }
});

interface SendEmailOptions {
    to: string;
    subject: string;

    // OPTION 1: direct HTML string (recommended)
    html?: string;

    // OPTION 2: EJS template file (optional)
    templateName?: string;
    templateData?: Record<string, any>;

    // PDF / files (invoice support)
    attachments?: {
        filename: string;
        content: Buffer | string;
        contentType: string;
    }[];
}

export const sendEmail = async ({
    to,
    subject,
    html,
    templateName,
    templateData,
    attachments,
}: SendEmailOptions) => {
    try {
        let finalHtml = "";

        /**
         * 1️⃣ If templateName exists → use EJS FILE
         */
        if (templateName) {
            const templatePath = path.join(
                process.cwd(),
                "templates",
                `${templateName}.ejs`
            );

            finalHtml = await ejs.renderFile(templatePath, templateData || {});
        }

        /**
         * 2️⃣ If NO template file → use direct HTML
         *    (this is your main requirement)
         */
        else if (html) {
            finalHtml = templateData
                ? ejs.render(html, templateData) // supports variables like {{name}}
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
        const info = await transporter.sendMail({
            from: envVars.SMTP_FROM,
            to,
            subject,
            html: finalHtml,
            attachments,
        });

        console.log(`📧 Email sent successfully to ${to}: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Email send failed:", error);
        return false;
    }
};