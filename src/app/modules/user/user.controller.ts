import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";
import pick from "../../../shared/pick";
import { userFilterableFields } from "./user.constant";
import { UserService } from "./user.service";

const createCustomer = catchAsync(
  async (req: Request & { file?: Express.Multer.File }, res: Response) => {
 
    const result = await UserService.createCustomer(req);
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: "Customer Created Successfully",
      data: result,
    });
  }
);

const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, userFilterableFields) // searching , filtering
    const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]) // pagination and sorting

    const result = await UserService.getAllFromDB(filters, options);

    sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "User retrieved successfully!",
        meta: result.meta,
        data: result.data
    })
});

const createAdmin = catchAsync(async (req: Request & { file?: Express.Multer.File }, res: Response) => {

    const result = await UserService.createAdmin(req);
    sendResponse(res, {
        statusCode : 201,
        success : true,
        message : "Admin Created Successfully",
        data : result
    });
});

export const UserController = {
    createCustomer,
    getAllFromDB,
    createAdmin,
};


