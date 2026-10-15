import express from "express";
import { MANAGEMENT_ROLES } from "../../config/roles.js";
import {
  getAllDriverRatesHandler,
  getDriverRateByIdHandler,
  createDriverRateHandler,
  updateDriverRateHandler,
  deleteDriverRateHandler,
  getDriverRateUsageHandler,
  refreshDriverRateLegsHandler,
  checkRateDateOverlapsHandler,
  getDistinctRoutesHandler,
  getPeriodsForRouteHandler,
  saveRoutePeriodsHandler,
  deleteRouteHandler,
  getRouteLegDatesHandler,
  getRouteUsageCheckHandler,
  getRouteOptionsHandler,
  auditDriverRatesHandler,
  applyDriverRateFixesHandler,
} from "../../controllers/manage/driverRatesController.js";
import { verifyToken, verifyAdminAccess, requireRoles } from "../../middleware/auth.js";

const router = express.Router();

// ── Month driver-rate audit (admin tool) — before /:id to avoid param conflicts ──
router.get("/api/driver-rates/month-audit", verifyToken, verifyAdminAccess, auditDriverRatesHandler);
router.post("/api/driver-rates/month-audit/apply", verifyToken, verifyAdminAccess, applyDriverRateFixesHandler);

// ── Route-grouped endpoints (must be before /:id to avoid param conflicts) ──
router.get("/api/driver-rates/routes", verifyToken, getDistinctRoutesHandler);
router.get("/api/driver-rates/route-periods", verifyToken, getPeriodsForRouteHandler);
router.post("/api/driver-rates/route-periods", verifyToken, requireRoles(...MANAGEMENT_ROLES), saveRoutePeriodsHandler);
router.delete("/api/driver-rates/route", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteRouteHandler);
router.get("/api/driver-rates/route-leg-dates", verifyToken, getRouteLegDatesHandler);
router.get("/api/driver-rates/route-usage", verifyToken, getRouteUsageCheckHandler);
router.get("/api/driver-rates/route-options", verifyToken, getRouteOptionsHandler);

// ── Existing endpoints ───────────────────────────────────────────────────────
router.get("/api/driver-rates", verifyToken, getAllDriverRatesHandler);
router.get("/api/driver-rates/check-overlaps", verifyToken, checkRateDateOverlapsHandler);
router.get("/api/driver-rates/:id", verifyToken, getDriverRateByIdHandler);
router.get("/api/driver-rates/:id/usage", verifyToken, getDriverRateUsageHandler);
router.post("/api/driver-rates", verifyToken, requireRoles(...MANAGEMENT_ROLES), createDriverRateHandler);
router.put("/api/driver-rates/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), updateDriverRateHandler);
router.post(
  "/api/driver-rates/:id/refresh-legs",
  verifyToken,
  requireRoles(...MANAGEMENT_ROLES),
  refreshDriverRateLegsHandler
);
router.delete("/api/driver-rates/:id", verifyToken, requireRoles(...MANAGEMENT_ROLES), deleteDriverRateHandler);

export default router;
