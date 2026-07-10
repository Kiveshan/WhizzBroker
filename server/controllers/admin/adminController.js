import {
  getPendingUsers,
  approveUser,
  rejectUser,
  updateUserStatus,
  getCompanyList,
  deactivateCompany,
  reactivateCompany,
  getAuditLog,
} from "../../models/admin/adminModel.js";
import { ROLES } from "../../config/roles.js";

const verifyAdmin = (req, res) => {
  const isAdmin = req.user.roleid === ROLES.ADMIN;
  res.json({ isAdmin });
};

const getPendingUsersAdmin = async (req, res) => {
  try {
    console.log("Fetching pending users...");
    const users = await getPendingUsers();
    console.log(`Found ${users.length} pending users`);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch pending users" });
  }
};

const approveUserHandler = async (req, res) => {
  try {
    const { userid, roleid } = req.body;
    console.log(`Approving user ${userid} with roleid ${roleid}`);
    if (!userid || !roleid) {
      return res
        .status(400)
        .json({ error: "User ID and role ID are required" });
    }
    await approveUser(userid, roleid);
    console.log(`User ${userid} approved successfully`);
    res.json({ message: "User approved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to approve user" });
  }
};

const rejectUserHandler = async (req, res) => {
  try {
    const { userid } = req.body;
    console.log(`Rejecting user ${userid}`);
    if (!userid) {
      return res.status(400).json({ error: "User ID is required" });
    }
    await rejectUser(userid);
    console.log(`User ${userid} rejected successfully`);
    res.json({ message: "User rejected successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to reject user" });
  }
};

const updateUserStatusHandler = async (req, res) => {
  const { userid, action, roleid } = req.body;
  console.log(`Updating user ${userid} with action ${action}`);
  if (req.user.roleid !== ROLES.ADMIN) {
    console.log("Access denied - user is not admin");
    return res.status(403).json({ message: "Access denied" });
  }
  try {
    await updateUserStatus(userid, action, roleid);
    console.log(`User ${userid} ${action}ed successfully`);
    res.json({ message: `User ${action}ed successfully` });
  } catch (err) {
    if (err.message === "Invalid action") {
      console.log(`Invalid action: ${action}`);
      res.status(400).json({ message: "Invalid action" });
    } else {
      console.error("Error updating user status:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
};

const getCompanyListHandler = async (req, res) => {
  try {
    if (req.user.roleid !== ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have permission to view all companies" });
    }
    console.log("Fetching company list...");
    const companies = await getCompanyList();
    console.log(`Found ${companies.length} companies`);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch companies" });
  }
};

const deactivateCompanyHandler = async (req, res) => {
  try {
    const { company_reg_num } = req.body;
    if (!company_reg_num) {
      return res
        .status(400)
        .json({ error: "Company registration number is required" });
    }
    if (req.user.roleid !== ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have permission to deactivate companies" });
    }
    console.log(
      `Deactivating company with registration number ${company_reg_num}`
    );
    const result = await deactivateCompany(company_reg_num);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    console.log(`Company ${result.companyname} deactivated successfully`);
    res.json({
      message: "Company and all associated users have been deactivated",
      company: result.companyname,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate company" });
  }
};

const reactivateCompanyHandler = async (req, res) => {
  try {
    const { company_reg_num } = req.body;
    if (!company_reg_num) {
      return res
        .status(400)
        .json({ error: "Company registration number is required" });
    }
    if (req.user.roleid !== ROLES.ADMIN) {
      return res
        .status(403)
        .json({ message: "You don't have permission to reactivate companies" });
    }
    console.log(
      `Reactivating company with registration number ${company_reg_num}`
    );
    const result = await reactivateCompany(company_reg_num);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    console.log(`Company ${result.companyname} reactivated successfully`);
    res.json({
      message: "Company and all associated users have been reactivated",
      company: result.companyname,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to reactivate company" });
  }
};

const getAuditLogHandler = async (req, res) => {
  try {
    const { page, limit, actionType, entityType, search, from, to } = req.query;
    const result = await getAuditLog({ page, limit, actionType, entityType, search, from, to });
    res.json(result);
  } catch (err) {
    console.error("Error fetching audit log:", err);
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
};

export {
  verifyAdmin,
  getPendingUsersAdmin,
  approveUserHandler,
  rejectUserHandler,
  updateUserStatusHandler,
  getCompanyListHandler,
  deactivateCompanyHandler,
  reactivateCompanyHandler,
  getAuditLogHandler,
};
