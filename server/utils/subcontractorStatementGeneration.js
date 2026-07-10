import { pool } from "../config/database.js";

/**
 * Generate statements for current month based on previous month's legs
 * If running in July: looks at June legs, generation date = July 1st
 */
const generateCurrentMonthStatements = async (specificSubeiRegNum = null) => {
  console.log("Starting subcontractor statement generation process...");

  const today = new Date();
  const currentMonth = today.getMonth(); // July = 6 (0-indexed)
  const currentYear = today.getFullYear(); // 2025

  // Generation date is 1st of current month (when function is called)
  const generationDate = new Date(currentYear, currentMonth, 1, 12, 0, 0); // July 1st, 2025
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  // Look at previous month's legs (June if running in July)
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1; // June = 5
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear; // 2025
  const legsStartDate = new Date(previousYear, previousMonth, 1, 12, 0, 0); // June 1st, 2025
  const legsEndDate = new Date(previousYear, previousMonth + 1, 0, 12, 0, 0); // June 30th, 2025
  const formattedLegsStartDate = legsStartDate.toISOString().split("T")[0];
  const formattedLegsEndDate = legsEndDate.toISOString().split("T")[0];

  console.log(`Today: ${today.toISOString().split("T")[0]}`);
  console.log(
    `Current Month: ${currentMonth + 1}, Current Year: ${currentYear}`
  );
  console.log(
    `Previous Month: ${previousMonth + 1}, Previous Year: ${previousYear}`
  );
  console.log(`Generation Date: ${formattedGenDate}`);
  console.log(
    `Looking at legs from ${formattedLegsStartDate} to ${formattedLegsEndDate}`
  );

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    let subcontractorQuery = `
      SELECT 
        e.subei_reg_num,
        e.companyname,
        e.contact_person,
        ARRAY_AGG(l.legkey) as leg_ids,
        COUNT(l.legkey) as total_legs
      FROM m5_employee e
      INNER JOIN legs_m2 l ON e.userid = l.driverid
      WHERE 
        e.subei_reg_num IS NOT NULL 
        AND e.subei_reg_num != ''
        AND l.date >= $1
        AND l.date <= $2
    `;


    const queryParams = [formattedLegsStartDate, formattedLegsEndDate];

    // Add specific subcontractor filter if provided
    if (specificSubeiRegNum) {
      subcontractorQuery += ` AND e.subei_reg_num = $3`;
      queryParams.push(specificSubeiRegNum);
    }

    subcontractorQuery += `
      GROUP BY e.subei_reg_num, e.companyname, e.contact_person
    `;

    console.log("Executing query with params:", queryParams);

    const subcontractorResult = await client.query(
      subcontractorQuery,
      queryParams
    );

    console.log(
      `Found ${subcontractorResult.rows.length} subcontractors with activity`
    );

    if (subcontractorResult.rows.length === 0) {
      const message = specificSubeiRegNum
        ? `No legs found for subcontractor ${specificSubeiRegNum} between ${formattedLegsStartDate} and ${formattedLegsEndDate}`
        : `No subcontractors with legs found between ${formattedLegsStartDate} and ${formattedLegsEndDate}`;

      await client.query("COMMIT");
      return {
        success: true,
        message,
        count: 0,
        stats: { processed: 0, created: 0, updated: 0 },
      };
    }

    // Debug: Log the first result to see the data structure
    if (subcontractorResult.rows.length > 0) {
      console.log(
        "Sample subcontractor data:",
        JSON.stringify(subcontractorResult.rows[0], null, 2)
      );
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const subcontractor of subcontractorResult.rows) {
      const result = await upsertSubcontractorStatement(
        client,
        subcontractor,
        generationDate,
        formattedGenDate
      );
      createdCount += Number(result.created || 0);
      updatedCount += Number(result.updated || 0);
      processedCount++;
    }

    await client.query("COMMIT");

    const message = specificSubeiRegNum
      ? `Statement processed for subcontractor ${specificSubeiRegNum}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Generated ${processedCount} subcontractor statements for ${formattedGenDate}. Created: ${createdCount}, Updated: ${updatedCount}`;

    console.log("Subcontractor statement generation completed successfully");
    return {
      success: true,
      message,
      count: processedCount,
      stats: {
        processed: processedCount,
        created: createdCount,
        updated: updatedCount,
      },
    };
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Error generating subcontractor statements:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Manual function to generate statements for a specific month (for testing/backfill)
 */
const generateStatementsForMonth = async (
  year,
  month,
  specificSubeiRegNum = null
) => {
  console.log(
    `Generating subcontractor statements for ${year}-${month
      .toString()
      .padStart(2, "0")}`
  );

  // Add validation for year and month
  if (!year || !month) {
    throw new Error("Year and month are required");
  }

  // Generation date is 1st of the specified month
  const generationDate = new Date(year, month - 1, 1, 12, 0, 0);
  const formattedGenDate = generationDate.toISOString().split("T")[0];

  // Look at previous month's legs
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const legsStartDate = new Date(previousYear, previousMonth - 1, 1, 12, 0, 0);
  const legsEndDate = new Date(previousYear, previousMonth, 0, 12, 0, 0);
  const formattedLegsStartDate = legsStartDate.toISOString().split("T")[0];
  const formattedLegsEndDate = legsEndDate.toISOString().split("T")[0];

  console.log(`Generation Date: ${formattedGenDate}`);
  console.log(
    `Looking at legs from ${formattedLegsStartDate} to ${formattedLegsEndDate}`
  );

  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");

    let subcontractorQuery = `
      SELECT 
        e.subei_reg_num,
        e.companyname,
        e.contact_person,
        ARRAY_AGG(l.legkey) as leg_ids,
        COUNT(l.legkey) as total_legs
      FROM m5_employee e
      INNER JOIN legs_m2 l ON e.userid = l.driverid
      WHERE 
        e.subei_reg_num IS NOT NULL 
        AND e.subei_reg_num != ''
        AND l.date >= $1
        AND l.date <= $2
    `;

    const queryParams = [formattedLegsStartDate, formattedLegsEndDate];

    // Add specific subcontractor filter if provided
    if (specificSubeiRegNum) {
      subcontractorQuery += ` AND e.subei_reg_num = $3`;
      queryParams.push(specificSubeiRegNum);
    }

    subcontractorQuery += `
      GROUP BY e.subei_reg_num, e.companyname, e.contact_person
    `;

    const subcontractorResult = await client.query(
      subcontractorQuery,
      queryParams
    );

    if (subcontractorResult.rows.length === 0) {
      const message = specificSubeiRegNum
        ? `No legs found for subcontractor ${specificSubeiRegNum} between ${formattedLegsStartDate} and ${formattedLegsEndDate}`
        : `No subcontractors with legs found between ${formattedLegsStartDate} and ${formattedLegsEndDate}`;

      await client.query("COMMIT");
      return {
        success: true,
        message,
        count: 0,
        stats: { processed: 0, created: 0, updated: 0 },
      };
    }

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    for (const subcontractor of subcontractorResult.rows) {
      const result = await upsertSubcontractorStatement(
        client,
        subcontractor,
        generationDate,
        formattedGenDate
      );
      if (result.created) {
        createdCount++;
      } else if (result.updated) {
        updatedCount++;
      }
      processedCount++;
    }

    await client.query("COMMIT");

    const message = specificSubeiRegNum
      ? `Statement processed for subcontractor ${specificSubeiRegNum}. ${
          createdCount > 0
            ? "Created new statement."
            : "Updated existing statement."
        }`
      : `Generated ${processedCount} subcontractor statements for ${year}-${month
          .toString()
          .padStart(
            2,
            "0"
          )}. Created: ${createdCount}, Updated: ${updatedCount}`;

    return {
      success: true,
      message,
      count: processedCount,
      stats: {
        processed: processedCount,
        created: createdCount,
        updated: updatedCount,
      },
    };
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Error in generateStatementsForMonth:", error);
    throw error;
  } finally {
    if (client) client.release();
  }
};

