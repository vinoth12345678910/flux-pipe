import { Router } from "express";
import { deliveryController } from "../controllers/delivery.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateJWT);

router.get("/:eventId", deliveryController.getDeliveryDetails);
router.post("/:id/replay", deliveryController.replayEvent);

export default router;
