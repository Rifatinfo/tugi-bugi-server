import { StatusCodes } from "http-status-codes";
import prisma from "../../../shared/prisma";
import ApiError from "../../errors/ApiError";
import { CreateOrderDTO } from "./order.interface";
import { DELIVERY_CHARGE } from "../../../config/delivery.config";
import { parseDeliveryType } from "../../../utils/parseDeliveryType";
import { generateInvoice } from "../../../utils/invoice";
import { saveInvoicePdf } from "../../../utils/invoiceUrl";
import { sendEmail } from "../../../utils/sendEmail";
import { OrderStatus, PaymentMethod, Prisma } from "@prisma/client";
import { orderSearchableFields } from "./order.constant";
import { paginationHelper } from "../../../helpers/paginationHelper";

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
  const {
    deliveryInfo,
    cartItems,
    paymentMethod,
    deliveryType,
    checkoutEmail,
  } = payload;

  // =========================
  // Basic Validation
  // =========================

  if (!cartItems || cartItems.length === 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Cart is empty");
  }

  const deliveryCharge = DELIVERY_CHARGE[deliveryType];

  if (deliveryCharge === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid delivery option");
  }

  // =========================
  // PREPARE DATA OUTSIDE TRANSACTION
  // FIX 1: Fetch product + variant IN PARALLEL per item (was sequential)
  // FIX 2: Batch fetch all products + variants in ONE round-trip
  // =========================

  const productIds = cartItems.map((item) => item.productId);

  // Single query for all products + Single query for all variants (2 DB calls instead of 2*N)
  const [allProducts, allVariants] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { images: true },
    }),
    prisma.variant.findMany({
      where: {
        productId: { in: productIds },
      },
    }),
  ]);

  const productMap = new Map(allProducts.map((p) => [p.id, p]));

  // Validate and prepare order items (pure CPU work, no DB)
  let subtotal = 0;
  const preparedOrderItems = cartItems.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Product not found");
    }

    const variant = allVariants.find(
      (v) =>
        v.productId === item.productId &&
        v.color === item.color &&
        v.size === item.size,
    );

    if (!variant) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Variant not found");
    }

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
      productImage: product.images?.[0]?.url || null,
    };
  });

  const totalAmount = subtotal + deliveryCharge;

  // =========================
  // FAST TRANSACTION ONLY
  // FIX 3: Merge variant + product stock updates into ONE loop using Promise.all
  // =========================

  const result = await prisma.$transaction(async (tx) => {
    // Create Order
    const order = await tx.order.create({
      data: {
        userId: userId ?? null,

        name: deliveryInfo.name,
        phone: deliveryInfo.phone,
        state: deliveryInfo.state,
        address: deliveryInfo.address,

        deliveryCharge,

        checkoutEmail: userEmail ?? checkoutEmail,

        deliveryType: parseDeliveryType(deliveryType),

        subtotal,
        totalAmount,

        paymentMethod:
          paymentMethod === "ONLINE" ? PaymentMethod.ONLINE : PaymentMethod.COD,

        orderStatus: "PENDING",
        paymentStatus: "UNPAID",

        items: {
          create: preparedOrderItems,
        },
      },
      include: {
        items: true,
      },
    });

    // FIX 3: Run ALL stock decrements in parallel (was 2 sequential for-loops)
    await Promise.all(
      cartItems.flatMap((item) => [
        tx.variant.updateMany({
          where: {
            productId: item.productId,
            color: item.color,
            size: item.size,
          },
          data: { quantity: { decrement: item.quantity } },
        }),
        tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { decrement: item.quantity } },
        }),
      ]),
    );

    return {
      ...order,
      deliveryType,
      deliveryCharge,
      items: order.items,
    };
  });

  // =========================
  // AFTER TRANSACTION
  // FIX 4: Fire-and-forget PDF + Email (don't block the response)
  // =========================

  const orderSerialId = generateOrderSerial();

  if (paymentMethod === "COD") {
    // Return immediately — PDF/email runs in background
    setImmediate(async () => {
      try {
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
        console.log("Result", result);
        // FIX 5: Save PDF + Send Email in PARALLEL (was sequential)
        const [invoiceUrl] = await Promise.all([
          saveInvoicePdf(pdfBuffer, `invoice-${result.id}`),
          (() => {
            const emailToSend = userEmail || result.checkoutEmail;
            if (!emailToSend) return Promise.resolve();

            return sendEmail({
              to: emailToSend,
              subject: "Your Order Invoice",
              html: buildOrderEmailHtml(result),
              attachments: [
                {
                  filename: `invoice-${result.id}.pdf`,
                  content: pdfBuffer,
                  contentType: "application/pdf",
                },
              ],
            });
          })(),
        ]);

        // Update invoiceUrl in background (non-blocking)
        await prisma.order.update({
          where: { id: result.id },
          data: { invoiceUrl },
        });
      } catch (err) {
        // Log but don't crash — order is already confirmed
        console.error(`[Order ${result.id}] Post-processing failed:`, err);
      }
    });
  }

  return {
    order: result,
    deliveryCharge: result.deliveryCharge,
  };
};

