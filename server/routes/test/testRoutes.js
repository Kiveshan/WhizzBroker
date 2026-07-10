import express from "express";
import {
  testConnectionHandler,
  testSession,
  setSessionTest,
  checkSessionTest,
  testApi,
} from "../../controllers/test/testController.js";

const router = express.Router();

router.get("/test-connection", testConnectionHandler);
router.get("/test-session", testSession);
router.get("/set-session-test", setSessionTest);
router.get("/check-session-test", checkSessionTest);
router.get("/api/test", testApi);

export default router;
