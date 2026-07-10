import express from "express";
import { getLandingStats } from "../../controllers/landing/landingController.js";

const router = express.Router();

router.get("/api/landing/stats", getLandingStats);

export default router;
