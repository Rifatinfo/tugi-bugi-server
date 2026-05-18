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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
exports.buildOrderEmailHtml = buildOrderEmailHtml;
const http_status_codes_1 = require("http-status-codes");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const delivery_config_1 = require("../../../config/delivery.config");
const parseDeliveryType_1 = require("../../../utils/parseDeliveryType");
const invoice_1 = require("../../../utils/invoice");
const invoiceUrl_1 = require("../../../utils/invoiceUrl");
const sendEmail_1 = require("../../../utils/sendEmail");
const client_1 = require("@prisma/client");
const order_constant_1 = require("./order.constant");
const paginationHelper_1 = require("../../../helpers/paginationHelper");
const getTransactionId = () => {
    return "TXN_" + Date.now() + "_" + Math.floor(Math.random() * 10000);
};
const generateOrderSerial = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
const createOrderService = (_a) => __awaiter(void 0, [_a], void 0, function* ({ payload, userId, userEmail, }) {
    const { deliveryInfo, cartItems, paymentMethod, deliveryType, checkoutEmail, } = payload;
    // =========================
    // Basic Validation
    // =========================
    if (!cartItems || cartItems.length === 0) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Cart is empty");
    }
    const deliveryCharge = delivery_config_1.DELIVERY_CHARGE[deliveryType];
    if (deliveryCharge === undefined) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid delivery option");
    }
    // =========================
    // PREPARE DATA OUTSIDE TRANSACTION
    // FIX 1: Fetch product + variant IN PARALLEL per item (was sequential)
    // FIX 2: Batch fetch all products + variants in ONE round-trip
    // =========================
    const productIds = cartItems.map((item) => item.productId);
    // Single query for all products + Single query for all variants (2 DB calls instead of 2*N)
    const [allProducts, allVariants] = yield Promise.all([
        prisma_1.default.product.findMany({
            where: { id: { in: productIds } },
            include: { images: true },
        }),
        prisma_1.default.variant.findMany({
            where: {
                productId: { in: productIds },
            },
        }),
    ]);
    const productMap = new Map(allProducts.map((p) => [p.id, p]));
    // Validate and prepare order items (pure CPU work, no DB)
    let subtotal = 0;
    const preparedOrderItems = cartItems.map((item) => {
        var _a, _b, _c;
        const product = productMap.get(item.productId);
        if (!product) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Product not found");
        }
        const variant = allVariants.find((v) => v.productId === item.productId &&
            v.color === item.color &&
            v.size === item.size);
        if (!variant) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Variant not found");
        }
        if (variant.quantity < item.quantity) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Insufficient stock for ${product.name} ${item.color} ${item.size}`);
        }
        const price = (_a = product.salePrice) !== null && _a !== void 0 ? _a : product.regularPrice;
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
            productImage: ((_c = (_b = product.images) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.url) || null,
        };
    });
    const totalAmount = subtotal + deliveryCharge;
    // =========================
    // FAST TRANSACTION ONLY
    // FIX 3: Merge variant + product stock updates into ONE loop using Promise.all
    // =========================
    const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        // Create Order
        const order = yield tx.order.create({
            data: {
                userId: userId !== null && userId !== void 0 ? userId : null,
                name: deliveryInfo.name,
                phone: deliveryInfo.phone,
                state: deliveryInfo.state,
                address: deliveryInfo.address,
                deliveryCharge,
                checkoutEmail: userEmail !== null && userEmail !== void 0 ? userEmail : checkoutEmail,
                deliveryType: (0, parseDeliveryType_1.parseDeliveryType)(deliveryType),
                subtotal,
                totalAmount,
                paymentMethod: paymentMethod === "ONLINE" ? client_1.PaymentMethod.ONLINE : client_1.PaymentMethod.COD,
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
        yield Promise.all(cartItems.flatMap((item) => [
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
        ]));
        return Object.assign(Object.assign({}, order), { deliveryType,
            deliveryCharge, items: order.items });
    }));
    // =========================
    // AFTER TRANSACTION
    // FIX 4: Fire-and-forget PDF + Email (don't block the response)
    // =========================
    const orderSerialId = generateOrderSerial();
    if (paymentMethod === "COD") {
        // Return immediately — PDF/email runs in background
        setImmediate(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const pdfBuffer = yield (0, invoice_1.generateInvoice)({
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
                    items: result.items.map((item) => ({
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
                const [invoiceUrl] = yield Promise.all([
                    (0, invoiceUrl_1.saveInvoicePdf)(pdfBuffer, `invoice-${result.id}`),
                    (() => {
                        const emailToSend = userEmail || result.checkoutEmail;
                        if (!emailToSend)
                            return Promise.resolve();
                        return (0, sendEmail_1.sendEmail)({
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
                yield prisma_1.default.order.update({
                    where: { id: result.id },
                    data: { invoiceUrl },
                });
            }
            catch (err) {
                // Log but don't crash — order is already confirmed
                console.error(`[Order ${result.id}] Post-processing failed:`, err);
            }
        }));
    }
    return {
        order: result,
        deliveryCharge: result.deliveryCharge,
    };
});
// =========================
// HELPER: Email HTML Builder (extracted for clarity)
// =========================
function buildOrderEmailHtml(result) {
    var _a;
    const BRAND = "#e8731a";
    const DARK = "#111827";
    const MUTED = "#6b7280";
    const BORDER = "#e5e7eb";
    const LIGHT = "#f9fafb";
    const SOFT = "#fff7f2";
    const itemsHtml = (_a = result.items) === null || _a === void 0 ? void 0 : _a.map((item, index) => `
      <tr>
        <td style="padding:16px;border-bottom:${index !== result.items.length - 1 ? `1px solid ${BORDER}` : "none"};vertical-align:top;">

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
    `).join("");
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
const getAllOrdersService = (params, options) => __awaiter(void 0, void 0, void 0, function* () {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper_1.paginationHelper.calculatePagination(options);
    const { searchTerm } = params, filterData = __rest(params, ["searchTerm"]);
    const andConditions = [];
    // ============ Search  =============//
    if (searchTerm) {
        andConditions.push({
            OR: order_constant_1.orderSearchableFields.map((field) => ({
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
                    equals: filterData[key],
                },
            })),
        });
    }
    const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};
    const orders = yield prisma_1.default.order.findMany({
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
    const total = yield prisma_1.default.order.count({ where: whereCondition });
    return {
        meta: {
            page,
            limit,
            total,
        },
        data: orders,
    };
});
const updateOrderStatusService = (orderId, status) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.order.update({
        where: { id: orderId },
        data: { orderStatus: status },
    });
});
const getOrderTrackingService = (orderId, userId) => __awaiter(void 0, void 0, void 0, function* () {
    const order = yield prisma_1.default.order.findFirst({
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
        throw new ApiError_1.default(404, "Order not found");
    }
    return {
        orderStatus: order.orderStatus,
        shipmentTimeline: order.shipmentTrackings,
        createdAt: order.createdAt,
    };
});
exports.orderService = {
    createOrderService,
    getAllOrdersService,
    updateOrderStatusService,
    getOrderTrackingService,
};
