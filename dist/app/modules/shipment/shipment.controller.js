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
exports.ShipmentController = void 0;
const shipment_service_1 = require("./shipment.service");
const client_1 = require("@prisma/client");
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const addShipmentTrackingController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const { status, message, location } = req.body;
    if (!status) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Shipment status is required");
    }
    if (!Object.values(client_1.ShipmentStatus).includes(status)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Invalid shipment status");
    }
    const result = yield shipment_service_1.ShipmentService.addShipmentTrackingService(orderId, status, message, location);
    (0, sendResponse_1.default)(res, {
        statusCode: 201,
        success: true,
        message: "Shipment tracking added",
        data: result,
    });
}));
const getShipmentTrackingController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    if (!orderId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Order ID is required");
    }
    const result = yield shipment_service_1.ShipmentService.getShipmentTrackingService(orderId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Shipment tracking fetched successfully",
        data: result,
    });
}));
exports.ShipmentController = {
    addShipmentTrackingController,
    getShipmentTrackingController,
};
