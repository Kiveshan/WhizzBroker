import { testConnection } from "../../config/database.js";

const testConnectionHandler = async (req, res) => {
  console.log("Test connection endpoint hit");
  const dbTest = await testConnection();
  res.json({
    status: "ok",
    message: "Server is running",
    database: dbTest,
  });
};

const testSession = (req, res) => {
  console.log("Test session endpoint hit");
  console.log("Session:", req.session);
  console.log("Session User:", req.session.user);
  if (!req.session.user) {
    return res.json({
      status: "error",
      message: "No user in session",
      sessionExists: !!req.session,
      sessionId: req.session.id,
    });
  }
  res.json({
    status: "success",
    message: "User found in session",
    user: {
      name: req.session.user.name,
      surname: req.session.user.surname,
      roleid: req.session.user.roleid,
    },
  });
};

const setSessionTest = (req, res) => {
  req.session.testValue = "This is a test value";
  req.session.timestamp = new Date().toISOString();
  req.session.save((err) => {
    if (err) {
      console.error("Error saving session:", err);
      return res.status(500).json({ error: "Failed to save session" });
    }
    res.json({
      message: "Test value set in session",
      sessionId: req.session.id,
      testValue: req.session.testValue,
      timestamp: req.session.timestamp,
    });
  });
};

const checkSessionTest = (req, res) => {
  res.json({
    sessionId: req.session.id,
    testValue: req.session.testValue,
    timestamp: req.session.timestamp,
  });
};

const testApi = (req, res) => {
  res.json({
    message: "API is working!",
    databaseConnected: true,
  });
};

export {
  testConnectionHandler,
  testSession,
  setSessionTest,
  checkSessionTest,
  testApi,
};
