import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { PassThrough } from "stream";


export type OrderWithItems = {
  id: string;
  orderSerial: string;
  name: string;
  phone: string;
  address: string;
  state: string;
  checkoutEmail?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  deliveryCharge: number;
  deliveryType: string;
  subtotal: number;
  totalAmount: number;
  createdAt: Date;
  items: {
    productName: string;
    price: number;
    quantity: number;
    total: number;
    color?: string | null;
    size?: string | null;
    sku?: string | null;
  }[];
};

/**
 * Clean Modern Black Invoice
 */
export const generateInvoice = async (

  order: OrderWithItems
): Promise<Buffer> => {
  const doc = new PDFDocument({
    margin: 50,
    size: "A4",
  });

  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on("data", (chunk) => chunks.push(chunk));

  const endPromise = new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });

  doc.pipe(stream);

  /* =========================
      COLORS (Premium Design)
  ========================== */
  const colors = {
    black: "#111111",
    dark: "#1A1A1A",
    text: "#2D2D2D",
    muted: "#6B7280",
    border: "#E5E7EB",
    white: "#FFFFFF",

    primary: "#0F172A", // deep navy
    accent: "#C8A96A", // luxury gold
    soft: "#FAFAF8", // warm white

    success: "#16A34A",
    danger: "#DC2626",
  };

  /* =========================
      TOP LINE
  ========================== */
  doc.rect(0, 0, 595, 6).fill(colors.primary);

  /* =========================
      LOGO
  ========================== */
  const logoPath = path.join(process.cwd(), "src/assets/logo.png");

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, 28, {
      width: 90,
    });
  }

  /* =========================
      COMPANY INFO
  ========================== */
  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text("Tuki Buki", 50, 135);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.muted)
    .text("89/1 Holan, Dakshinkhan", 50, 165)
    .text("Dhaka, Bangladesh", 50, 180);

  /* =========================
      INVOICE TITLE
  ========================== */
  doc
    .fontSize(34)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text("INVOICE", 360, 40, {
      align: "right",
      width: 180,
    });

  /* =========================
      INVOICE META BOX
  ========================== */
  // const metaY = 90;

  // doc
  //   .roundedRect(360, metaY, 185, 95, 8)
  //   .lineWidth(1)
  //   .strokeColor(colors.accent)
  //   .stroke();

  // doc
  //   .fontSize(10)
  //   .font("Helvetica-Bold")
  //   .fillColor(colors.muted)
  //   .text("Invoice Number", 375, metaY + 15);

  // doc
  //   .fontSize(13)
  //   .font("Helvetica-Bold")
  //   .fillColor(colors.black)
  //   .text(`#${order.orderSerial}`, 375, metaY + 35);

  // doc
  //   .moveTo(375, metaY + 58)
  //   .lineTo(525, metaY + 58)
  //   .strokeColor(colors.accent)
  //   .lineWidth(0.8)
  //   .stroke();

  // doc
  //   .fontSize(10)
  //   .font("Helvetica-Bold")
  //   .fillColor(colors.muted)
  //   .text("Invoice Date", 375, metaY + 68);

  // doc
  //   .fontSize(12)
  //   .font("Helvetica")
  //   .fillColor(colors.black)
  //   .text(
  //     order.createdAt.toLocaleDateString("en-US", {
  //       year: "numeric",
  //       month: "long",
  //       day: "numeric",
  //     }),
  //     375,
  //     metaY + 85
  //   );
/* =========================
    INVOICE META BOX
========================== */

const metaY = 90;

// Increased box height from 95 → 115
doc
  .roundedRect(360, metaY, 185, 115, 8)
  .lineWidth(1)
  .strokeColor(colors.accent)
  .stroke();

doc
  .fontSize(10)
  .font("Helvetica-Bold")
  .fillColor(colors.muted)
  .text("Invoice Number", 375, metaY + 15);

doc
  .fontSize(13)
  .font("Helvetica-Bold")
  .fillColor(colors.black)
  .text(`#${order.orderSerial}`, 375, metaY + 35);

doc
  .moveTo(375, metaY + 58)
  .lineTo(525, metaY + 58)
  .strokeColor(colors.accent)
  .lineWidth(0.8)
  .stroke();

doc
  .fontSize(10)
  .font("Helvetica-Bold")
  .fillColor(colors.muted)
  .text("Invoice Date", 375, metaY + 68);

