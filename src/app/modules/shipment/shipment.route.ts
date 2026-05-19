import { UserRole } from "@prisma/client";
import { Router } from "express";
import { ShipmentController } from "./shipment.controller";
import auth from "../../middlewares/auth";

const router = Router();

router.post("/:orderId", auth(UserRole.ADMIN), ShipmentController.addShipmentTrackingController);
router.get(
  "/:orderId/tracking",
  ShipmentController.getShipmentTrackingController
);
export const OrderShipment = router;