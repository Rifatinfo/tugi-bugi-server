import { OrderStatus, ShipmentStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";

import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiError";

const addShipmentTrackingService = async (
    orderId: string,
    status: ShipmentStatus,
    reason?: string,
    location?: string
) => {
    return prisma.$transaction(async (tx) => {

        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });

        if (!order) {
            throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
        }
        //  Add shipment tracking (always)
        const tracking = await tx.shipmentTracking.create({
            data: {
                orderId,
                status,
                message: reason,
                location,
            },
        });

        //  CANCEL LOGIC (CENTRALIZED HERE)
        if (status === ShipmentStatus.CANCELED) {



            //  Restore stock

            for (const item of order.items) {

                //================  1. Restore PRODUCT stock ================//
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockQuantity: { increment: item.quantity },
                    },
                });

                //================  2. Restore VARIANT stock ================//
                if (item.variantId) {
                    await tx.variant.update({
                        where: { id: item.variantId },
                        data: {
                            quantity: { increment: item.quantity },
                        },
                    });
                }
            }
            //  Update order status
            await tx.order.update({
                where: { id: orderId },
                data: { orderStatus: OrderStatus.CANCELED },
            });

            return tracking;
        }

        //  AUTO ORDER STATUS SYNC
        if (status === ShipmentStatus.PACKAGE_SHIPPED) {
            await tx.order.update({
                where: { id: orderId },
                data: { orderStatus: OrderStatus.SHIPPED },
            });
        }

        if (status === ShipmentStatus.DELIVERED) {
            await tx.order.update({
                where: { id: orderId },
                data: { orderStatus: OrderStatus.DELIVERED },
            });
        }

        return tracking;
    });
};


const getShipmentTrackingService = async (orderId: string) => {
    // 1️⃣ Check order exists
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            orderStatus: true,
        },
    });

    if (!order) {
        throw new ApiError(
            StatusCodes.NOT_FOUND,
            "Order not found"
        );
    }

    // 2️⃣ Get shipment tracking history
    const trackings = await prisma.shipmentTracking.findMany({
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
};


export const ShipmentService = {
    addShipmentTrackingService,
    getShipmentTrackingService,
}