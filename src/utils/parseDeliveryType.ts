import { DeliveryType } from "@prisma/client";
import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import ApiError from "../app/errors/ApiError";

export const parseDeliveryType = (type: string): DeliveryType => {
  switch (type) {
    case "inside_dhaka":
    case "INSIDE_DHAKA":
      return DeliveryType.INSIDE_DHAKA;
    case "outside_dhaka":
    case "OUTSIDE_DHAKA":
      return DeliveryType.OUTSIDE_DHAKA;
    default:
      throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid delivery type");
  }
};