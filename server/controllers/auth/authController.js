import {
  findUserByEmail,
  comparePassword,
  checkEmailExists,
  checkCompanyRegNumExists,
  registerUser,
  checkCompanyStatus,
} from "../../models/auth/authModel.js";
import passport from "passport";
import jwt from "jsonwebtoken";
import { secretKey } from "../../config/secrets.js";
import { ROLES, dashboardForRole } from "../../config/roles.js";
import { auditFromReq, logAudit, clientIp } from "../../utils/auditLogger.js";

// Sign-in attempts are audited by hand rather than by the generic middleware so
// the trail says *which account* was attempted and *why* it was turned away —
// the request itself carries no authenticated actor to attribute it to.
const auditLoginAttempt = (req, { action, outcome, email, user = null, reason }) => {
  // Every login outcome is recorded here, so the middleware stands down.
  req.auditHandled = true;
  return logAudit({
    actionType: action,
    entityType: "auth",
    actorId: user?.userid ?? null,
    actorName: user ? `${user.name} ${user.surname}` : email || "Unknown account",
    actorRole: user?.roleid ?? null,
    targetId: user?.userid ?? null,
    targetName: email || user?.email || null,
    details: reason,
    metadata: { email: email || user?.email || null },
    httpMethod: req.method,
    requestPath: "/login",
    outcome,
    ipAddress: clientIp(req),
    userAgent: req.headers["user-agent"] || null,
  });
};

const login = async (req, res, next) => {
  const loginStart = Date.now();
  const attemptedEmail = req.body?.email || null;
  passport.authenticate("local", async (err, user, info) => {
    // Time spent in passport (findUserByEmail queries + bcrypt.compare).
    console.log(`[login] auth phase: ${Date.now() - loginStart}ms`);
    if (err) {
      console.error("Authentication error:", err);
      auditLoginAttempt(req, {
        action: "LOGIN_ERROR",
        outcome: "FAILURE",
        email: attemptedEmail,
        reason: `Login failed with a server error for ${attemptedEmail || "unknown email"}`,
      });
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      auditLoginAttempt(req, {
        action: "LOGIN_FAILED",
        outcome: "FAILURE",
        email: attemptedEmail,
        reason: `Failed login for ${attemptedEmail || "unknown email"}: ${
          info?.message || "invalid email or password"
        }`,
      });
      return res
        .status(401)
        .json({ message: info?.message || "Invalid email or password" });
    }

    // Authenticated, but the account may still be barred. Each branch records a
    // LOGIN_DENIED with the specific reason.
    const denyLogin = (status, message, reason) => {
      auditLoginAttempt(req, {
        action: "LOGIN_DENIED",
        outcome: "DENIED",
        email: attemptedEmail,
        user,
        reason,
      });
      return res.status(status).json({ message });
    };

    if (user.status === "rejected") {
      console.log(`User ${user.email} was rejected (status: ${user.status})`);
      return denyLogin(
        403,
        "Your account was rejected. Please contact our admin",
        `Login denied for ${user.email}: account rejected`
      );
    }

    if (user.status === "pending") {
      console.log(
        `User ${user.email} is pending approval (status: ${user.status})`
      );
      return denyLogin(
        403,
        "Your account is pending approval.",
        `Login denied for ${user.email}: account pending approval`
      );
    }

    if (!user.roleid) {
      return denyLogin(
        403,
        "Access denied. Please contact an administrator.",
        `Login denied for ${user.email}: no role assigned`
      );
    }

    if (user.roleid !== ROLES.ADMIN) {
      if (user.table === "usertable" && user.status !== "active") {
        console.log(
          `User ${user.email} is not active (status: ${user.status})`
        );
        return denyLogin(
          403,
          "Your account is not active. Please contact an administrator.",
          `Login denied for ${user.email}: account status ${user.status}`
        );
      } else if (user.table === "m5_employee" && user.status !== true) {
        console.log(
          `Employee ${user.email} is not active (status: ${user.status})`
        );
        return denyLogin(
          403,
          "Your account is not active. Please contact an administrator.",
          `Login denied for employee ${user.email}: account inactive`
        );
      }

      if (user.company_reg_num) {
        const companyCheckStart = Date.now();
        const companyActive = await checkCompanyStatus(user.company_reg_num);
        console.log(
          `[login] company status check: ${Date.now() - companyCheckStart}ms`
        );
        if (!companyActive) {
          console.log(
            `No active company admin found for company_reg_num: ${user.company_reg_num}`
          );
          return denyLogin(
            403,
            "Your company account is not active. Please contact an administrator.",
            `Login denied for ${user.email}: company ${user.company_reg_num} is not active`
          );
        }
      }
    }

    const token = jwt.sign(
      {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        email: user.email,
        roleid: user.roleid,
        table: user.table,
        company_reg_num: user.company_reg_num,
      },
      secretKey,
      { expiresIn: "12h" }
    );

    req.session.user = {
      userid: user.userid,
      name: user.name,
      surname: user.surname,
      email: user.email,
      roleid: user.roleid,
      table: user.table,
      company_reg_num: user.company_reg_num,
    };

    const redirectUrl = dashboardForRole(user.roleid);

    auditLoginAttempt(req, {
      action: "LOGIN_SUCCESS",
      outcome: "SUCCESS",
      email: user.email,
      user,
      reason: `${user.name} ${user.surname} (${user.email}) signed in as role ${user.roleid}`,
    });

    console.log(`[login] total: ${Date.now() - loginStart}ms for ${user.email}`);
    return res.json({
      message: "Login successful",
      redirectUrl,
      token,
      user: {
        userid: user.userid,
        name: user.name,
        surname: user.surname,
        roleid: user.roleid,
        company_reg_num: user.company_reg_num,
      },
    });
  })(req, res, next);
};