// moved text slightly upward and added proper bottom spacing
doc
  .fontSize(12)
  .font("Helvetica")
  .fillColor(colors.black)
  .text(
    order.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    375,
    metaY + 83,
    {
      width: 150,
      align: "left",
    }
  );
  /* =========================
      BILL TO
  ========================== */
  const billY = 250;

  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text("BILL TO", 50, billY);

  doc
    .moveTo(50, billY + 22)
    .lineTo(120, billY + 22)
    .strokeColor(colors.accent)
    .lineWidth(2)
    .stroke();

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor(colors.black)
    .text(order.name, 50, billY + 38);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.text)
    .text(order.address, 50, billY + 62, {
      width: 250,
    })
    .text(order.state, 50, billY + 80)
    .text(order.phone, 50, billY + 98);

  if (order.checkoutEmail) {
    doc.text(order.checkoutEmail, 50, billY + 116);
  }

  /* =========================
      PRODUCT TABLE
  ========================== */
  const tableTop = 410;

  // Header
  doc
    .roundedRect(50, tableTop, 495, 32, 4)
    .fill(colors.primary);

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colors.white)
    .text("PRODUCT", 65, tableTop + 11)
    .text("QTY", 290, tableTop + 11, {
      width: 40,
      align: "center",
    })
    .text("PRICE", 360, tableTop + 11, {
      width: 80,
      align: "right",
    })
    .text("TOTAL", 460, tableTop + 11, {
      width: 75,
      align: "right",
    });

  let y = tableTop + 45;

  order.items.forEach((item) => {
    // Row divider
    doc
      .moveTo(50, y + 30)
      .lineTo(545, y + 30)
      .strokeColor(colors.border)
      .lineWidth(1)
      .stroke();

    // Product name
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(colors.black)
      .text(item.productName, 60, y);

    // Variant
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
        .fillColor(colors.muted)
        .text(variant, 60, y + 15);
    }

    // Qty
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
      .fillColor(colors.primary)
      .text(`${item.total.toFixed(2)} TK`, 460, y, {
        width: 75,
        align: "right",
      });

    y += variant ? 45 : 35;
  });

  /* =========================
      TOTALS
  ========================== */
  y += 30;

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(colors.muted)
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
    .fillColor(colors.muted)
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

  y += 18;

  // Gold divider
  doc
    .moveTo(385, y)
    .lineTo(545, y)
    .strokeColor(colors.accent)
    .lineWidth(1.5)
    .stroke();

  y += 18;

// TOTAL

doc
  .fontSize(12) // smaller from 14
  .font("Helvetica-Bold")
  .fillColor(colors.primary)
  .text("TOTAL", 340, y, {
    width: 100,
    align: "right",
  });

doc
  .fontSize(14) // smaller from 18
  .font("Helvetica-Bold")
  .fillColor(colors.primary)
  .text(
    `${order.totalAmount.toFixed(2)} TK`,
    430,
    y,
    {
      width: 115,
      align: "right",
    }
  );

  /* =========================
      PAYMENT INFO
  ========================== */
  y += 60;

  doc
    .roundedRect(50, y, 495, 85, 10)
    .fillAndStroke(colors.soft, colors.border);

  doc
    .fontSize(12)
    .font("Helvetica-Bold")
    .fillColor(colors.primary)
    .text("PAYMENT INFORMATION", 65, y + 18);

  doc
    .moveTo(65, y + 40)
    .lineTo(180, y + 40)
    .strokeColor(colors.accent)
    .lineWidth(2)
    .stroke();

  // Method
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(colors.muted)
    .text("Payment Method:", 65, y + 55);

  doc
    .font("Helvetica")
    .fillColor(colors.black)
    .text(order.paymentMethod, 170, y + 55);

  // Status
  doc
    .font("Helvetica-Bold")
    .fillColor(colors.muted)
    .text("Status:", 340, y + 55);

  doc
    .font("Helvetica-Bold")
    .fillColor(
      order.paymentStatus.toLowerCase() === "paid"
        ? colors.success
        : colors.danger
    )
    .text(order.paymentStatus.toUpperCase(), 390, y + 55);

  /* =========================
      FOOTER
  ========================== */
  doc
    .moveTo(50, 770)
    .lineTo(545, 770)
    .strokeColor(colors.accent)
    .lineWidth(1)
    .stroke();

  doc
    .fontSize(8)
    .font("Helvetica-Oblique")
    .fillColor(colors.muted)
    .text(
      "This is a system-generated invoice. No signature required.",
      50,
      780,
      {
        align: "center",
        width: 495,
      }
    );

  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Thank you for your business!", 50, 796, {
      align: "center",
      width: 495,
    });

  doc.end();

  return endPromise;
};


