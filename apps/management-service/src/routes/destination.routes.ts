import { Router } from "express";
import { destinationController } from "../controllers/destination.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { createDestinationSchema, updateDestinationSchema } from "../validators/destination.schema";
import { requirePermission } from "../middlewares/rbac.middleware";
import { Permission } from "@fluxpipe/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/pipeline/:pipelineId", requirePermission(Permission.ViewDestination), destinationController.list);
router.post("/", requirePermission(Permission.CreateDestination), validate(createDestinationSchema), destinationController.create);
router.get("/:id", requirePermission(Permission.ViewDestination), destinationController.getById);
router.put("/:id", requirePermission(Permission.EditDestination), validate(updateDestinationSchema), destinationController.update);
router.delete("/:id", requirePermission(Permission.DeleteDestination), destinationController.delete);

export default router;
