import { Router } from "express";
import { apikeyController } from "../controllers/apikey.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/rbac.middleware";
import { Permission } from "@fluxpipe/auth";
import { z } from "zod";
import { validate } from "../middlewares/validation.middleware";

const router = Router();

const createSchema = z.object({ name: z.string().min(1).max(255) });

router.use(authenticateJWT);

router.get("/", requirePermission(Permission.ManageApiKeys), apikeyController.list);
router.post("/", requirePermission(Permission.ManageApiKeys), validate(createSchema), apikeyController.generate);
router.delete("/:id", requirePermission(Permission.ManageApiKeys), apikeyController.revoke);

export default router;