/**
 * Get leg details with VAT calculation for a subcontractor
 */
const VAT_STATUS = {
  VAT: "VAT",
  NON_VAT: "NON_VAT",
};

const getLegsWithVAT = async (client, legIds, subeiRegNum) => {
  try {
    console.log(`Getting leg details with VAT for ${legIds.length} legs`);

    // Always recompute rates from the current legs_m2.driverrate + instruction VAT.
    // We deliberately do NOT reuse rates stored on a prior statement: doing so froze
    // the VAT-inclusive amount at first generation, so any later correction to a
    // leg's driverrate would never flow through to regenerated statements.
    const legDetailsQuery = `
      SELECT
        l.legkey,
        l.driverrate as original_rate,
        l.m1key,
        COALESCE(m1.vat, 0) as vat_percentage
      FROM legs_m2 l
      LEFT JOIN m1_controller m1 ON l.m1key = m1.m1key
      WHERE l.legkey = ANY($1)
    `;

    const legDetailsResult = await client.query(legDetailsQuery, [legIds]);
    const legDetails = [];
    let totalAmount = 0;

    for (const leg of legDetailsResult.rows) {
      // Calculate rate with VAT from the current leg rate
      const originalRate = Number.parseFloat(leg.original_rate) || 0;
      const vatPercentage = Number.parseFloat(leg.vat_percentage) || 0;
      const vatAmount = (originalRate * vatPercentage) / 100;
      const finalRate = originalRate + vatAmount;

      console.log(
        `Leg ${
          leg.legkey
        }: Original R${originalRate} + VAT ${vatPercentage}% (R${vatAmount.toFixed(
          2
        )}) = R${finalRate.toFixed(2)}`
      );

      legDetails.push({
        legkey: leg.legkey,
        driverrate: finalRate,
        vatPercentage: Number.parseFloat(leg.vat_percentage) || 0,
      });

      totalAmount += finalRate;
    }

    console.log(
      `Total amount for ${legDetails.length} legs: R${totalAmount.toFixed(2)}`
    );

    return {
      legDetails,
      totalAmount,
    };
  } catch (error) {
    console.error("Error getting legs with VAT:", error);
    throw error;
  }
};

