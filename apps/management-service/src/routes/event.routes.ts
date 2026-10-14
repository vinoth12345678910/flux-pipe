import { Router } from "express";
import { eventController } from "../controllers/event.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/rbac.middleware";
import { Permission } from "@fluxpipe/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", requirePermission(Permission.ViewEvents), eventController.list);
router.get("/:id", requirePermission(Permission.ViewEvents), eventController.getById);

export default router;
