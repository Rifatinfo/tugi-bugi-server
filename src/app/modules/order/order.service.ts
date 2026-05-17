import { StatusCodes } from "http-status-codes";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { CreateOrderDTO } from "./order.interface";
import { DELIVERY_CHARGE } from "../../../config/delivery.config";
import { parseDeliveryType } from "../../../utils/parseDeliveryType";
import { generateInvoice } from "../../../utils/invoice";
import { saveInvoicePdf } from "../../../utils/invoiceUrl";
import { sendEmail } from "../../../utils/sendEmail";
import { PaymentMethod } from "@prisma/client";

const getTransactionId = () => {
  return "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
};
const generateOrderSerial = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const createOrderService = async ({
  payload,
  userId,
  userEmail,
}: {
  payload: CreateOrderDTO;
  userId?: string;
  userEmail?: string;
}) => {
  const { deliveryInfo, cartItems, paymentMethod, deliveryType } = payload;

  if (!cartItems || cartItems.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cart is empty");
  }

  const deliveryCharge = DELIVERY_CHARGE[deliveryType];
  if (deliveryCharge === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid delivery option");
  }

  // ================== Database Transaction ==================
  const result = await prisma.$transaction(async (tx) => {
    let subtotal = 0;

    // ================== Prepare order items ================== //
    const orderItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { images: true },
        });
        if (!product)
          throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");

        const variant = await tx.variant.findFirst({
          where: {
            productId: item.productId,
            color: item.color,
            size: item.size,
          },
        });
        if (!variant)
          throw new ApiError(StatusCodes.NOT_FOUND, "Variant not found");
        if (variant.quantity < item.quantity) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            `Insufficient stock for ${product.name} ${item.color} ${item.size}`,
          );
        }

        const price = product.salePrice ?? product.regularPrice;
        const total = price * item.quantity;
        subtotal += total;

        return {
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          price,
          quantity: item.quantity,
          total,
          color: item.color,
          size: item.size,
          sku: product.sku,
          productImage: product.images[0]?.url || null,
        };
      }),
    );

    const totalAmount = subtotal + deliveryCharge;

    // ================== Create Order ================== //
    const order = await tx.order.create({
      data: {
        userId: userId ?? null,
        name: deliveryInfo.name,
        phone: deliveryInfo.phone,
        state: deliveryInfo.state,
        address: deliveryInfo.address,
        deliveryCharge,
        checkoutEmail: userEmail ?? payload.checkoutEmail,
        deliveryType: parseDeliveryType(deliveryType),
        subtotal,
        totalAmount,
        paymentMethod: paymentMethod === "ONLINE" ? PaymentMethod.ONLINE : PaymentMethod.COD,
        orderStatus: "PENDING",
        paymentStatus: "UNPAID",
        items: { create: orderItems }, // nested create works normally
      },
      include: { items: true },
    });

    // ================== Reduce Variant Stock ================== //
    for (const item of cartItems) {
      await tx.variant.updateMany({
        where: {
          productId: item.productId,
          color: item.color,
          size: item.size,
        },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // ================== Reduce Product Stock ================== //
    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    // ================== Create Payment ================== //

    return {
      ...order,
      //   payment,
      deliveryType,
      deliveryCharge,
      items: order.items, // preserve for invoice/email
    };
  });
  // ================== Invoice Generation ==================
  const orderSerialId = generateOrderSerial();

  let invoiceUrl: string | null = null;
  if (paymentMethod === "COD") {
    const pdfBuffer = await generateInvoice({
      id: result.id,
      orderSerial: orderSerialId,
      name: result.name,
      phone: result.phone,
      address: result.address,
      state: result.state,
      checkoutEmail: result.checkoutEmail,
      paymentMethod: "Cash on Delivery",
      paymentStatus: result.paymentStatus,
      subtotal: result.subtotal,
      totalAmount: result.totalAmount,
      deliveryType: result.deliveryType,
      deliveryCharge: result.deliveryCharge,
      createdAt: result.createdAt,
      items: result.items.map((item: any) => ({
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        color: item.color,
        size: item.size,
        sku: item.sku,
      })),
    });

    invoiceUrl = await saveInvoicePdf(pdfBuffer, `invoice-${result.id}`);

    await prisma.order.update({
      where: { id: result.id },
      data: { invoiceUrl },
    });
    // await prisma.payment.update({ where: { id: result.payment.id }, data: { invoiceUrl } });

    result.invoiceUrl = invoiceUrl;
    // result.payment.invoiceUrl = invoiceUrl;
    const emailToSend = userEmail || result.checkoutEmail;
if (emailToSend) {
  await sendEmail({
    to: emailToSend,
    subject: "Your Order Invoice",

    // ✅ DIRECT HTML (no templateName, no templateData)
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Order Confirmed</h2>

        <p>Hi <strong>${result.name}</strong>,</p>

        <p>
          Your order <strong>#${result.id}</strong> has been placed successfully.
        </p>

        <p><strong>Total:</strong> ${result.totalAmount}</p>
        <p><strong>Subtotal:</strong> ${result.subtotal}</p>
        <p><strong>Shipping:</strong> ${result.deliveryCharge}</p>
        <p><strong>Payment Method:</strong> ${result.paymentMethod}</p>

        <p><strong>Address:</strong> ${result.address}, ${result.state}</p>

        <hr />

        <h3>Items</h3>

        ${result.items
          .map(
            (item: any) => `
              <div style="display:flex; gap:10px; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:10px;">
                
                <img 
                  src="${item?.thumbnailImage}"
                  style="width:70px;height:70px;object-fit:cover;border-radius:6px;"
                />

                <div>
                  <strong>${item.productName}</strong><br/>
                  Qty: ${item.quantity}<br/>
                  Price: ${item.price} TK<br/>
                  Total: ${item.total} TK
                </div>
              </div>
            `
          )
          .join("")}

        <p style="margin-top:20px;">
          A PDF invoice is attached with this email.
        </p>

        <p>Thank you for shopping with us ❤️</p>
      </div>
    `,

    //  PDF ATTACHMENT
    attachments: [
      {
        filename: `invoice-${result.id}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
  }

  // ================== Online Payment ==================

  // ================== Cash on Delivery ==================
  return {
    order: result,
    deliveryCharge: result.deliveryCharge,
  };
};

export const orderService = {
  createOrderService,
};
