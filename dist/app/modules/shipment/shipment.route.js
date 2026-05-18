"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderShipment = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const shipment_controller_1 = require("./shipment.controller");
const auth_1 = __importDefault(require("../../middlewares/auth"));
const router = (0, express_1.Router)();
router.post("/:orderId", (0, auth_1.default)(client_1.UserRole.ADMIN), shipment_controller_1.ShipmentController.addShipmentTrackingController);
router.get("/:orderId/tracking", shipment_controller_1.ShipmentController.getShipmentTrackingController);
exports.OrderShipment = router;
