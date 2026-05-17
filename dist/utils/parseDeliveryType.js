"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDeliveryType = void 0;
const client_1 = require("@prisma/client");
const status_codes_1 = require("http-status-codes/build/cjs/status-codes");
const ApiError_1 = __importDefault(require("../app/errors/ApiError"));
const parseDeliveryType = (type) => {
    switch (type) {
        case "inside_dhaka":
        case "INSIDE_DHAKA":
            return client_1.DeliveryType.INSIDE_DHAKA;
        case "outside_dhaka":
        case "OUTSIDE_DHAKA":
            return client_1.DeliveryType.OUTSIDE_DHAKA;
        default:
            throw new ApiError_1.default(status_codes_1.StatusCodes.BAD_REQUEST, "Invalid delivery type");
    }
};
exports.parseDeliveryType = parseDeliveryType;