const logout = (req, res) => {
  // Capture who is leaving before the session is destroyed.
  const sessionUser = req.session?.user || req.user || null;
  if (sessionUser) {
    req.auditHandled = true;
    logAudit({
      actionType: "LOGOUT",
      entityType: "auth",
      actorId: sessionUser.userid ?? null,
      actorName: [sessionUser.name, sessionUser.surname].filter(Boolean).join(" ") || null,
      actorRole: sessionUser.roleid ?? null,
      targetId: sessionUser.userid ?? null,
      targetName: sessionUser.email ?? null,
      details: `${sessionUser.email || `User ${sessionUser.userid}`} signed out`,
      httpMethod: req.method,
      requestPath: "/logout",
      outcome: "SUCCESS",
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || null,
    });
  }

  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      return res.status(200).json({ message: "Logged out successfully" });
    });
  } else {
    return res.status(200).json({ message: "Already logged out" });
  }
};

const getUserInfo = (req, res) => {
  const user = req.user || req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Please log in first" });
  }

  res.json({
    name: user.name,
    surname: user.surname,
    roleid: user.roleid,
    email: user.email,
    userid: user.userid,
  });
};

const getUserRole = (req, res) => {
  console.log("Checking user role from token or session");
  const user = req.user || req.session.user;
  if (!user) {
    return res.status(401).json({ error: "Please log in first" });
  }
  res.json({ roleid: user.roleid });
};

const checkEmail = async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email parameter is required" });
  }
  try {
    const exists = await checkEmailExists(email);
    return res.json({ exists });
  } catch (error) {
    return res.status(500).json({ error: "Server error" });
  }
};

// const register = async (req, res) => {
//   const {
//     name,
//     surname,
//     email,
//     password,
//     companyname,
//     company_reg_num,
//     cell_num,
//     cell_num2,
//     vat_reg_num,
//     account_num,
//     name_of_acc,
//     bank,
//     branch,
//     branch_code,
//     address,
//     suburb,
//     swift_code,
//     cluster_box,
//   } = req.body;

//   try {
//     if (await checkEmailExists(email)) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     if (await checkCompanyRegNumExists(company_reg_num)) {
//       return res
//         .status(400)
//         .json({ message: "Company registration number already exists" });
//     }

//     const user = await registerUser({
//       name,
//       surname,
//       email,
//       password,
//       companyname,
//       company_reg_num,
//       cell_num,
//       cell_num2,
//       vat_reg_num,
//       account_num,
//       name_of_acc,
//       bank,
//       branch,
//       branch_code,
//       address,
//       suburb,
//       swift_code,
//       cluster_box,
//     });

//     return res.status(201).json({
//       message: "Registration successful! Your account is pending approval.",
//       user,
//     });
//   } catch (error) {
//     if (error.code === "23505") {
//       if (error.constraint.includes("email")) {
//         return res.status(400).json({ message: "Email already registered" });
//       } else if (error.constraint.includes("company_reg_num")) {
//         return res
//           .status(400)
//           .json({ message: "Company registration number already exists" });
//       }
//     }
//     return res
//       .status(500)
//       .json({ message: "Server error during registration" });
//   }
// };
const register = async (req, res) => {
  const {
    name,
    surname,
    email,
    password,
    companyname,
    company_reg_num,
    cellnum,
    cell_num2,
    vat_reg_num,
    account_num,
    name_of_acc,
    bank,
    branch,
    branch_code,
    address,
    suburb,
    swift_code,
    cluster_box,
  } = req.body;

  try {
    if (await checkEmailExists(email)) {
      return res.status(400).json({ message: "Email already registered" });
    }

    if (await checkCompanyRegNumExists(company_reg_num)) {
      return res
        .status(400)
        .json({ message: "Company registration number already exists" });
    }

    const user = await registerUser({
      name,
      surname,
      email,
      password,
      companyname,
      company_reg_num,
      cellnum,
      cell_num2,
      vat_reg_num,
      account_num,
      name_of_acc,
      bank,
      branch,
      branch_code,
      address,
      suburb,
      swift_code,
      cluster_box,
    });

    auditFromReq(req, {
      actionType: "USER_REGISTERED",
      entityType: "user",
      targetId: user?.userid ?? null,
      targetName: email,
      details: `New registration: ${name} ${surname} (${email}) for company ${companyname} (${company_reg_num}) — pending approval`,
      metadata: { email, companyname, company_reg_num },
    });

    return res.status(201).json({
      message: "Registration successful! Your account is pending approval.",
      user,
    });
  } catch (error) {
    if (error.code === "23505") {
      if (error.constraint.includes("email")) {
        return res.status(400).json({ message: "Email already registered" });
      } else if (error.constraint.includes("company_reg_num")) {
        return res
          .status(400)
          .json({ message: "Company registration number already exists" });
      }
    }
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
};

export { login, logout, getUserInfo, getUserRole, checkEmail, register };
