import { Router } from "express";
import { pipelineController } from "../controllers/pipeline.controller";
import { authenticateJWT } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { createPipelineSchema, updatePipelineSchema } from "../validators/pipeline.schema";
import { requirePermission } from "../middlewares/rbac.middleware";
import { Permission } from "@fluxpipe/auth";

const router = Router();

router.use(authenticateJWT);

router.get("/", requirePermission(Permission.ViewPipeline), pipelineController.list);
router.post("/", requirePermission(Permission.CreatePipeline), validate(createPipelineSchema), pipelineController.create);
router.get("/:id", requirePermission(Permission.ViewPipeline), pipelineController.getById);
router.put("/:id", requirePermission(Permission.EditPipeline), validate(updatePipelineSchema), pipelineController.update);
router.delete("/:id", requirePermission(Permission.DeletePipeline), pipelineController.delete);

export default router;
