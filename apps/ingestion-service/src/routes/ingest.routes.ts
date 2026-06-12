import { Router } from "express";
import { ingestController } from "../controllers/ingest.controller";
import { authenticateApiKey } from "../middlewares/apikey.middleware";
import { rateLimit } from "../middlewares/ratelimit.middleware";
import { validate } from "../middlewares/validation.middleware";
import { singleEventSchema, batchEventSchema } from "../validators/event.schema";

const router = Router();

router.use(authenticateApiKey);
router.use(rateLimit);

router.post("/", validate(singleEventSchema), ingestController.ingestSingle);
router.post("/batch", validate(batchEventSchema), ingestController.ingestBatch);
router.get("/:id", ingestController.getEventStatus);

export default router;
