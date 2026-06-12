import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { validate } from "../middlewares/validation.middleware";
import { registerSchema, loginSchema, refreshSchema } from "../validators/auth.schema";
import { authenticateJWT } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/refresh", validate(refreshSchema), authController.refresh);
router.post("/logout", authenticateJWT, authController.logout);

export default router;
