"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderRoutes = void 0;
const express_1 = require("express");
const order_controller_1 = require("./order.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.post("/", order_controller_1.OrderController.createOrderController);
router.get("/", (0, auth_1.default)(client_1.UserRole.ADMIN), order_controller_1.OrderController.getAllOrdersController);
router.patch("/:orderId/status", (0, auth_1.default)(client_1.UserRole.ADMIN), order_controller_1.OrderController.updateOrderStatusController);
router.get("/:orderId/tracking", (0, auth_1.default)(client_1.UserRole.ADMIN), order_controller_1.OrderController.getOrderTrackingController);
exports.OrderRoutes = router;
