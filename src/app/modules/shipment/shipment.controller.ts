import { Request, Response } from "express";

import { ShipmentService } from "./shipment.service";
import { ShipmentStatus } from "@prisma/client";

import { StatusCodes } from "http-status-codes";
import ApiError from "../../errors/ApiError";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";


const addShipmentTrackingController = catchAsync(
    async (req: Request, res: Response) => {

        const { orderId } = req.params;
        const { status, message, location } = req.body;
        
        if (!status) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                "Shipment status is required"
            );
        }

        if (!Object.values(ShipmentStatus).includes(status)) {
            throw new ApiError(
                StatusCodes.BAD_REQUEST,
                "Invalid shipment status"
            );
        }
        const result = await ShipmentService.addShipmentTrackingService(
            orderId as string,
            status as ShipmentStatus,
            message,
            location
        );

        sendResponse(res, {
            statusCode: 201,
            success: true,
            message: "Shipment tracking added",
            data: result,
        });
    }
);

const getShipmentTrackingController = catchAsync(
  async (req: Request, res: Response) => {
    const { orderId } = req.params;

    if (!orderId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Order ID is required"
      );
    }

    const result =
      await ShipmentService.getShipmentTrackingService(orderId as string);

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: "Shipment tracking fetched successfully",
      data: result,
    });
  }
);

export const ShipmentController = {
    addShipmentTrackingController,
    getShipmentTrackingController,
};