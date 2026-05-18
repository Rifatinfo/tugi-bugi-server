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
exports.ShipmentService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../../../shared/prisma"));
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const addShipmentTrackingService = (orderId, status, reason, location) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
        const order = yield tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Order not found");
        }
        //  Add shipment tracking (always)
        const tracking = yield tx.shipmentTracking.create({
            data: {
                orderId,
                status,
                message: reason,
                location,
            },
        });
        //  CANCEL LOGIC (CENTRALIZED HERE)
        if (status === client_1.ShipmentStatus.CANCELED) {
            //  Restore stock
            for (const item of order.items) {
                //================  1. Restore PRODUCT stock ================//
                yield tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQuantity: { increment: item.quantity },
                    },
                });
                //================  2. Restore VARIANT stock ================//
                if (item.variantId) {
                    yield tx.variant.update({
                        where: { id: item.variantId },
                        data: {
                            quantity: { increment: item.quantity },
                        },
                    });
                }
            }
            //  Update order status
            yield tx.order.update({
                where: { id: orderId },
                data: { orderStatus: client_1.OrderStatus.CANCELED },
            });
            return tracking;
        }
        //  AUTO ORDER STATUS SYNC
        if (status === client_1.ShipmentStatus.PACKAGE_SHIPPED) {
            yield tx.order.update({
                where: { id: orderId },
                data: { orderStatus: client_1.OrderStatus.SHIPPED },
            });
        }
        if (status === client_1.ShipmentStatus.DELIVERED) {
            yield tx.order.update({
                where: { id: orderId },
                data: { orderStatus: client_1.OrderStatus.DELIVERED },
            });
        }
        return tracking;
    }));
});
const getShipmentTrackingService = (orderId) => __awaiter(void 0, void 0, void 0, function* () {
    // 1️⃣ Check order exists
    const order = yield prisma_1.default.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            orderStatus: true,
        },
    });
    if (!order) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, "Order not found");
    }
    // 2️⃣ Get shipment tracking history
    const trackings = yield prisma_1.default.shipmentTracking.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
    });
    return {
        orderId: order.id,
        orderStatus: order.orderStatus,
        shipmentTrackings: trackings,
        latestTracking: trackings.length
            ? trackings[trackings.length - 1]
            : null,
    };
});
exports.ShipmentService = {
    addShipmentTrackingService,
    getShipmentTrackingService,
};