/**
 * Insert or update a statement record for a subcontractor (UPSERT)
 */
const upsertSubcontractorStatement = async (
  client,
  subcontractor,
  generationDate,
  formattedGenDate
) => {
  try {
    console.log(
      `Processing subcontractor: ${subcontractor.companyname || "Unknown"} (${
        subcontractor.subei_reg_num || "No reg num"
      })`
    );

    // Validate required fields
    if (!subcontractor.subei_reg_num) {
      console.log("Skipping subcontractor - no registration number");
      return { created: false, updated: false };
    }

    // Validate leg IDs
    if (!subcontractor.leg_ids || !Array.isArray(subcontractor.leg_ids)) {
      console.log("No leg IDs found for subcontractor");
      return { created: false, updated: false };
    }

    // Get leg details with VAT calculation
    const { legDetails, totalAmount } = await getLegsWithVAT(
      client,
      subcontractor.leg_ids,
      subcontractor.subei_reg_num
    );

    if (!legDetails.length || totalAmount <= 0) {
      console.log("Skipping subcontractor - total amount is 0 or invalid");
      return { created: 0, updated: 0 };
    }

    const groupedLegs = {
      [VAT_STATUS.VAT]: [],
      [VAT_STATUS.NON_VAT]: [],
    };

    for (const leg of legDetails) {
      if ((leg.vatPercentage || 0) > 0) {
        groupedLegs[VAT_STATUS.VAT].push(leg);
      } else {
        groupedLegs[VAT_STATUS.NON_VAT].push(leg);
      }
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const [vatStatus, legs] of Object.entries(groupedLegs)) {
      if (!legs.length) continue;

      const bucketTotal = legs.reduce(
        (sum, leg) => sum + (Number.parseFloat(leg.driverrate) || 0),
        0
      );

      if (bucketTotal <= 0) continue;

      const result = await upsertStatementForBucket(
        client,
        {
          ...subcontractor,
          leg_details: legs,
          bucketTotal,
        },
        formattedGenDate,
        vatStatus
      );

      if (result === "created") createdCount += 1;
      else if (result === "updated") updatedCount += 1;
    }

    return { created: createdCount, updated: updatedCount };
  } catch (error) {
    console.error(
      `❌ Error upserting statement for ${
        subcontractor.companyname || "Unknown"
      }: ${error}`
    );
    throw error;
  }
};

const upsertStatementForBucket = async (
  client,
  subcontractor,
  formattedGenDate,
  vatStatus
) => {
  const existingStatementQuery = `
    SELECT sub_state_id 
    FROM subcontractor_statements 
    WHERE subbie_reg_num = $1 
      AND date = $2
      AND vat_status = $3
  `;

  const existingResult = await client.query(existingStatementQuery, [
    subcontractor.subei_reg_num,
    formattedGenDate,
    vatStatus,
  ]);

  const legPayload = JSON.stringify(
    subcontractor.leg_details.map(({ vatPercentage, ...rest }) => ({
      ...rest,
      vatPercentage,
    }))
  );

  if (existingResult.rows.length > 0) {
    const existingStatementId = existingResult.rows[0].sub_state_id;
    const updateQuery = `
      UPDATE subcontractor_statements 
      SET amount = $2, legids = $3, vat_status = $4
      WHERE sub_state_id = $1
    `;

    const updateParams = [
      existingStatementId,
      subcontractor.bucketTotal,
      legPayload,
      vatStatus,
    ];

    await client.query(updateQuery, updateParams);

    console.log(
      `✅ Updated ${vatStatus} statement ${existingStatementId} for ${
        subcontractor.companyname
      } - Amount: R${subcontractor.bucketTotal.toFixed(2)} (${
        subcontractor.leg_details.length
      } legs)`
    );
    return "updated";
  }

  const insertQuery = `
    INSERT INTO subcontractor_statements (
      subbie_reg_num, 
      date, 
      amount, 
      legids,
      vat_status
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING sub_state_id
  `;

  const insertParams = [
    subcontractor.subei_reg_num,
    formattedGenDate,
    subcontractor.bucketTotal,
    legPayload,
    vatStatus,
  ];

  const insertResult = await client.query(insertQuery, insertParams);

  console.log(
    `✅ Created ${vatStatus} statement ${insertResult.rows[0].sub_state_id} for ${
      subcontractor.companyname
    } - Amount: R${subcontractor.bucketTotal.toFixed(2)} (${
      subcontractor.leg_details.length
    } legs)`
  );
  return "created";
};

export { generateStatementsForMonth, generateCurrentMonthStatements };