// =========================
// HELPER: Email HTML Builder (extracted for clarity)
// =========================

export function buildOrderEmailHtml(result: any): string {
  const BRAND = "#e8731a";
  const DARK = "#111827";
  const MUTED = "#6b7280";
  const BORDER = "#e5e7eb";
  const LIGHT = "#f9fafb";
  const SOFT = "#fff7f2";

  const itemsHtml = result.items
    ?.map(
      (item: any, index: number) => `
      <tr>
        <td style="padding:16px;border-bottom:${
          index !== result.items.length - 1 ? `1px solid ${BORDER}` : "none"
        };vertical-align:top;">

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="70" style="vertical-align:top;">
                <img
                  src="${process.env.NEXT_PUBLIC_API_URL}${item.productImage || ""}"
                  alt="${item.productName}"
                  width="56"
                  height="56"
                  style="display:block;border-radius:8px;object-fit:cover;border:1px solid ${BORDER};"
                />
              </td>

              <td style="padding-left:14px;vertical-align:top;">
                <p style="margin:0;font-size:14px;font-weight:700;color:${DARK};line-height:1.5;">
                  ${item.productName || ""}
                </p>

                <p style="margin:6px 0 0;font-size:12px;color:${MUTED};">
                  Color: ${item.color || "-"} |
                  Size: ${item.size || "-"} |
                  Qty: ${item.quantity || 0}
                </p>

                <p style="margin:6px 0 0;font-size:12px;color:${MUTED};">
                  ${item.price || 0} TK each
                </p>
              </td>

              <td align="right" style="vertical-align:top;">
                <p style="margin:0;font-size:14px;font-weight:700;color:${BRAND};">
                  ${item.total || 0} TK
                </p>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Order Confirmation</title>
</head>

<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:30px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid ${BORDER};">

          <!-- Header -->
          <tr>
            <td style="background:#1a0f05;padding:32px;">

              <p style="margin:0;font-size:12px;letter-spacing:1px;color:#f4a76a;font-weight:700;text-transform:uppercase;">
                ORDER CONFIRMED
              </p>

              <h1 style="margin:14px 0 8px;font-size:24px;color:#ffffff;line-height:1.4;">
                Thank you, <span style="color:${BRAND};">${result.name}</span>
              </h1>

              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.75);line-height:1.7;">
                Your order has been placed successfully and is now being processed.
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">

              <!-- Order Info -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin-bottom:24px;">
                <tr>

                  <td width="33%" style="padding:12px;background:${LIGHT};border:1px solid ${BORDER};border-radius:8px;">
                    <p style="margin:0;font-size:11px;color:${MUTED};font-weight:700;text-transform:uppercase;">
                      Order ID
                    </p>
                    <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:${BRAND};">
                      #${result.id}
                    </p>
                  </td>

                  <td width="2%"></td>

                  <td width="33%" style="padding:12px;background:${LIGHT};border:1px solid ${BORDER};border-radius:8px;">
                    <p style="margin:0;font-size:11px;color:${MUTED};font-weight:700;text-transform:uppercase;">
                      Payment
                    </p>
                    <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:${DARK};">
                      ${result.paymentMethod}
                    </p>
                  </td>

                  <td width="2%"></td>

                  <td width="33%" style="padding:12px;background:${LIGHT};border:1px solid ${BORDER};border-radius:8px;">
                    <p style="margin:0;font-size:11px;color:${MUTED};font-weight:700;text-transform:uppercase;">
                      Delivery
                    </p>
                    <p style="margin:6px 0 0;font-size:14px;font-weight:700;color:${DARK};">
                      ${String(result.deliveryType || "")
                        .replace("_", " ")
                        .toUpperCase()}
                    </p>
                  </td>

                </tr>
              </table>

              <!-- Items -->
              <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:${DARK};">
                Ordered Items
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border:1px solid ${BORDER};border-radius:12px;overflow:hidden;margin-bottom:24px;">
                ${itemsHtml}
              </table>

              <!-- Summary -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:${LIGHT};border:1px solid ${BORDER};border-radius:12px;padding:20px;margin-bottom:24px;">

                <tr>
                  <td style="padding-bottom:10px;font-size:14px;color:${MUTED};">
                    Subtotal
                  </td>
                  <td align="right" style="padding-bottom:10px;font-size:14px;color:${DARK};">
                    ${result.subtotal} TK
                  </td>
                </tr>

                <tr>
                  <td style="padding-bottom:14px;font-size:14px;color:${MUTED};border-bottom:1px solid ${BORDER};">
                    Shipping
                  </td>
                  <td align="right" style="padding-bottom:14px;font-size:14px;color:${DARK};border-bottom:1px solid ${BORDER};">
                    ${result.deliveryCharge} TK
                  </td>
                </tr>

                <tr>
                  <td style="padding-top:16px;font-size:16px;font-weight:700;color:${DARK};">
                    Total
                  </td>
                  <td align="right" style="padding-top:16px;font-size:22px;font-weight:700;color:${BRAND};">
                    ${result.totalAmount} TK
                  </td>
                </tr>

              </table>

              <!-- Address -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="border:1px solid ${BORDER};border-radius:12px;padding:20px;margin-bottom:24px;">

                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:${MUTED};text-transform:uppercase;">
                      Delivery Address
                    </p>

                    <p style="margin:0;font-size:15px;font-weight:700;color:${DARK};">
                      ${result.name}
                    </p>

                    <p style="margin:8px 0 0;font-size:14px;color:${MUTED};line-height:1.7;">
                      ${result.address}, ${result.state}
                    </p>

                    <p style="margin:4px 0 0;font-size:14px;color:${MUTED};">
                      ${result.phone}
                    </p>
                  </td>
                </tr>

              </table>

              <!-- Invoice Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:${SOFT};border:1px solid #f4c7a1;border-radius:12px;padding:16px;">

                <tr>
                  <td style="font-size:14px;color:${DARK};line-height:1.7;">
                    A PDF invoice is attached with this email for your records.
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background:${LIGHT};border-top:1px solid ${BORDER};">

              <p style="margin:0;font-size:12px;color:${MUTED};text-align:center;">
                Thank you for shopping with us ❤️
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

const getAllOrdersService = async (params: any, options: any) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;
  const andConditions: Prisma.OrderWhereInput[] = [];
  // ============ Search  =============//
  if (searchTerm) {
    andConditions.push({
      OR: orderSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  //=================== Filters  =================//
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereCondition: Prisma.OrderWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const orders = await prisma.order.findMany({
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    where: whereCondition,
    include: {
      items: true,

      shipmentTrackings: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
  const total = await prisma.order.count({ where: whereCondition });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: orders,
  };
};

const updateOrderStatusService = async (
  orderId: string,
  status: OrderStatus,
) => {
  return prisma.order.update({
    where: { id: orderId },
    data: { orderStatus: status },
  });
};

const getOrderTrackingService = async (orderId: string, userId: string) => {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId, //  user can see only own order
    },
    include: {
      shipmentTrackings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return {
    orderStatus: order.orderStatus,
    shipmentTimeline: order.shipmentTrackings,
    createdAt: order.createdAt,
  };
};

export const orderService = {
  createOrderService,
  getAllOrdersService,
  updateOrderStatusService,
  getOrderTrackingService,
};
