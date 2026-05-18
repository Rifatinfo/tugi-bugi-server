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
exports.OrderController = void 0;
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const order_service_1 = require("./order.service");
const pick_1 = __importDefault(require("../../../shared/pick"));
const order_constant_1 = require("./order.constant");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const createOrderController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    const userEmail = (_c = (_b = req.user) === null || _b === void 0 ? void 0 : _b.email) !== null && _c !== void 0 ? _c : undefined;
    const order = yield order_service_1.orderService.createOrderService({
        payload: req.body,
        userId: (_d = req.user) === null || _d === void 0 ? void 0 : _d.id,
        userEmail: (_f = (_e = req.user) === null || _e === void 0 ? void 0 : _e.email) !== null && _f !== void 0 ? _f : undefined,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: "Order placed successfully",
        data: order,
    });
}));
//=================== all order controllers can be added here =================//
const getAllOrdersController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const filters = (0, pick_1.default)(req.query, order_constant_1.orderFilterableFields);
    const options = (0, pick_1.default)(req.query, ["page", "limit", "sortBy", "sortOrder"]);
    const result = yield order_service_1.orderService.getAllOrdersService(filters, options);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: "Orders fetched successfully",
        meta: result.meta,
        data: result.data,
    });
}));
const updateOrderStatusController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const { status } = req.body;
    if (!status) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "Status is required");
    }
    const result = yield order_service_1.orderService.updateOrderStatusService(orderId, status);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Order status updated",
        data: result,
    });
}));
const getOrderTrackingController = (0, catchAsync_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { orderId } = req.params;
    const result = yield order_service_1.orderService.getOrderTrackingService(orderId, req.user.id);
    (0, sendResponse_1.default)(res, {
        statusCode: 200,
        success: true,
        message: "Order tracking fetched",
        data: result,
    });
}));
exports.OrderController = {
    createOrderController,
    getAllOrdersController,
    updateOrderStatusController,
    getOrderTrackingController,
};
