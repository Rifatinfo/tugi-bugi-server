import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import { orderService } from "./order.service";

const createOrderController = catchAsync( async (req: Request, res: Response) => {

  const userId = req.user?.id as string | undefined; 
  const userEmail = req.user?.email ?? undefined;

  const order = await orderService.createOrderService({
  payload: req.body,
  userId: req.user?.id,
  userEmail: req.user?.email ?? undefined,
});



  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Order placed successfully",
    data: order,
  });
});

export  const OrderController = {
    createOrderController
}