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
exports.generateInvoice = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
/**
 * Clean Modern Black Invoice
 */
const generateInvoice = (order) => __awaiter(void 0, void 0, void 0, function* () {
    const doc = new pdfkit_1.default({
        margin: 50,
        size: "A4",
    });
    const stream = new stream_1.PassThrough();
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    const endPromise = new Promise((resolve, reject) => {
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
    });
    doc.pipe(stream);
    /* =========================
        COLORS
    ========================== */
    const colors = {
        black: "#000000",
        dark: "#111111",
        text: "#333333",
        gray: "#666666",
        lightGray: "#f5f5f5",
        border: "#dddddd",
        white: "#ffffff",
        success: "#16a34a",
        danger: "#dc2626",
    };
    /* =========================
        TOP LINE
    ========================== */
    doc
        .rect(0, 0, 595, 6)
        .fill(colors.black);
    /* =========================
        LOGO
    ========================== */
    const logoPath = path_1.default.join(process.cwd(), "src/assets/logo.png");
    if (fs_1.default.existsSync(logoPath)) {
        doc.image(logoPath, 50, 28, {
            width: 90,
        });
    }
    /* =========================
        COMPANY INFO
    ========================== */
    doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text("Tuki Buki", 50, 135);
    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(colors.gray)
        .text("89/1 Holan, Dakshinkhan", 50, 160)
        .text("Dhaka, Bangladesh", 50, 174);
    /* =========================
        INVOICE TITLE
    ========================== */
    doc
        .fontSize(30)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text("INVOICE", 370, 35, {
        align: "right",
        width: 170,
    });
    /* =========================
        INVOICE BOX
    ========================== */
    const metaY = 85;
    doc
        .roundedRect(360, metaY, 185, 75, 6)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();
    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(colors.gray)
        .text("Invoice Number", 375, metaY + 12);
    doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(colors.black)
        .text(`#${order.orderSerial}`, 375, metaY + 28);
    doc
        .moveTo(375, metaY + 46)
        .lineTo(525, metaY + 46)
        .strokeColor(colors.border)
        .stroke();
    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(colors.gray)
        .text("Invoice Date", 375, metaY + 54);
    doc
        .fontSize(11)
        .font("Helvetica")
        .fillColor(colors.black)
        .text(order.createdAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    }), 375, metaY + 68);
    /* =========================
        BILL TO
    ========================== */
    const billY = 235;
    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text("BILL TO", 50, billY);
    doc
        .moveTo(50, billY + 18)
        .lineTo(115, billY + 18)
        .lineWidth(1.5)
        .strokeColor(colors.black)
        .stroke();
    doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text(order.name, 50, billY + 32);
    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor(colors.text)
        .text(order.address, 50, billY + 50, {
        width: 250,
    })
        .text(order.state, 50, billY + 65)
        .text(order.phone, 50, billY + 80);
    if (order.checkoutEmail) {
        doc.text(order.checkoutEmail, 50, billY + 95);
    }
    /* =========================
        TABLE
    ========================== */
    const tableTop = 390;
    // Header background black
    doc
        .rect(50, tableTop, 495, 28)
        .fill(colors.black);
    // Headers
    doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .fillColor(colors.white)
        .text("PRODUCT", 60, tableTop + 9)
        .text("QTY", 290, tableTop + 9, {
        width: 40,
        align: "center",
    })
        .text("PRICE", 350, tableTop + 9, {
        width: 80,
        align: "right",
    })
        .text("TOTAL", 460, tableTop + 9, {
        width: 75,
        align: "right",
    });
    let y = tableTop + 40;
    order.items.forEach((item, index) => {
        // Alternate row bg
        if (index % 2 === 0) {
            doc
                .rect(50, y - 8, 495, 36)
                .fill(colors.lightGray);
        }
        // Product
        doc
            .fontSize(10)
            .font("Helvetica-Bold")
            .fillColor(colors.black)
            .text(item.productName, 60, y);
        // Variants
        const variant = [
            item.color ? `Color: ${item.color}` : "",
            item.size ? `Size: ${item.size}` : "",
            item.sku ? `SKU: ${item.sku}` : "",
        ]
            .filter(Boolean)
            .join(" • ");
        if (variant) {
            doc
                .fontSize(8)
                .font("Helvetica")
                .fillColor(colors.gray)
                .text(variant, 60, y + 14);
        }
        // Quantity
        doc
            .fontSize(10)
            .font("Helvetica")
            .fillColor(colors.text)
            .text(item.quantity.toString(), 290, y, {
            width: 40,
            align: "center",
        });
        // Price
        doc.text(`${item.price.toFixed(2)} TK`, 350, y, {
            width: 80,
            align: "right",
        });
        // Total
        doc
            .font("Helvetica-Bold")
            .fillColor(colors.black)
            .text(`${item.total.toFixed(2)} TK`, 460, y, {
            width: 75,
            align: "right",
        });
        y += variant ? 42 : 34;
    });
    // Table line
    doc
        .moveTo(50, y)
        .lineTo(545, y)
        .strokeColor(colors.border)
        .stroke();
    /* =========================
        TOTALS
    ========================== */
    y += 25;
    doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor(colors.gray)
        .text("Subtotal", 380, y, {
        width: 80,
        align: "right",
    });
    doc
        .fillColor(colors.black)
        .text(`${order.subtotal.toFixed(2)} TK`, 465, y, {
        width: 80,
        align: "right",
    });
    y += 22;
    doc
        .fillColor(colors.gray)
        .text(order.deliveryType, 380, y, {
        width: 80,
        align: "right",
    });
    doc
        .fillColor(colors.black)
        .text(`${order.deliveryCharge.toFixed(2)} TK`, 465, y, {
        width: 80,
        align: "right",
    });
    y += 12;
    doc
        .moveTo(380, y)
        .lineTo(545, y)
        .strokeColor(colors.border)
        .stroke();
    y += 18;
    // NO BACKGROUND TOTAL
    doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text("TOTAL", 380, y, {
        width: 80,
        align: "right",
    });
    doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text(`${order.totalAmount.toFixed(2)} TK`, 455, y - 2, {
        width: 90,
        align: "right",
    });
    /* =========================
        PAYMENT INFO
    ========================== */
    y += 55;
    doc
        .roundedRect(50, y, 495, 75, 8)
        .lineWidth(1)
        .strokeColor(colors.border)
        .stroke();
    doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .fillColor(colors.black)
        .text("PAYMENT INFORMATION", 65, y + 15);
    // Payment Method
    doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor(colors.gray)
        .text("Payment Method:", 65, y + 42);
    doc
        .font("Helvetica")
        .fillColor(colors.black)
        .text(order.paymentMethod, 170, y + 42);
    // Status
    doc
        .font("Helvetica-Bold")
        .fillColor(colors.gray)
        .text("Status:", 340, y + 42);
    doc
        .font("Helvetica-Bold")
        .fillColor(order.paymentStatus.toLowerCase() === "paid"
        ? colors.success
        : colors.danger)
        .text(order.paymentStatus, 390, y + 42);
    /* =========================
        FOOTER
    ========================== */
    doc
        .moveTo(50, 770)
        .lineTo(545, 770)
        .strokeColor(colors.border)
        .stroke();
    doc
        .fontSize(8)
        .font("Helvetica")
        .fillColor(colors.gray)
        .text("This is a system-generated invoice. No signature required.", 50, 780, {
        align: "center",
        width: 495,
    });
    doc
        .fontSize(8)
        .text("Thank you for your business!", 50, 794, {
        align: "center",
        width: 495,
    });
    doc.end();
    return endPromise;
});
exports.generateInvoice = generateInvoice;
