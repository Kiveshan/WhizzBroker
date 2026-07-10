import { pool } from "../../config/database.js";

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

const getSubContractorStatements = async (subei_reg_num, year, month) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT 
        sub_state_id,
        subbie_reg_num,
        date,
        amount,
        legids,
        COALESCE(vat_status, 'VAT') AS vat_status
      FROM 
        subcontractor_statements
      WHERE 
        subbie_reg_num = $1
        AND ($2::text IS NULL OR EXTRACT(YEAR FROM (date - INTERVAL '1 day')) = $2::integer)
        AND ($3::text IS NULL OR EXTRACT(MONTH FROM (date - INTERVAL '1 day')) = $3::integer)
      ORDER BY 
        date DESC,
        vat_status ASC
    `;
    const values = [subei_reg_num, year || null, month || null];
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getStatementLegIds = async (statementId, subei_reg_num) => {
  let client;
  try {
    client = await pool.connect();
    const query = `
      SELECT legids 
      FROM subcontractor_statements 
      WHERE subbie_reg_num = $1 AND sub_state_id = $2
    `;
    const values = [subei_reg_num, statementId];
    const result = await client.query(query, values);
    return result.rows.length > 0 ? result.rows[0].legids : null;
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};

const getStatementDetails = async (statementId, legKeys, subei_reg_num) => {
  let client;
  try {
    client = await pool.connect();

    // First, get the stored legids from the statement (which now contain VAT-inclusive rates)
    const statementQuery = `
      SELECT legids 
      FROM subcontractor_statements 
      WHERE sub_state_id = $1 AND subbie_reg_num = $2
    `;
    const statementResult = await client.query(statementQuery, [
      statementId,
      subei_reg_num,
    ]);

    if (statementResult.rows.length === 0) {
      throw new Error(
        `Statement ${statementId} not found for subcontractor ${subei_reg_num}`
      );
    }

    const storedLegids = statementResult.rows[0].legids;
    console.log("Stored legids from statement:", storedLegids);

    if (!storedLegids || !Array.isArray(storedLegids)) {
      throw new Error("No valid leg data found in statement");
    }

    // Extract legkeys from stored data
    const legKeysFromStatement = storedLegids.map((leg) => leg.legkey);

    // Get additional leg details from legs_m2 table for display purposes
    const query = `
      SELECT 
        l.legkey,
        l.date,
        l.startingpoint,
        l.containernumber,
        l.destination,
        l.m1key AS instruction_number,
        m1.description AS m1_description,
        c.client AS client_name
      FROM 
        legs_m2 l
      LEFT JOIN 
        m1_controller m1 ON l.m1key = m1.m1key
      LEFT JOIN
        m5_client c ON m1.client = c.m5clientkey
      WHERE l.legkey = ANY($1)
      ORDER BY l.date, l.legkey
    `;

    console.log("Executing query with legKeys:", legKeysFromStatement);
    const legDetailsResult = await client.query(query, [legKeysFromStatement]);

    // Merge leg details with stored VAT-inclusive rates
    const enrichedLegDetails = legDetailsResult.rows.map((leg) => {
      const storedLeg = storedLegids.find(
        (stored) => stored.legkey === leg.legkey
      );

      return {
        legkey: leg.legkey,
        date: leg.date,
        startingpoint: leg.startingpoint,
        containernumber: leg.containernumber,
        destination: leg.destination,
        instruction_number: leg.instruction_number,
        client_name: leg.client_name,
        // Use the VAT-inclusive rate from the stored statement
        driverrate: storedLeg ? storedLeg.driverrate : 0, // This already includes VAT
        m1_description: leg.m1_description,
      };
    });

    console.log(
      `Found ${enrichedLegDetails.length} leg details with VAT-inclusive rates`
    );
    return enrichedLegDetails;
  } catch (error) {
    console.error("Error in getStatementDetails:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
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
  getStatementLegIds,
  getCompanyInfo,
  getSubcontractorInfo,
};
