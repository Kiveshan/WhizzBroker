import { pool } from "../../config/database.js";
import {
  listStatements,
  listStatementLegs,
  parseStatementKey,
} from "./statementDerivation.js";

const getAllSubContractors = async () => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        companyname,
        location,
        contact_person,
        MIN(userid) as min_userid,
        cellnum,
        email,
        subei_reg_num
      FROM 
        m5_employee
      WHERE 
        companyname IS NOT NULL 
        AND companyname != ''
        AND location IS NOT NULL 
        AND location != ''
        AND contact_person IS NOT NULL 
        AND contact_person != ''
        AND status = true
      GROUP BY companyname, location, contact_person, cellnum, email, subei_reg_num
      ORDER BY companyname
    `;
    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Statements are derived from legs_m2, not stored — see
 * models/subcontractors/statementDerivation.js for the definition and the
 * rounding basis. `year`/`month` select the month the legs were DRIVEN.
 *
 * Shape is kept close to what the old stored query returned so the page code
 * stays recognisable, with one deliberate break: `statement_key` replaces the
 * retired `sub_state_id` serial, and `date` is now the legs month itself rather
 * than the following month that callers had to subtract a day from.
 */
const getSubContractorStatements = async (subei_reg_num, year, month) => {
  const statements = await listStatements(subei_reg_num, { year, month });

  return statements.map((row) => ({
    statement_key: row.statement_key,
    subbie_reg_num: row.subbie_reg_num,
    date: row.period,
    amount: row.amount,
    leg_count: row.leg_count,
    legids: row.legids,
    vat_status: row.vat_status,
  }));
};

/**
 * The legs behind one statement, addressed by its derived key.
 * `legKeys` is gone: the statement's legs are whatever the legs table currently
 * says they are, so accepting a caller-supplied list would let the page ask for
 * a set that no longer matches the statement it is showing.
 */
const getStatementDetails = async (statementKey, subei_reg_num) => {
  const { period, vatStatus } = parseStatementKey(statementKey);
  return listStatementLegs(subei_reg_num, period, vatStatus);
};

const getCompanyInfo = async (roleid, status) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        companyname,
        address,
        cell_num AS phone,
        email
      FROM 
        usertable
      WHERE 
        roleid = $1
        AND status = $2
        AND companyname IS NOT NULL
        AND address IS NOT NULL
        AND cell_num IS NOT NULL
        AND email IS NOT NULL
      LIMIT 1
    `;
    const values = [roleid, status];
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getSubcontractorInfo = async (subei_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        location,
        contact_person
      FROM 
        m5_employee
      WHERE 
        subei_reg_num = $1
        AND status = true
      LIMIT 1
    `;
    const values = [subei_reg_num];
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

export {
  getAllSubContractors,
  getSubContractorStatements,
  getStatementDetails,
  getCompanyInfo,
  getSubcontractorInfo,
};
