import { pool, query } from "../../config/database.js";

// Fallback total-cost calculation, used only when the controller did not
// supply a server-calculated total_cost. Derives the total from the submitted
// rate inputs — never from a client-precomputed total.
const calculateTotalCost = (instructionData) => {
  const rateWeight =
    instructionData.rateweight || instructionData.rateWeight || "Container";

  // Calculate base cost without surcharges
  let baseCost = 0;

  if (rateWeight === "Container") {
    // Container-based calculation
    const numSix = Number(instructionData.num_six_meters || 0);
    const numTwelve = Number(instructionData.num_twelve_meters || 0);
    const numAbnormal = Number(instructionData.num_abnormal || 0);
    const numBreakBulk = Number(instructionData.num_breakbulk || 0);

    const ratePer6 = numSix > 0 ? Number(instructionData.rateper_6 || 0) : 0;
    const ratePer12 =
      numTwelve > 0 ? Number(instructionData.rateper_12 || 0) : 0;
    const ratePerAbnormal =
      numAbnormal > 0 ? Number(instructionData.rateper_abnormal || 0) : 0;
    const ratePerBreakBulk =
      numBreakBulk > 0 ? Number(instructionData.rateper_breakbulk || 0) : 0;

    baseCost =
      ratePer6 * numSix +
      ratePer12 * numTwelve +
      ratePerAbnormal * numAbnormal +
      ratePerBreakBulk * numBreakBulk;
  } else {
    // Weight-based calculation (kg, ton, m³)
    const weight = Number(instructionData.weight || 0);
    const unitRate = Number(instructionData.unitrate || 0);

    baseCost = weight * unitRate;
  }

  // Add surcharge amount if applicable
  // Note: This is a simplified calculation that doesn't account for per-container surcharges
  // The frontend should be calculating the total surcharge amount correctly
  const surchargeAmount = instructionData.surcharges
    ? Number(instructionData.surchargesAmount || 0)
    : 0;
  const totalCost = baseCost + surchargeAmount;

  return Number(totalCost.toFixed(2));
};

export const getShipmentTypes = async () => {
  const sql = `
    SELECT shipkey, shipmenttype
    FROM public.shipment
    ORDER BY shipkey
  `;
  const result = await query(sql);
  return result.recordset || result.rows;
};

export const getContainersByInstructionId = async (instructionId) => {
  // Convert instructionId to string to match database type
  const instructionIdStr = String(instructionId);
  const sql = `
    SELECT 
      containerkey,
      containernum,
      weight,
      m1key,
      container_type,
      cargo_description,
      "Hazardous",
      "Add Surcharges",
      "Surcharge Amount",
      is_12m_surcharge,
      surcharge_12m_amount,
      "Hazardous Amount",
      file_ref,
      vgm,
      "vgm amount"
    FROM public.container
    WHERE m1key = $1
    ORDER BY containerkey
  `;

  console.log(
    `[${new Date().toISOString()}] getContainersByInstructionId: Executing query`,
    {
      query: sql,
      sql,
      params: [instructionIdStr],
      instructionId,
      instructionIdType: typeof instructionId,
      instructionIdStr,
      instructionIdStrType: typeof instructionIdStr,
    }
  );

  try {
    const result = await query(sql, [instructionIdStr]);
    const duration = result.duration || 0;

    console.log(
      `[${new Date().toISOString()}] getContainersByInstructionId: Query completed`,
      {
        instructionId,
        instructionIdStr,
        rowCount: result.rowCount || result.recordset?.length || 0,
        duration: `${duration}ms`,
        sampleRows: (result.rows || result.recordset || []).slice(0, 3), // Log first 3 rows as sample
      }
    );

    // Log the raw results to debug column names and values
    console.log(
      `[${new Date().toISOString()}] getContainersByInstructionId: Raw container data:`,
      {
        firstRow: result.rows?.[0] || result.recordset?.[0] || {},
        columnNames: result.rows?.[0] ? Object.keys(result.rows[0]) : [],
        hazardousValue: result.rows?.[0]?.["Hazardous"],
        addSurchargesValue: result.rows?.[0]?.["Add Surcharges"],
        hazardousType:
          result.rows?.[0]?.["Hazardous"] !== undefined
            ? typeof result.rows[0]["Hazardous"]
            : "undefined",
        addSurchargesType:
          result.rows?.[0]?.["Add Surcharges"] !== undefined
            ? typeof result.rows[0]["Add Surcharges"]
            : "undefined",
      }
    );

    // Process the results to ensure boolean values are properly converted
    const processedContainers = (result.rows || result.recordset || []).map(
      (container) => ({
        ...container,
        Hazardous:
          container["Hazardous"] === true ||
          container["Hazardous"] === "true" ||
          false,
        "Add Surcharges":
          container["Add Surcharges"] === true ||
          container["Add Surcharges"] === "true" ||
          false,
        "Surcharge Amount": container["Surcharge Amount"] || 0,
        is_12m_surcharge:
          container.is_12m_surcharge === true ||
          container.is_12m_surcharge === "true" ||
          false,
        surcharge_12m_amount: container.surcharge_12m_amount || 0,
        // VGM flags/amounts are kept in-memory only; the container table
        // no longer has dedicated VGM columns.
        "vgm":
          container["vgm"] === true ||
          container["vgm"] === "true" ||
          false,
        "vgm amount": container["vgm amount"] || 0,
      })
    );

    console.log(
      `[${new Date().toISOString()}] getContainersByInstructionId: Processed containers:`,
      {
        processedContainers: processedContainers.slice(0, 2),
        booleanValues: processedContainers.map((c) => ({
          containerkey: c.containerkey,
          Hazardous: c["Hazardous"],
          "Add Surcharges": c["Add Surcharges"],
          "Surcharge Amount": c["Surcharge Amount"],
          vgm: c["vgm"],
          "vgm amount": c["vgm amount"],
        })),
      }
    );

    return processedContainers;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error in getContainersByInstructionId:`,
      {
        error: error.message,
        stack: error.stack,
        instructionId,
        instructionIdStr,
        sql,
      }
    );
    throw error;
  }
};

// Check if a specific container for an instruction has any associated legs
// in the legs_m2 table. We key by m1key (instructionId) and containernumber
// to stay consistent with existing joins.
export const checkContainerHasLegs = async (instructionId, containerNum) => {
  const sql = `
    SELECT COUNT(*) AS leg_count
    FROM public.legs_m2
    WHERE m1key = $1 AND containernumber = $2
  `;
  const result = await query(sql, [instructionId, containerNum]);
  const count = Number(result.rows[0]?.leg_count || 0);
  return count > 0;
};

// Delete a container and any associated legs for a given instruction.
// This is used by the FC screen when the user confirms they want to
// remove a container that may already be assigned.
export const deleteContainerAndLegs = async (instructionId, containerNum) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `DELETE FROM public.legs_m2 WHERE m1key = $1 AND containernumber = $2`,
      [instructionId, containerNum]
    );

    const deleteContainerResult = await client.query(
      `DELETE FROM public.container WHERE m1key = $1 AND containernum = $2`,
      [instructionId, containerNum]
    );

    await client.query("COMMIT");

    return { deletedContainers: deleteContainerResult.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const saveInstruction = async ({
  controllerData,
  containerData = [],
  weightData = [],
}) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log(
      `DEBUG: saveInstruction called with ${containerData.length} containers`
    );

    const controllerQuery = `
      INSERT INTO public.m1_controller (
        client, "ksmFileRef", shipment_type, pickup, dropoff,
        stackdate, "lastFreeDate", "clientFileRef", rateweight,
        description, status, vat,
        num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
        weight, total_cost, booking_ref, vessel_name,
        rateper_6, rateper_12, rateper_abnormal, rateper_breakbulk, unitrate,
        is_set_rate, historical_set_rate, created_at, addon_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
      ) RETURNING m1key
    `;

    // Helper function to format date to YYYY-MM-DD
    const formatDate = (dateStr) => {
      if (!dateStr) return null;
      try {
        const date = new Date(dateStr);
        return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
      } catch (e) {
        console.error("Error formatting date:", e);
        return null;
      }
    };

    // Helper function to format time to HH:MM:SS
    const formatTime = (timeStr) => {
      if (!timeStr) return null;
      try {
        // Handle both 'HH:MM' and 'HH:MM:SS' formats
        const [hours, minutes] = timeStr.split(":");
        return `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00`;
      } catch (e) {
        console.error("Error formatting time:", e);
        return null;
      }
    };

    // Log all received fields for debugging
    console.log(
      "Raw controller data received for saving:",
      JSON.stringify(controllerData, null, 2)
    );

    // Extract all possible field name variations and ensure correct types/nulls
    const fields = {
      // Client
      client: controllerData.client || controllerData.clientId,

      // Shipment
      shipmentType:
        controllerData.shipmentTypeId || controllerData.shipment_type,

      // Dates
      pickupDate: controllerData.pickupDate || controllerData.pickupdate,
      pickupTime: controllerData.pickupTime || controllerData.pickuptime,
      stackDate: controllerData.stackDate || controllerData.stackdate,
      lastFreeDate:
        controllerData.lastFreeDate ||
        controllerData.lastfreedate ||
        controllerData.deadline, // renamed from deadline

      // File reference
      clientFileRef:
        controllerData.clientFileRef ||
        controllerData.fileRef ||
        controllerData.file_ref ||
        controllerData.fileref, // renamed from fileRef

      // Other fields
      ksmFileRef: controllerData.ksmFileRef || controllerData.task, // renamed from task
      pickup: controllerData.pickup,
      dropoff: controllerData.dropoff,
      hazardous: Boolean(controllerData.hazardous) || false,
      surcharges: Boolean(controllerData.surcharges) || false,
      surchargesAmount: controllerData.surchargesAmount || 0, // Use the surcharge amount from client rate
      rateWeight: controllerData.rateWeight,
      description: controllerData.description,
      bookingRef: controllerData.booking_ref || controllerData.bookingRef,
      vesselName: controllerData.vessel_name, // Already null if cross-haul from frontend
      weight: controllerData.weight, // Already null if container-based from frontend
      unitrate: controllerData.unitrate, // Already null if container-based from frontend
      // Preserve 0 as a valid VAT value; only default to 15 when VAT is missing
      vat:
        controllerData.vat !== undefined && controllerData.vat !== null
          ? controllerData.vat
          : 15,
      total_cost: controllerData.total_cost
        ? Number(Number(controllerData.total_cost).toFixed(2))
        : calculateTotalCost(controllerData), // Directly use frontend total_cost if available
      // Debug log for total cost
      _debug_frontend_total_cost: controllerData.total_cost,

      // Set rate flag
      is_set_rate: Boolean(controllerData.is_set_rate) || false,

      // Historical set rate value (captured at creation time)
      historical_set_rate: controllerData.historical_set_rate || null,

      // Container counts and rates (already handled for null/0 by frontend)
      num_six_meters: controllerData.num_six_meters || 0,
      num_twelve_meters: controllerData.num_twelve_meters || 0,
      num_abnormal: controllerData.num_abnormal || 0,
      num_breakbulk: controllerData.num_breakbulk || 0,
      rateper_6: controllerData.rateper_6,
      rateper_12: controllerData.rateper_12,
      rateper_abnormal: controllerData.rateper_abnormal,
      rateper_breakbulk: controllerData.rateper_breakbulk,
      addon_id: controllerData.addon_id != null ? Number(controllerData.addon_id) : null,
    };

    if (String(fields.shipmentType) === "4") {
      fields.weight = null;
    }

    console.log(
      "MODEL: Original total_cost from controller:",
      controllerData.total_cost
    );
    console.log(
      "MODEL: Calculated/processed total_cost being saved:",
      fields.total_cost
    );
    console.log("Processed fields for saving:", {
      client: fields.client,
      ksmFileRef: fields.ksmFileRef, // renamed from task
      shipmentType: fields.shipmentType,
      pickup: fields.pickup,
      dropoff: fields.dropoff,
      hazardous: fields.hazardous,
      surcharges: fields.surcharges,
      surchargeAmount: fields.surchargeAmount,
      // pickupTime and pickupDate fields removed
      stackDate: formatDate(fields.stackDate),
      lastFreeDate: formatDate(fields.lastFreeDate), // renamed from deadline
      clientFileRef: fields.clientFileRef, // renamed from fileRef
      rateWeight: fields.rateWeight,
      description: fields.description,
      status: "New",
      vat: fields.vat,
      num_six_meters: fields.num_six_meters,
      num_twelve_meters: fields.num_twelve_meters,
      num_abnormal: fields.num_abnormal,
      num_breakbulk: fields.num_breakbulk,
      weight: fields.weight,
      total_cost: fields.total_cost,
      bookingRef: fields.bookingRef,
      vesselName: fields.vesselName,
      rateper_6: fields.rateper_6,
      rateper_12: fields.rateper_12,
      rateper_abnormal: fields.rateper_abnormal,
      rateper_breakbulk: fields.rateper_breakbulk,
      unitrate: fields.unitrate,
      is_set_rate: fields.is_set_rate,
      historical_set_rate: fields.historical_set_rate,
      created_at: formatDate(new Date()),
    });

    console.log(
      "MODEL: Total cost value right before SQL insertion:",
      fields.total_cost
    );

    const controllerValues = [
      fields.client,
      fields.ksmFileRef, // renamed from task
      fields.shipmentType,
      fields.pickup,
      fields.dropoff,
      formatDate(fields.stackDate), // Will be null if cross-haul
      formatDate(fields.lastFreeDate), // renamed from deadline
      fields.clientFileRef, // renamed from fileRef
      fields.rateWeight,
      fields.description,
      "New",
      fields.vat,
      fields.num_six_meters,
      fields.num_twelve_meters,
      fields.num_abnormal,
      fields.num_breakbulk,
      fields.weight, // Will be null if container-based
      fields.total_cost, // This is the value being inserted into the database
      fields.bookingRef,
      fields.vesselName, // Will be null if cross-haul
      fields.rateper_6, // Will be null if weight-based
      fields.rateper_12, // Will be null if weight-based
      fields.rateper_abnormal, // Will be null if weight-based
      fields.rateper_breakbulk, // Will be null if weight-based or not cross-haul/container
      fields.unitrate, // Will be null if container-based
      fields.is_set_rate, // Set rate flag
      fields.historical_set_rate, // Historical set rate value
      formatDate(new Date()), // Current date for created_at
      fields.addon_id, // Link to add-on invoice (null for non-add-on instructions)
    ];

    const controllerResult = await client.query(
      controllerQuery,
      controllerValues
    );
    const m1key = controllerResult.rows[0].m1key;

    console.log("MODEL: SQL query executed. Inserted m1key:", m1key);

    // Verify the saved total_cost
    const verifyQuery = `SELECT total_cost FROM public.m1_controller WHERE m1key = $1`;
    const verifyResult = await client.query(verifyQuery, [m1key]);
    console.log(
      "MODEL: Verified total_cost in database:",
      verifyResult.rows[0]?.total_cost
    );

    // Debug logging for weightData payload
    if (Array.isArray(weightData) && weightData.length > 0) {
      console.log(
        "MODEL: weightData payload in saveInstruction:",
        JSON.stringify(weightData, null, 2)
      );

      for (const row of weightData) {
        let rowWeight = null;
        if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
          if (typeof row.weight === "string") {
            const trimmed = row.weight.trim();
            if (trimmed !== "") {
              const parsed = Number.parseFloat(trimmed);
              if (!Number.isNaN(parsed) && parsed >= 0) {
                rowWeight = parsed;
              }
            }
          } else if (typeof row.weight === "number" && row.weight >= 0) {
            rowWeight = row.weight;
          }
        }

        const insertWeightQuery = `
          INSERT INTO public.m1_controller_weight (
            m1_key,
            ksm_dm_no,
            ticket_no,
            receipt_book_no,
            weight
          ) VALUES ($1, $2, $3, $4, $5)
        `;
        const weightValues = [
          m1key,
          row.ksm_dm_no || row.ksmDmNo || null,
          row.ticket_no || row.ticketNo || null,
          row.receipt_book_no || row.receiptBookNo || null,
          rowWeight,
        ];

        console.log("MODEL: Inserting weight row into m1_controller_weight:", {
          m1key,
          row,
          weightValues,
        });

        await client.query(insertWeightQuery, weightValues);
      }
    }

    // Define clientId, pickup, and dropoff variables before container processing
    let clientId = controllerData.client || controllerData.clientId;
    let pickup =
      controllerData.pickup ||
      controllerData.selectedStartingPoint ||
      (Array.isArray(controllerData.startingPoints)
        ? null
        : controllerData.startingPoints);
    let dropoff =
      controllerData.dropoff ||
      controllerData.selectedDestination ||
      (Array.isArray(controllerData.destinations)
        ? null
        : controllerData.destinations);

    // Track computed VGM amounts and per-container charges to include in total calc
    const vgmAmountsArr = [];
    const containersWithSurcharges = [];

    // Determine per-shipment-type behaviour for VGM and add-on logic.
    const shipmentTypeStr = String(fields.shipmentType || "");
    const isAddOnType = shipmentTypeStr === "5";
    // VGM is disabled only for shipment type 4. For type 5 (add-on) we
    // allow the flag to be stored but will always keep the amount at 0.
    const allowVgm = shipmentTypeStr !== "4";

    for (const container of containerData) {

      // Define the container insert query with parameter placeholders
      // Debug logging for container data
      console.log(`Processing container for saveInstruction:`, {
        containerNum: container.containerNum || container.containernum,
        file_ref: container.file_ref,
        container_type: container.container_type || container.containerType,
        vgm: container.vgm || container["vgm"] || false,
        "vgm amount": container.vgmAmount || container["vgm amount"] || 0,
      });

      // Sanitize weight value
      let sanitizedWeight = null;
      if (
        container.weight !== null &&
        container.weight !== undefined &&
        container.weight !== ""
      ) {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim();
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight);
            if (!Number.isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight;
            }
          }
        } else if (typeof container.weight === "number" && container.weight >= 0) {
          sanitizedWeight = container.weight;
        }
      }

      // Compute surcharge & hazardous flags and fetch amounts if necessary
      const addSurcharges = container["Add Surcharges"] || container.surcharges || false;
      // For shipment type 5 (add-on), surcharge amounts must always remain 0
      // even if the flag is true.
      let surchargeAmount = 0;
      if (!isAddOnType && addSurcharges && clientId && pickup && dropoff) {
        try {
          const surchargeQuery = `
            SELECT surcharges, surcharge12m
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const surchargeResult = await client.query(surchargeQuery, [
            clientId,
            pickup,
            dropoff,
          ]);
          if (surchargeResult.rows.length > 0) {
            const resolvedType = container.container_type || container.containerType || "";
            const is12m = resolvedType === "12m";
            const fetched6 = Number.parseFloat(surchargeResult.rows[0].surcharges);
            const fetched12 = Number.parseFloat(surchargeResult.rows[0].surcharge12m);
            const fetched = is12m ? fetched12 : fetched6;
            if (!Number.isNaN(fetched) && fetched > 0) surchargeAmount = fetched;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch surcharge:", e.message);
        }
      }

      const isHazardous = container["Hazardous"] || container.hazardous || false;
      // For shipment type 5 (add-on), hazardous amounts must always remain 0
      // even if the flag is true.
      let hazardousAmount = container["Hazardous Amount"] || container.hazardousAmount || 0;
      if (!isAddOnType && isHazardous && hazardousAmount === 0 && clientId && pickup && dropoff) {
        try {
          const hazardousQuery = `
            SELECT hazardous
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const hazardousResult = await client.query(hazardousQuery, [
            clientId,
            pickup,
            dropoff,
          ]);
          if (hazardousResult.rows.length > 0) {
            const fetched = Number.parseFloat(hazardousResult.rows[0].hazardous);
            if (!Number.isNaN(fetched) && fetched > 0) hazardousAmount = fetched;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch hazardous:", e.message);
        }
      }

      // Get VGM flag and amount with fallbacks. For shipment type 4 VGM is
      // explicitly disabled. For shipment type 5 (add-on), the VGM flag
      // should be persisted, but the amount must stay 0. When VGM is
      // enabled, always refresh the amount from current client rates so it
      // stays in sync with m5_client_rate.
      const rawIsVgm = container.vgm || container["vgm"] || false;
      const isVgm = allowVgm ? rawIsVgm : false;

      let vgmAmount = 0;

      if (!isAddOnType && allowVgm && isVgm && clientId && pickup && dropoff) {
        try {
          const vgmQuery = `
            SELECT vgm
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const vgmResult = await client.query(vgmQuery, [
            clientId,
            pickup,
            dropoff,
          ]);
          if (vgmResult.rows.length > 0) {
            const fetched = Number.parseFloat(vgmResult.rows[0].vgm);
            if (!Number.isNaN(fetched) && fetched >= 0) vgmAmount = fetched;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch VGM:", e.message);
        }
      }

      // For shipment type 5 (add-on), force all surcharge/hazardous/VGM
      // amounts to 0 even if the flags are true.
      if (isAddOnType) {
        surchargeAmount = 0;
        hazardousAmount = 0;
        vgmAmount = 0;
      }

      const resolvedContainerType = container.container_type || container.containerType || "";
      const is12mSurcharge = resolvedContainerType === "12m";
      const surcharge12mAmount = is12mSurcharge ? surchargeAmount : 0;
      const sixmSurchargeAmount = is12mSurcharge ? 0 : surchargeAmount;

      // For 12m containers: 'Add Surcharges'=true, 'Surcharge Amount'=0, is_12m_surcharge=true, surcharge_12m_amount=rate
      // For 6m containers: 'Add Surcharges'=flag, 'Surcharge Amount'=rate, is_12m_surcharge=false, surcharge_12m_amount=0
      const finalAddSurcharges = addSurcharges;
      const finalSurchargeAmount = sixmSurchargeAmount;
      const finalIs12mSurcharge = is12mSurcharge && addSurcharges;
      const finalSurcharge12mAmount = is12mSurcharge && addSurcharges ? surcharge12mAmount : 0;

      const containerValues = [
        container.containerNum || container.containernum || "",
        sanitizedWeight, // Will be null for empty/invalid values
        m1key,
        resolvedContainerType,
        container.cargo_description || container.cargoDescription || "",
        isHazardous,
        finalAddSurcharges,
        finalSurchargeAmount, // Legacy 6m surcharge amount
        hazardousAmount, // Backend-calculated hazardous amount
        finalIs12mSurcharge,
        finalSurcharge12mAmount,
        container.file_ref || container.fileRef || "", // File reference field for export shipments
        isVgm,
        vgmAmount,
      ];

      console.log("Container values with VGM:", { isVgm, vgmAmount });
      // Keep track for total calc later
      vgmAmountsArr.push(vgmAmount);

      // Build a light-weight representation used for total calculation
      containersWithSurcharges.push({
        "Add Surcharges": addSurcharges,
        "Surcharge Amount": isAddOnType ? 0 : surchargeAmount,
        "Hazardous": isHazardous,
        "Hazardous Amount": isAddOnType ? 0 : hazardousAmount,
        vgm: isVgm,
        "vgm amount": isAddOnType ? 0 : vgmAmount,
      });

      // Insert the container row now that values are prepared. Note: the
      // container table does not have dedicated VGM columns; VGM is only
      // used in the in-memory cost calculation.
      const insertContainerQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key, container_type, cargo_description,
          "Hazardous", "Add Surcharges", "Surcharge Amount", "Hazardous Amount",
          is_12m_surcharge, surcharge_12m_amount,
          file_ref, vgm, "vgm amount"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `;
      await client.query(insertContainerQuery, containerValues);

      // Debug log for container values
      console.log("Container values array:", {
        containerNum: containerValues[0],
        weight: containerValues[1],
        m1key: containerValues[2],
        container_type: containerValues[3],
        cargo_description: containerValues[4],
        hazardous: containerValues[5],
        addSurcharges: containerValues[6],
        surchargeAmount: containerValues[7],
        hazardousAmount: containerValues[8],
        file_ref: containerValues[9],
        vgm: containerValues[10],
        vgmAmount: containerValues[11],
      });
    }

    // Calculate total cost including surcharges and VGM (local implementation)
    const calculateTotalCostWithSurcharges = (
      instructionData,
      containers = []
    ) => {

      const rateWeight =
        instructionData.rateweight || instructionData.rateWeight || "Container";

      // For shipment type 5 (add-on), total_cost must always remain 0
      // regardless of any container flags or amounts.
      const shipmentType = String(
        instructionData.shipment_type || instructionData.shipmentTypeId || ""
      );
      if (shipmentType === "5") {
        return 0;
      }

      let baseCost = 0;

      if (rateWeight === "Container") {
        // Container-based calculation
        const numSix = Number(instructionData.num_six_meters || 0);
        const numTwelve = Number(instructionData.num_twelve_meters || 0);
        const numAbnormal = Number(instructionData.num_abnormal || 0);
        const numBreakBulk = Number(instructionData.num_breakbulk || 0);

        const ratePer6 = numSix > 0 ? Number(instructionData.rateper_6 || 0) : 0;
        const ratePer12 = numTwelve > 0 ? Number(instructionData.rateper_12 || 0) : 0;
        const ratePerAbnormal = numAbnormal > 0 ? Number(instructionData.rateper_abnormal || 0) : 0;
        const ratePerBreakBulk = numBreakBulk > 0 ? Number(instructionData.rateper_breakbulk || 0) : 0;

        baseCost =
          ratePer6 * numSix +
          ratePer12 * numTwelve +
          ratePerAbnormal * numAbnormal +
          ratePerBreakBulk * numBreakBulk;
      } else {
        const hasTotalCost =
          instructionData.total_cost !== undefined &&
          !Number.isNaN(Number(instructionData.total_cost));
        if (hasTotalCost) {
          baseCost = Number(Number(instructionData.total_cost).toFixed(2));
        } else {
          const weight = Number(instructionData.weight || 0);
          const unitRate = Number(instructionData.unitrate || 0);
          baseCost = weight * unitRate;
        }
      }

      // Calculate total surcharge from containers
      const totalSurchargeAmount = containers.reduce((total, container) => {
        if (container["Add Surcharges"] && container["Surcharge Amount"]) {
          return total + Number(container["Surcharge Amount"] || 0);
        }
        return total;
      }, 0);

      // Calculate total hazardous amount from containers
      const totalHazardousAmount = containers.reduce((total, container) => {
        if (container["Hazardous"] && container["Hazardous Amount"]) {
          return total + Number(container["Hazardous Amount"] || 0);
        }
        return total;
      }, 0);

      // Calculate total VGM amount from containers
      const totalVgmAmount = containers.reduce((total, container) => {
        if (container["vgm"] && (container["vgm amount"] || container.vgmAmount)) {
          return total + Number(container["vgm amount"] || container.vgmAmount || 0);
        }
        return total;
      }, 0);

      console.log(`DEBUG: Base cost: ${baseCost}, Surcharges: ${totalSurchargeAmount}, Hazardous: ${totalHazardousAmount}, VGM: ${totalVgmAmount}`);
      const totalCost = baseCost + totalSurchargeAmount + totalHazardousAmount + totalVgmAmount;
      return Number(totalCost.toFixed(2));
    };

    // Build enriched containers including VGM for total calculation.
    // For shipment type 4, VGM values are forced to false/0. For shipment
    // type 5, the VGM flag is preserved but the amount is kept at 0.
    const containersWithExtras = containersWithSurcharges.map((c, idx) => {
      const original = containerData[idx] || {};
      const rawIsVgmFlag = original.vgm || original["vgm"] || false;
      const isVgmFlag = allowVgm ? rawIsVgmFlag : false;
      const vgmAmtFromOriginal = (original.vgmAmount || original["vgm amount"]) ?? 0;
      const rawVgmAmt = (vgmAmountsArr[idx] !== undefined) ? vgmAmountsArr[idx] : vgmAmtFromOriginal;
      let vgmAmt = allowVgm ? rawVgmAmt : 0;

      if (shipmentTypeStr === "5") {
        vgmAmt = 0;
      }

      return { ...c, vgm: isVgmFlag, "vgm amount": vgmAmt };
    });

    const recalculatedTotalCost = calculateTotalCostWithSurcharges(
      controllerData,
      containersWithExtras
    );

// ... (rest of the code remains the same)

    console.log(`DEBUG: Original total cost: ${controllerData.total_cost}`);
    console.log(
      `DEBUG: Recalculated total cost with surcharges: ${recalculatedTotalCost}`
    );
// ... (rest of the code remains the same)

    // Update the total cost in the database if it changed
    if (
      Math.abs(recalculatedTotalCost - Number(controllerData.total_cost)) > 0.01
    ) {
      console.log(
        `DEBUG: Updating total cost from ${controllerData.total_cost} to ${recalculatedTotalCost}`
      );
      const updateTotalCostQuery = `
        UPDATE public.m1_controller 
        SET total_cost = $1 
        WHERE m1key = $2
      `;
      await client.query(updateTotalCostQuery, [recalculatedTotalCost, m1key]);
    }

    await client.query("COMMIT");
    return { m1key, finalTotalCost: recalculatedTotalCost };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getClientInstructionStats = async () => {
  const statusCheckQuery = `
    SELECT DISTINCT status FROM public.m1_controller
  `;
  const queryText = `
    SELECT 
      c.m5clientkey,
      c.client AS companyname,
      c.representative,
      c.email,
      c.cellnum,
      MAX(m."lastFreeDate") as latest_date, -- Changed from pickupdate to lastFreeDate
      SUM(CASE WHEN m.status = 'New' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN LOWER(m.status) = 'in progress' THEN 1 ELSE 0 END) as in_progress_count,
      SUM(CASE WHEN m.status = 'Completed' THEN 1 ELSE 0 END) as completed_count
    FROM 
      public.m5_client c
    LEFT JOIN 
      public.m1_controller m ON c.m5clientkey = m.client
    WHERE 
      c.status = true
    GROUP BY 
      c.m5clientkey, c.client, c.representative, c.email
    ORDER BY 
      c.client
  `;
  const client = await pool.connect();
  try {
    const statusResult = await client.query(statusCheckQuery);
    console.log(
      "Available status values in database:",
      statusResult.rows.map((row) => row.status)
    );
    const result = await client.query(queryText);
    return result.rows;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

// Function to check if created_at column exists and add it if it doesn't
export const ensureCreatedAtColumnExists = async () => {
  console.log(
    `[${new Date().toISOString()}] Checking if created_at column exists in m1_controller table`
  );

  try {
    // Check if the column exists
    const checkColumnSql = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'm1_controller' 
      AND column_name = 'created_at'
    `;

    const result = await query(checkColumnSql);
    const columnExists =
      (result.rows && result.rows.length > 0) ||
      (result.recordset && result.recordset.length > 0);

    if (!columnExists) {
      console.log(
        `[${new Date().toISOString()}] created_at column does not exist, adding it now`
      );

      // Add the column if it doesn't exist
      const addColumnSql = `
        ALTER TABLE public.m1_controller 
        ADD COLUMN created_at DATE DEFAULT CURRENT_DATE
      `;

      await query(addColumnSql);
      console.log(
        `[${new Date().toISOString()}] created_at column added successfully`
      );

      // Update existing records to have a created_at value
      const updateExistingSql = `
        UPDATE public.m1_controller 
        SET created_at = CURRENT_DATE 
        WHERE created_at IS NULL
      `;

      await query(updateExistingSql);
      console.log(
        `[${new Date().toISOString()}] Updated existing records with created_at values`
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] created_at column already exists`
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Error ensuring created_at column exists:`,
      error
    );
    throw error;
  }
};

export const getInstructions = async (clientId) => {
  console.log(
    `[${new Date().toISOString()}] getInstructions: Starting with clientId:`,
    clientId
  );

  // Ensure the created_at column exists before querying
  await ensureCreatedAtColumnExists();

  let sql = `
    SELECT 
      m.m1key,
      m."clientFileRef" as fileno,
      m."clientFileRef" as client_ref,
      m.booking_ref,
      m."ksmFileRef" as ksm_file_ref,
      m.shipment_type,
      s.shipmenttype AS type_text,
      m.status,
      m."lastFreeDate",
      m.client,
      c.client AS companyname,
      m.created_at as startingdate,
      COALESCE(m.num_six_meters, 0) AS num_six_meters,
      COALESCE(m.num_twelve_meters, 0) AS num_twelve_meters,
      COALESCE(m.num_abnormal, 0) AS num_abnormal,
      (
        SELECT COUNT(*) > 0
        FROM public.container cn
        WHERE cn.m1key = m.m1key
      ) AS has_valid_containers,
      i.invoice_num,
      ao.invoice_number AS addon_invoice_number
    FROM
      public.m1_controller m
    JOIN
      public.m5_client c ON m.client = c.m5clientkey
    LEFT JOIN
      public.shipment s ON m.shipment_type = s.shipkey
    LEFT JOIN
      public.invoice i ON m.m1key = i.m1key
    LEFT JOIN
      public.add_ons ao ON m.addon_id = ao.addon_id
  `;
  const queryParams = [];
  if (clientId) {
    sql += ` WHERE m.client = $1`;
    queryParams.push(clientId);
  }
  sql += ` ORDER BY m.created_at DESC`;

  console.log(
    `[${new Date().toISOString()}] getInstructions: Executing SQL:`,
    sql
  );
  console.log(
    `[${new Date().toISOString()}] getInstructions: With params:`,
    queryParams
  );

  try {
    const result = await query(sql, queryParams);
    const rows = result.recordset || result.rows || [];

    console.log(
      `[${new Date().toISOString()}] getInstructions: Query completed, found ${
        rows.length
      } instructions`
    );
    if (rows.length > 0) {
      console.log(
        `[${new Date().toISOString()}] getInstructions: Sample first row:`,
        rows[0]
      );
      console.log(
        `[${new Date().toISOString()}] getInstructions: created_at/startingdate value:`,
        rows[0].startingdate
      );
      console.log(
        `[${new Date().toISOString()}] getInstructions: has_valid_containers value:`,
        rows[0].has_valid_containers
      );
    }

    return rows;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] getInstructions: Error executing query:`,
      error
    );
    throw error;
  }
};

// Searchable fields for the instruction search endpoint.
// Each entry is a SQL expression. Add new entries here to extend search coverage.
const INSTRUCTION_SEARCH_FIELDS = [
  `cont.containernum`,
  `m."clientFileRef"`,
]

export const searchInstructions = async ({ q, clientId } = {}) => {
  const queryParams = []
  const conditions = []

  if (q && q.trim()) {
    queryParams.push(`%${q.trim()}%`)
    const idx = queryParams.length
    conditions.push(`(${INSTRUCTION_SEARCH_FIELDS.map((f) => `${f} ILIKE $${idx}`).join(" OR ")})`)
  }

  if (clientId) {
    queryParams.push(clientId)
    conditions.push(`m.client = $${queryParams.length}`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const sql = `
    SELECT DISTINCT ON (m.m1key)
      m.m1key,
      m."clientFileRef" AS fileno,
      m."clientFileRef" AS client_ref,
      m.booking_ref,
      m."ksmFileRef" AS ksm_file_ref,
      m.shipment_type,
      s.shipmenttype AS type_text,
      m.status,
      m."lastFreeDate",
      m.client,
      c.client AS companyname,
      c.m5clientkey,
      m.created_at AS startingdate,
      COALESCE(m.num_six_meters, 0) AS num_six_meters,
      COALESCE(m.num_twelve_meters, 0) AS num_twelve_meters,
      COALESCE(m.num_abnormal, 0) AS num_abnormal,
      (
        SELECT COUNT(*) > 0
        FROM public.container cn
        WHERE cn.m1key = m.m1key
      ) AS has_valid_containers,
      i.invoice_num
    FROM public.m1_controller m
    JOIN public.m5_client c ON m.client = c.m5clientkey
    LEFT JOIN public.shipment s ON m.shipment_type = s.shipkey
    LEFT JOIN public.invoice i ON m.m1key = i.m1key
    LEFT JOIN public.container cont ON cont.m1key = m.m1key
    ${whereClause}
    ORDER BY m.m1key, m.created_at DESC
  `

  try {
    const result = await query(sql, queryParams)
    return result.recordset || result.rows || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] searchInstructions: Error:`, error)
    throw error
  }
}

export const getInstructionById = async (instructionId) => {
  const sql = `
    WITH instruction_data AS (
      SELECT 
        m.*,
        c.client AS companyname,
        c.representative,
        c.cellnum,
        c.email,
        s.shipmenttype,
        ao.invoice_number AS addon_invoice_number
      FROM
        public.m1_controller m
      JOIN
        public.m5_client c ON m.client = c.m5clientkey
      JOIN
        public.shipment s ON m.shipment_type = s.shipkey
      LEFT JOIN
        public.add_ons ao ON m.addon_id = ao.addon_id
      WHERE
        m.m1key = $1
    ),
    container_data AS (
      SELECT 
        containerkey,
        containernum,
        weight,
        container_type,
        cargo_description,
        m1key,
        file_ref,
        "Hazardous",
        "Add Surcharges",
        "Surcharge Amount",
        is_12m_surcharge,
        surcharge_12m_amount,
        "Hazardous Amount",
        vgm,
        "vgm amount"
      FROM 
        public.container
      WHERE 
        m1key = $1
    ),
    weight_data AS (
      SELECT
        weight_pk,
        m1_key,
        ksm_dm_no,
        ticket_no,
        receipt_book_no,
        weight
      FROM public.m1_controller_weight
      WHERE m1_key = $1
    )
    SELECT 
      i.*,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'containerkey', c.containerkey,
              'containernum', c.containernum,
              'weight', c.weight,
              'container_type', c.container_type,
              'cargo_description', c.cargo_description,
              'file_ref', c.file_ref,
              'm1key', c.m1key,
              'Hazardous', COALESCE(c."Hazardous", false),
              'Add Surcharges', COALESCE(c."Add Surcharges", false),
              'Surcharge Amount', COALESCE(c."Surcharge Amount", 0),
              'is_12m_surcharge', COALESCE(c.is_12m_surcharge, false),
              'surcharge_12m_amount', COALESCE(c.surcharge_12m_amount, 0),
              'Hazardous Amount', COALESCE(c."Hazardous Amount", 0),
              'vgm', COALESCE(c.vgm, false),
              'vgm amount', COALESCE(c."vgm amount", 0)
            )
            ORDER BY c.containerkey
          )
          FROM container_data c
          WHERE c.m1key = i.m1key
        ),
        '[]'::json
      ) AS containers,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'weight_pk', w.weight_pk,
              'm1_key', w.m1_key,
              'ksm_dm_no', w.ksm_dm_no,
              'ticket_no', w.ticket_no,
              'receipt_book_no', w.receipt_book_no,
              'weight', w.weight
            )
            ORDER BY w.weight_pk
          )
          FROM weight_data w
          WHERE w.m1_key = i.m1key
        ),
        '[]'::json
      ) AS weight_rows
    FROM 
      instruction_data i`;
  const result = await query(sql, [instructionId]);
  return (result.recordset || result.rows || []).length > 0
    ? (result.recordset || result.rows)[0]
    : null;
};

export const updateContainersByInstructionId = async (
  instructionId,
  containers,
  isAddOnType = false,
  clientId = null,
  pickup = null,
  dropoff = null,
  allowVgm = true,
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Before replacing containers, fetch existing ones so we can
    // identify which container numbers are being removed and clean up
    // any related legs in legs_m2.
    const existingRes = await client.query(
      `SELECT containernum FROM public.container WHERE m1key = $1`,
      [instructionId]
    );
    const existingNums = existingRes.rows
      .map((row) => row.containernum)
      .filter((num) => num !== null && num !== undefined && num !== "");

    const newNumsSet = new Set(
      (containerData || [])
        .map((c) => c.containernum || c.containerNum || null)
        .filter((num) => num !== null && num !== undefined && num !== "")
    );

    // Any existing container number that is not present in the new
    // payload represents a deleted container. Remove associated legs
    // for those containers.
    for (const existingNum of existingNums) {
      if (!newNumsSet.has(existingNum)) {
        await client.query(
          `DELETE FROM public.legs_m2 WHERE m1key = $1 AND containernumber = $2`,
          [instructionId, existingNum]
        );
      }
    }

    // Delete existing containers so we can insert the new set
    const deleteQuery = `
      DELETE FROM public.container
      WHERE m1key = $1
    `;
    const deleteResult = await client.query(deleteQuery, [instructionId]);
    console.log(
      `Deleted ${deleteResult.rowCount} existing containers for instruction ID: ${instructionId}`
    );

    // Insert new containers
    const insertResults = [];
    for (const container of containerData) {
      const containerNum =
        container.containernum || container.containerNum || "";

      // Sanitize weight value
      let sanitizedWeight = null;
      if (
        container.weight !== null &&
        container.weight !== undefined &&
        container.weight !== ""
      ) {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim();
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight);
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight;
            }
          }
        } else if (
          typeof container.weight === "number" &&
          container.weight >= 0
        ) {
          sanitizedWeight = container.weight;
        }
      }

      const containerType =
        container.containerType || container.container_type || "";
      const cargoDescription =
        container.cargoDescription || container.cargo_description || "";

      // Get hazardous, surcharge, and VGM flags with fallbacks
      const hazardous =
        container.hazardous !== undefined ? container.hazardous : false;
      const addSurcharges =
        container.addSurcharges !== undefined ? container.addSurcharges : false;
      const vgm =
        container.vgm !== undefined ? container.vgm : false;
      const surchargeAmount =
        container.surchargeAmount || container["Surcharge Amount"] || 0;
      const vgmAmount =
        container.vgmAmount || container["vgm amount"] || 0;

      console.log(
        `Inserting container: containerNum=${containerNum}, weight=${sanitizedWeight}, m1key=${instructionId}, container_type=${containerType}, cargo_description=${cargoDescription}, hazardous=${hazardous}, addSurcharges=${addSurcharges}, surchargeAmount=${surchargeAmount}`
      );

      const insertQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key, container_type, cargo_description, 
          "Hazardous", "Add Surcharges", "Surcharge Amount", 
          is_12m_surcharge, surcharge_12m_amount,
          "Hazardous Amount", file_ref, vgm, "vgm amount"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING containerkey
      `;
      // Get file_ref value from container with proper fallback
      const fileRef = container.file_ref || container.fileRef || "";
      
      console.log(`File Reference for container: ${fileRef}`);
      
      const values = [
        containerNum,
        sanitizedWeight,
        instructionId,
        containerType,
        cargoDescription,
        hazardous,
        addSurcharges,
        containerType === "12m" ? 0 : surchargeAmount,
        containerType === "12m",
        containerType === "12m" ? surchargeAmount : 0,
        container["Hazardous Amount"] || container.hazardousAmount || 0,
        fileRef,
        vgm,
        vgmAmount,
      ];

      console.log("Container values with VGM:", { vgm, vgmAmount });

      const result = await client.query(insertQuery, values);
      console.log(`Inserted container with ID: ${result.rows[0].containerkey}`);
      insertResults.push(result.rows[0]);
    }

    await client.query("COMMIT");
    console.log(
      `Successfully inserted ${insertResults.length} containers for instruction ID: ${instructionId}`
    );

    // Verify insertion
    const verifyQuery = `
      SELECT COUNT(*) FROM public.container WHERE m1key = $1
    `;
    const verifyResult = await client.query(verifyQuery, [instructionId]);
    console.log(
      `Verification: ${verifyResult.rows[0].count} containers now exist for instruction ID: ${instructionId}`
    );

    return { data: insertResults };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getActiveClients = async () => {
  const sql = `
    SELECT 
      m5clientkey,
      client AS companyname,
      representative,
      email,
      cellnum
    FROM 
      public.m5_client
    WHERE 
      status = true
    ORDER BY 
      client
  `;

  console.log("Executing getActiveClients query:", sql);

  try {
    const result = await query(sql);
    const clients = result.recordset || result.rows || [];
    console.log(`Found ${clients.length} active clients`);
    if (clients.length > 0) {
      console.log("Sample client data:", clients[0]);
    }
    return clients;
  } catch (error) {
    console.error("Error in getActiveClients:", error);
    throw error;
  }
};

export const getClientStartingPoints = async (clientId) => {
  const sql = `
    SELECT DISTINCT starting_point
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ORDER BY starting_point
  `;
  console.log(`[MODEL] Executing query for client ${clientId}:`, sql);

  try {
    const result = await query(sql, [clientId]);
    const startingPoints = result.recordset || result.rows || [];
    console.log(`[MODEL] Query result for client ${clientId}:`, {
      rowCount: result.rowCount || startingPoints.length,
      rows: startingPoints,
    });
    return startingPoints;
  } catch (error) {
    console.error(
      `[MODEL] Error in getClientStartingPoints for client ${clientId}:`,
      error
    );
    throw error;
  }
};

export const getClientDestinations = async (clientId, startingPoint) => {
  if (!clientId || !startingPoint) {
    throw new Error("Both clientId and startingPoint are required");
  }

  const sql = `
    SELECT DISTINCT destination
    FROM public.m5_client_rate
    WHERE clientid = $1 
      AND starting_point = $2
      AND destination IS NOT NULL 
      AND destination != ''
    ORDER BY destination
  `;

  try {
    const result = await query(sql, [clientId, startingPoint]);
    const destinations = result.recordset || result.rows || [];
    if (destinations.length === 0) {
      console.warn(
        `No destinations found for client ${clientId} and starting point ${startingPoint}`
      );
    }
    return destinations;
  } catch (error) {
    console.error("Error fetching destinations:", error);
    throw error;
  }
};

export const checkClientHasRates = async (clientId) => {
  const sql = `
    SELECT EXISTS (
      SELECT 1 
      FROM public.m5_client_rate 
      WHERE clientid = $1
      AND starting_point IS NOT NULL 
      AND starting_point IS DISTINCT FROM ''
    ) as has_rates
  `;

  try {
    const result = await query(sql, [clientId]);
    const hasRates =
      (result.recordset || result.rows || [])[0]?.has_rates || false;
    console.log(`Client ${clientId} has rates with starting points:`, hasRates);
    return hasRates;
  } catch (error) {
    console.error("Error in checkClientHasRates:", error);
    throw error;
  }
};

// Uplift a base rate by a fuel surcharge percentage. Returns the value
// unchanged when either input is missing/zero so existing rates are untouched
// for clients that have not configured a fuel surcharge.
const applyFuelSurcharge = (value, fuelSurchargePct) => {
  if (value === null || value === undefined || value === "") return value;
  const base = Number(value);
  const pct = Number(fuelSurchargePct);
  if (Number.isNaN(base) || Number.isNaN(pct) || pct === 0) return value;
  return Number((base * (1 + pct / 100)).toFixed(2));
};

export const getClientRates = async (clientId, start, destination) => {
  if (!clientId || !start || !destination) {
    throw new Error("clientId, start, and destination are required");
  }

  const sql = `
    SELECT
      "6m_rate" as "sixMeterRate",
      "12m_rate" as "twelveMeterRate",
      set_rate as "setRate",
      surcharges,
      surcharge12m,
      hazardous,
      vgm,
      fuel_surcharge as "fuelSurcharge",
      starting_point as "startingPoint",
      destination
    FROM public.m5_client_rate
    WHERE clientid = $1
      AND starting_point = $2
      AND destination = $3
    ORDER BY client_rate_id DESC
    LIMIT 1
  `;

  try {
    console.log(
      `[getClientRates] Querying rates for client: ${clientId}, start: ${start}, destination: ${destination}`
    );
    console.log(`[getClientRates] Executing query:`, sql, `with params:`, [
      clientId,
      start,
      destination,
    ]);

    const result = await query(sql, [clientId, start, destination]);
    const rates = result.recordset || result.rows || [];

    console.log(`[getClientRates] Query result:`, {
      rowCount: result.rowCount || rates.length,
      rows: rates,
    });

    if (rates.length === 0) {
      console.log(
        `[getClientRates] No rates found for client ${clientId}, start: ${start}, destination: ${destination}`
      );
      return {};
    }

    const rateData = rates[0];

    // Apply the fuel surcharge percentage to the base route rates so the
    // instruction form (and the persisted rateper_* values) already reflect
    // the uplift. Surcharge/hazardous/VGM line items are left untouched.
    const fuelSurcharge = rateData.fuelSurcharge;
    rateData.sixMeterRate = applyFuelSurcharge(rateData.sixMeterRate, fuelSurcharge);
    rateData.twelveMeterRate = applyFuelSurcharge(rateData.twelveMeterRate, fuelSurcharge);
    rateData.setRate = applyFuelSurcharge(rateData.setRate, fuelSurcharge);

    console.log(`[getClientRates] Retrieved rates:`, {
      rawRow: rateData,
      sixMeterRate: rateData.sixMeterRate,
      twelveMeterRate: rateData.twelveMeterRate,
      surcharges: rateData.surcharges,
      surcharge12m: rateData.surcharge12m,
      hazardous: rateData.hazardous,
      vgm: rateData.vgm,
      vgmRate: rateData.vgmRate, // Return the VGM rate
      fuelSurcharge: rateData.fuelSurcharge, // Percentage applied to base rates
      startingPoint: rateData.startingPoint,
      destination: rateData.destination,
    });

    return rateData;
  } catch (error) {
    console.error("Error fetching client rates:", error);
    throw error;
  }
};

// Helper functions for formatting and comparison
const formatDateForComparison = (dateValue) => {
  if (!dateValue) return null;

  try {
    // Handle different date formats
    let date;
    if (typeof dateValue === "string") {
      // Handle MM/DD/YYYY format
      if (dateValue.includes("/")) {
        const [month, day, year] = dateValue.split("/");
        date = new Date(year, month - 1, day);
      } else {
        date = new Date(dateValue);
      }
    } else {
      date = new Date(dateValue);
    }

    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: ${dateValue}`);
      return null;
    }

    return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
  } catch (error) {
    console.error(`Error formatting date ${dateValue}:`, error);
    return null;
  }
};

const formatTimeForComparison = (timeValue) => {
  if (!timeValue) return null;

  try {
    // Handle different time formats
    const timeStr = String(timeValue).trim();
    const parts = timeStr.split(":");

    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, "0");
      const minutes = parts[1].padStart(2, "0");
      const seconds = parts[2] ? parts[2].padStart(2, "0") : "00";
      return `${hours}:${minutes}:${seconds}`;
    }

    console.warn(`Invalid time format: ${timeValue}`);
    return null;
  } catch (error) {
    console.error(`Error formatting time ${timeValue}:`, error);
    return null;
  }
};

const compareValues = (currentValue, newValue, fieldType = "string") => {
  // Handle null/undefined cases
  if (currentValue === null && newValue === null) return true;
  if (currentValue === undefined && newValue === undefined) return true;
  if (currentValue === null && (newValue === "" || newValue === undefined))
    return true;
  if ((currentValue === "" || currentValue === undefined) && newValue === null)
    return true;

  // Handle different field types
  switch (fieldType) {
    case "date":
      const currentDate = formatDateForComparison(currentValue);
      const newDate = formatDateForComparison(newValue);
      return currentDate === newDate;

    case "time":
      const currentTime = formatTimeForComparison(currentValue);
      const newTime = formatTimeForComparison(newValue);
      return currentTime === newTime;

    case "number":
      const currentNum = currentValue === null ? null : Number(currentValue);
      const newNum =
        newValue === null || newValue === "" ? null : Number(newValue);
      return currentNum === newNum;

    case "boolean":
      return Boolean(currentValue) === Boolean(newValue);

    default:
      // String comparison
      const currentStr = currentValue === null ? null : String(currentValue);
      const newStr =
        newValue === null || newValue === "" ? null : String(newValue);
      return currentStr === newStr;
  }
};

const compareContainers = (currentContainers, newContainers) => {
  // Create maps for easier comparison
  const currentMap = new Map();
  const newMap = new Map();

  // Map current containers by containerkey
  currentContainers.forEach((container) => {
    if (container.containerkey) {
      currentMap.set(container.containerkey, container);
    }
  });

  // Map new containers by containerKey (if exists) or create temporary keys
  newContainers.forEach((container, index) => {
    const key = container.containerKey || `new_${index}`;
    newMap.set(key, container);
  });

  const changes = {
    toUpdate: [],
    toInsert: [],
    toDelete: [],
  };

  // Find containers to update or insert
  for (const [key, newContainer] of newMap) {
    const keyStr = String(key); // Convert key to string for comparison
    if (keyStr.startsWith("new_")) {
      // This is a new container
      changes.toInsert.push(newContainer);
    } else {
      const currentContainer = currentMap.get(Number(key)); // Convert back to number for map lookup
      if (currentContainer) {
        // Compare container fields
        const containerNum =
          newContainer.containernum || newContainer.containerNum || "";
        const weight =
          newContainer.weight !== null &&
          newContainer.weight !== undefined &&
          newContainer.weight !== ""
            ? Number.parseFloat(newContainer.weight)
            : null;
        const containerType =
          newContainer.containerType || newContainer.container_type || "";
        const cargoDescription =
          newContainer.cargoDescription || newContainer.cargo_description || "";

        // Handle surcharge and hazardous flags with proper boolean comparison
        const currentHazardous = Boolean(currentContainer["Hazardous"]);
        const newHazardous = Boolean(
          newContainer["Hazardous"] || newContainer.hazardous
        );
        const currentAddSurcharges = Boolean(
          currentContainer["Add Surcharges"]
        );
        const newAddSurcharges = Boolean(
          newContainer["Add Surcharges"] || newContainer.addSurcharges
        );
        const currentSurchargeAmount = Number(
          currentContainer["Surcharge Amount"] || 0
        );
        const newSurchargeAmount = Number(
          newContainer["Surcharge Amount"] || newContainer.surchargeAmount || 0
        );

        const currentHazardousAmount = Number(
          currentContainer["Hazardous Amount"] || 0
        );
        const newHazardousAmount = Number(
          newContainer["Hazardous Amount"] || newContainer.hazardousAmount || 0
        );

        // Handle VGM flag and amount
        const currentVgm = Boolean(currentContainer["vgm"]);
        const newVgm = Boolean(newContainer["vgm"] || newContainer.vgm);
        const currentVgmAmount = Number(currentContainer["vgm amount"] || 0);
        const newVgmAmount = Number(newContainer["vgm amount"] || newContainer.vgmAmount || 0);

        const hasChanges =
          currentContainer.containernum !== containerNum ||
          currentContainer.weight !== weight ||
          currentContainer.container_type !== containerType ||
          currentContainer.cargo_description !== cargoDescription ||
          currentHazardous !== newHazardous ||
          currentAddSurcharges !== newAddSurcharges ||
          currentSurchargeAmount !== newSurchargeAmount ||
          currentHazardousAmount !== newHazardousAmount ||
          currentVgm !== newVgm ||
          currentVgmAmount !== newVgmAmount ||
          // Always update if flags are true to refresh amounts from current rates
          newHazardous ||
          newAddSurcharges ||
          newVgm;

        console.log(
          `[${new Date().toISOString()}] [MODEL] Comparing container ${key}:`,
          {
            containerNum: {
              current: currentContainer.containernum,
              new: containerNum,
              changed: currentContainer.containernum !== containerNum,
            },
            weight: {
              current: currentContainer.weight,
              new: weight,
              changed: currentContainer.weight !== weight,
            },
            hazardous: {
              current: currentHazardous,
              new: newHazardous,
              changed: currentHazardous !== newHazardous,
            },
            addSurcharges: {
              current: currentAddSurcharges,
              new: newAddSurcharges,
              changed: currentAddSurcharges !== newAddSurcharges,
            },
            surchargeAmount: {
              current: currentSurchargeAmount,
              new: newSurchargeAmount,
              changed: currentSurchargeAmount !== newSurchargeAmount,
            },
            hazardousAmount: {
              current: currentHazardousAmount,
              new: newHazardousAmount,
              changed: currentHazardousAmount !== newHazardousAmount,
            },
            vgm: {
              current: currentVgm,
              new: newVgm,
              changed: currentVgm !== newVgm,
            },
            vgmAmount: {
              current: currentVgmAmount,
              new: newVgmAmount,
              changed: currentVgmAmount !== newVgmAmount,
            },
            hasChanges,
          }
        );

        if (hasChanges) {
          changes.toUpdate.push({
            containerkey: Number(key), // Use numeric key for database
            containernum: containerNum,
            weight: weight,
            container_type: containerType,
            cargo_description: cargoDescription,
            Hazardous: newHazardous,
            "Add Surcharges": newAddSurcharges,
            "Surcharge Amount": newSurchargeAmount,
            "Hazardous Amount": newContainer["Hazardous Amount"] || newContainer.hazardousAmount || 0,
            file_ref: newContainer.file_ref || "", // Add file_ref field to update
            vgm: newVgm,
            "vgm amount": newVgmAmount,
          });
        }
      } else {
        // Container with key doesn't exist in current, treat as new
        changes.toInsert.push(newContainer);
      }
    }
  }

  // Find containers to delete
  for (const [key, currentContainer] of currentMap) {
    if (!newMap.has(key)) {
      changes.toDelete.push(currentContainer.containerkey);
    }
  }

  return changes;
};

// Helper function to sanitize numeric values - converts empty strings and invalid values to null
const sanitizeNumericValue = (value) => {
  // Handle null, undefined, or empty string
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "undefined"
  ) {
    return null;
  }

  // Handle string values
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    const parsed = Number.parseFloat(trimmed);
    return isNaN(parsed) ? null : parsed;
  }

  // Handle numeric values
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  // For any other type, try to convert to number
  const parsed = Number.parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// Helper function to preserve existing values but sanitize new ones
const preserveExistingValue = (
  newValue,
  currentValue,
  fieldType = "string"
) => {
  if (newValue === undefined || newValue === "undefined") {
    return currentValue; // Keep existing database value
  }

  // For numeric fields, sanitize the value
  if (fieldType === "number") {
    return sanitizeNumericValue(newValue);
  }

  // For string fields, convert empty strings to null if needed
  if (fieldType === "string" && newValue === "") {
    return null;
  }

  return newValue;
};

export const updateFCInstructionAndContainers = async (
  instructionId,
  instructionData,
  containerData,
  weightData = []
) => {
  const client = await pool.connect();
  try {
    // Start transaction
    await client.query("BEGIN");

    console.log(
      `[${new Date().toISOString()}] [MODEL] updateFCInstructionAndContainers: Starting transaction for instruction ${instructionId}`
    );

    // 1. Fetch current instruction data
    const getCurrentQuery = `
      SELECT * FROM public.m1_controller WHERE m1key = $1
    `;
    const currentResult = await client.query(getCurrentQuery, [instructionId]);

    if (currentResult.rows.length === 0) {
      throw new Error(`Instruction with ID ${instructionId} not found`);
    }

    const currentInstruction = currentResult.rows[0];
    console.log(
      `[${new Date().toISOString()}] [MODEL] Current instruction data fetched`
    );

    const newShipmentType = String(
      instructionData.shipment_type ||
        instructionData.shipmentTypeId ||
        currentInstruction.shipment_type
    );
    const isAddOnType = newShipmentType === "5";
    // VGM is disabled only for shipment type 4. For type 5 (add-on) we
    // allow the VGM flag to be stored but the amount will be kept at 0.
    const allowVgm = newShipmentType !== "4";

    // Calculate total cost if not provided
    let totalCost =
      instructionData.total_cost !== undefined
        ? instructionData.total_cost
        : calculateTotalCost(instructionData);

    // For shipment type 4, recalculate total_cost from weightData unless set rate is enabled.
    // Set rate instructions send the correct total from the frontend; unitrate is 0 for them
    // so recalculating would always produce 0.
    if (newShipmentType === "4" && !isAddOnType && !instructionData.is_set_rate) {
      if (Array.isArray(weightData) && weightData.length > 0) {
        const totalWeight = weightData.reduce((sum, row) => {
          if (row.weight !== null && row.weight !== undefined && row.weight !== "") {
            const parsed = Number.parseFloat(row.weight);
            return Number.isNaN(parsed) ? sum : sum + parsed;
          }
          return sum;
        }, 0);
        const unitRate = Number(instructionData.unitrate || 0);
        totalCost = totalWeight * unitRate;
      } else {
        totalCost = 0;
      }
    }

    // 2. Prepare instruction update data with proper null handling and numeric sanitization
    const updateData = {
      client: preserveExistingValue(
        instructionData.client,
        currentInstruction.client,
        "number"
      ),
      task: preserveExistingValue(
        instructionData.ksmFileRef || instructionData.task,
        currentInstruction.ksmFileRef || currentInstruction.task,
        "string"
      ), // renamed from task to ksmFileRef
      shipment_type: preserveExistingValue(
        instructionData.shipment_type,
        currentInstruction.shipment_type,
        "number"
      ),
      pickup: preserveExistingValue(
        instructionData.pickup,
        currentInstruction.pickup,
        "string"
      ),
      dropoff: preserveExistingValue(
        instructionData.dropoff,
        currentInstruction.dropoff,
        "string"
      ),
      // pickuptime and pickupdate fields removed
      stackdate: preserveExistingValue(
        instructionData.stackdate,
        currentInstruction.stackdate,
        "string"
      ),
      lastfreedate: preserveExistingValue(
        instructionData.lastFreeDate || instructionData.lastfreedate,
        currentInstruction.lastfreedate || currentInstruction.deadline,
        "string"
      ), // renamed from deadline
      clientFileRef: preserveExistingValue(
        instructionData.clientFileRef || instructionData.fileref,
        currentInstruction.clientFileRef || currentInstruction.fileref,
        "string"
      ), // renamed from fileref
      rateweight: preserveExistingValue(
        instructionData.rateweight,
        currentInstruction.rateweight,
        "string"
      ),
      description: preserveExistingValue(
        instructionData.description,
        currentInstruction.description,
        "string"
      ),
      status: preserveExistingValue(
        instructionData.status,
        currentInstruction.status,
        "string"
      ),
      vat: preserveExistingValue(
        instructionData.vat,
        currentInstruction.vat,
        "number"
      ),
      num_six_meters: preserveExistingValue(
        instructionData.num_six_meters,
        currentInstruction.num_six_meters,
        "number"
      ),
      num_twelve_meters: preserveExistingValue(
        instructionData.num_twelve_meters,
        currentInstruction.num_twelve_meters,
        "number"
      ),
      num_abnormal: preserveExistingValue(
        instructionData.num_abnormal,
        currentInstruction.num_abnormal,
        "number"
      ),
      num_breakbulk: preserveExistingValue(
        instructionData.num_breakbulk,
        currentInstruction.num_breakbulk,
        "number"
      ),
      weight: preserveExistingValue(
        instructionData.weight,
        currentInstruction.weight,
        "number"
      ),
      total_cost: sanitizeNumericValue(totalCost),
      booking_ref: preserveExistingValue(
        instructionData.booking_ref,
        currentInstruction.booking_ref,
        "string"
      ),
      vessel_name: preserveExistingValue(
        instructionData.vessel_name,
        currentInstruction.vessel_name,
        "string"
      ),
      rateper_6: preserveExistingValue(
        instructionData.rateper_6,
        currentInstruction.rateper_6,
        "number"
      ),
      rateper_12: preserveExistingValue(
        instructionData.rateper_12,
        currentInstruction.rateper_12,
        "number"
      ),
      rateper_abnormal: preserveExistingValue(
        instructionData.rateper_abnormal,
        currentInstruction.rateper_abnormal,
        "number"
      ),
      rateper_breakbulk: preserveExistingValue(
        instructionData.rateper_breakbulk,
        currentInstruction.rateper_breakbulk,
        "number"
      ),
      unitrate: preserveExistingValue(
        instructionData.unitrate,
        currentInstruction.unitrate,
        "number"
      ),
      is_set_rate: preserveExistingValue(
        instructionData.is_set_rate,
        currentInstruction.is_set_rate,
        "boolean"
      ),
      historical_set_rate: preserveExistingValue(
        instructionData.historical_set_rate,
        currentInstruction.historical_set_rate,
        "number"
      ),
      created_at: preserveExistingValue(
        instructionData.created_at,
        currentInstruction.created_at,
        "string"
      ),
      // Link to the add-on invoice (add_ons.addon_id). Only meaningful for
      // add-on instructions; null for everything else.
      addon_id: preserveExistingValue(
        instructionData.addon_id,
        currentInstruction.addon_id,
        "number"
      ),
    };

    // 2b. Guard: an add-on instruction cannot be marked Completed unless it is
    // linked to an existing add-on invoice (enforced front- and back-end).
    if (isAddOnType && updateData.status === "Completed") {
      if (updateData.addon_id === null || updateData.addon_id === undefined) {
        throw new Error(
          "An add-on instruction must be linked to an add-on invoice before it can be completed."
        );
      }
    }

    // 3. Check if instruction needs updating
    let instructionNeedsUpdate = false;
    const fieldsToCheck = [
      { field: "client", type: "number" },
      { field: "ksmFileRef", type: "string" }, // renamed from task
      { field: "shipment_type", type: "number" },
      { field: "pickup", type: "string" },
      { field: "dropoff", type: "string" },
      { field: "surchages", type: "boolean" },
      { field: "surcharge", type: "number" },
      // pickuptime and pickupdate fields removed
      { field: "stackdate", type: "date" },
      { field: "lastfreedate", type: "date" }, // renamed from deadline
      { field: "clientFileRef", type: "string" }, // renamed from fileref
      { field: "rateweight", type: "string" },
      { field: "description", type: "string" },
      { field: "status", type: "string" },
      { field: "vat", type: "number" },
      { field: "num_six_meters", type: "number" },
      { field: "num_twelve_meters", type: "number" },
      { field: "num_abnormal", type: "number" },
      { field: "num_breakbulk", type: "number" },
      { field: "weight", type: "number" },
      { field: "total_cost", type: "number" },
      { field: "booking_ref", type: "string" },
      { field: "vessel_name", type: "string" },
      { field: "rateper_6", type: "number" },
      { field: "rateper_12", type: "number" },
      { field: "rateper_abnormal", type: "number" },
      { field: "rateper_breakbulk", type: "number" },
      { field: "unitrate", type: "number" },
      { field: "is_set_rate", type: "boolean" },
      { field: "historical_set_rate", type: "number" },
      { field: "created_at", type: "date" },
      { field: "addon_id", type: "number" },
    ];

    for (const { field, type } of fieldsToCheck) {
      if (!compareValues(currentInstruction[field], updateData[field], type)) {
        console.log(
          `[${new Date().toISOString()}] [MODEL] Field '${field}' changed: ${
            currentInstruction[field]
          } -> ${updateData[field]}`
        );
        instructionNeedsUpdate = true;
        break;
      }
    }

    // 4. Update instruction if needed
    if (instructionNeedsUpdate) {
      console.log(
        `[${new Date().toISOString()}] [MODEL] Updating instruction ${instructionId}`
      );

      const updateInstructionQuery = `
        UPDATE public.m1_controller
        SET 
          client = $1, "ksmFileRef" = $2, shipment_type = $3, pickup = $4, dropoff = $5,
          stackdate = $6, "lastFreeDate" = $7, "clientFileRef" = $8, rateweight = $9, description = $10,
          status = $11, vat = $12, num_six_meters = $13, num_twelve_meters = $14, num_abnormal = $15,
          num_breakbulk = $16, weight = $17, total_cost = $18, booking_ref = $19, vessel_name = $20,
          rateper_6 = $21, rateper_12 = $22, rateper_abnormal = $23, rateper_breakbulk = $24, unitrate = $25, is_set_rate = $26, historical_set_rate = $27, created_at = $28, addon_id = $29
        WHERE m1key = $30
        RETURNING *
      `;

      const updateValues = [
        updateData.client,
        updateData.ksmFileRef || updateData.task, // renamed from task
        updateData.shipment_type,
        updateData.pickup,
        updateData.dropoff,
        // pickuptime and pickupdate fields removed
        updateData.stackdate,
        updateData.lastfreedate || updateData.deadline, // renamed from deadline
        updateData.clientFileRef || updateData.fileref, // renamed from fileref
        updateData.rateweight,
        updateData.description,
        updateData.status,
        updateData.vat,
        updateData.num_six_meters,
        updateData.num_twelve_meters,
        updateData.num_abnormal,
        updateData.num_breakbulk,
        updateData.weight,
        updateData.total_cost,
        updateData.booking_ref,
        updateData.vessel_name,
        updateData.rateper_6,
        updateData.rateper_12,
        updateData.rateper_abnormal,
        updateData.rateper_breakbulk,
        updateData.unitrate,
        updateData.is_set_rate,
        updateData.historical_set_rate,
        updateData.created_at,
        updateData.addon_id,
        instructionId,
      ];

      console.log(
        `[${new Date().toISOString()}] [MODEL] Update values being sent to database:`,
        {
          weight: updateValues[16], // $17
          total_cost: updateValues[17], // $18
          booking_ref: updateValues[18], // $19
          vessel_name: updateValues[19], // $20
          rateper_6: updateValues[20], // $21
          rateper_12: updateValues[21], // $22
          rateper_abnormal: updateValues[22], // $23
          rateper_breakbulk: updateValues[23], // $24
          unitrate: updateValues[24], // $25
        }
      );

      const updateResult = await client.query(
        updateInstructionQuery,
        updateValues
      );
      console.log(
        `[${new Date().toISOString()}] [MODEL] Instruction ${instructionId} updated successfully`
      );
    } else {
      console.log(
        `[${new Date().toISOString()}] [MODEL] No changes detected for instruction ${instructionId}`
      );
    }

    // 5. Handle weight rows for shipment type 4 (cross-haul/break bulk)
    if (newShipmentType === "4") {
      const deleteWeightsQuery =
        "DELETE FROM public.m1_controller_weight WHERE m1_key = $1";
      await client.query(deleteWeightsQuery, [instructionId]);

      if (Array.isArray(weightData) && weightData.length > 0) {
        for (const row of weightData) {
          let rowWeight = null;
          if (
            row.weight !== null &&
            row.weight !== undefined &&
            row.weight !== ""
          ) {
            if (typeof row.weight === "string") {
              const trimmed = row.weight.trim();
              if (trimmed !== "") {
                const parsedWeight = Number.parseFloat(trimmed);
                if (!Number.isNaN(parsedWeight) && parsedWeight >= 0) {
                  rowWeight = parsedWeight;
                }
              }
            } else if (typeof row.weight === "number" && row.weight >= 0) {
              rowWeight = row.weight;
            }
          }

          const insertWeightQuery = `
            INSERT INTO public.m1_controller_weight (
              m1_key,
              ksm_dm_no,
              ticket_no,
              receipt_book_no,
              weight
            ) VALUES ($1, $2, $3, $4, $5)
          `;
          const weightValues = [
            instructionId,
            row.ksm_dm_no || row.ksmDmNo || null,
            row.ticket_no || row.ticketNo || null,
            row.receipt_book_no || row.receiptBookNo || null,
            rowWeight,
          ];
          await client.query(insertWeightQuery, weightValues);
        }
      }
    } else if (String(currentInstruction.shipment_type) === "4") {
      const deleteWeightsQuery =
        "DELETE FROM public.m1_controller_weight WHERE m1_key = $1";
      await client.query(deleteWeightsQuery, [instructionId]);
    }

    // 6. Handle containers
    const getCurrentContainersQuery = `
      SELECT containerkey, containernum, weight, container_type, cargo_description,
             "Add Surcharges", "Hazardous", "Surcharge Amount", 
             is_12m_surcharge, surcharge_12m_amount,
             "Hazardous Amount", file_ref, vgm, "vgm amount"
      FROM public.container
      WHERE m1key = $1
      ORDER BY containerkey
    `;
    const currentContainersResult = await client.query(
      getCurrentContainersQuery,
      [instructionId]
    );
    const currentContainers = currentContainersResult.rows;

    console.log(
      `[${new Date().toISOString()}] [MODEL] Current containers: ${
        currentContainers.length
      }, New containers: ${containerData.length}`
    );

    // Compare containers and determine changes
    const containerChanges = compareContainers(
      currentContainers,
      containerData
    );

    console.log(
      `[${new Date().toISOString()}] [MODEL] Container changes: ${
        containerChanges.toUpdate.length
      } to update, ${containerChanges.toInsert.length} to insert, ${
        containerChanges.toDelete.length
      } to delete`
    );

    // Make current instruction fields available for rate lookups (hazardous/VGM)
    const clientId = currentInstruction.client;
    const pickup = currentInstruction.pickup;
    const dropoff = currentInstruction.dropoff;

    // Delete containers (and any associated legs for those containers)
    for (const containerKey of containerChanges.toDelete) {
      // Find the full container record so we can get its container number
      const containerRecord = currentContainers.find(
        (c) => c.containerkey === containerKey
      );

      if (containerRecord && containerRecord.containernum) {
        // Remove any legs that reference this container for this instruction
        await client.query(
          `DELETE FROM public.legs_m2 WHERE m1key = $1 AND containernumber = $2`,
          [instructionId, containerRecord.containernum]
        );
        console.log(
          `[${new Date().toISOString()}] [MODEL] Deleted legs for container ${containerRecord.containernum} on instruction ${instructionId}`
        );
      }

      const deleteQuery = `DELETE FROM public.container WHERE containerkey = $1`;
      await client.query(deleteQuery, [containerKey]);
      console.log(
        `[${new Date().toISOString()}] [MODEL] Deleted container ${containerKey}`
      );
    }

    // Update containers
    for (const container of containerChanges.toUpdate) {

      // Always recompute hazardous amount from current client rates when the
      // hazardous flag is true (except for add-on shipments where amounts
      // must remain 0). This ensures we refresh from m5_client_rate even if
      // the frontend sends a non-zero "Hazardous Amount" from a previous rate.
      let hazardousAmount = 0;
      const isHazardous = container["Hazardous"] || container.hazardous || false;
      
      if (!isAddOnType && isHazardous && clientId && pickup && dropoff) {
        try {
          console.log(
            `[${new Date().toISOString()}] [MODEL] Container ${container.containerkey} is hazardous, refreshing hazardous amount for client ${clientId}, pickup ${pickup}, dropoff ${dropoff}`
          );

          const hazardousRateQuery = `
            SELECT hazardous
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;

          const hazardousRateResult = await client.query(hazardousRateQuery, [
            clientId,
            pickup,
            dropoff
          ]);

          if (hazardousRateResult.rows.length > 0) {
            const fetchedHaz = hazardousRateResult.rows[0].hazardous;
            const numericHaz = Number.parseFloat(fetchedHaz);
            hazardousAmount = Number.isNaN(numericHaz) ? 0 : numericHaz;
            console.log(
              `[${new Date().toISOString()}] [MODEL] Refreshed hazardous amount ${hazardousAmount} for container ${container.containerkey}`
            );
          } else {
            console.log(
              `[${new Date().toISOString()}] [MODEL] No hazardous rate found for client ${clientId}, pickup ${pickup}, dropoff ${dropoff}`
            );
          }
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] [MODEL] Error fetching hazardous amount:`,
            error.message
          );
          // Continue with hazardousAmount = 0 if there's an error
        }
      }

      // Debug log container data before update
      console.log(
        `[${new Date().toISOString()}] [MODEL] Updating container ${
          container.containerkey
        } with data:`,
        {
          containernum: container.containernum,
          weight: container.weight,
          container_type: container.container_type,
          cargo_description: container.cargo_description,
          file_ref: container.file_ref || "",
          "Add Surcharges":
            container["Add Surcharges"] || container.addSurcharges || false,
          Hazardous: container["Hazardous"] || container.hazardous || false,
          "Surcharge Amount":
            container["Surcharge Amount"] || container.surchargeAmount || 0,
          "Hazardous Amount": hazardousAmount,
          containerkey: container.containerkey,
          containerKeyType: typeof container.containerkey,
        }
      );

      // Get VGM flag and amount with fallbacks. For shipment type 4 VGM is
      // explicitly disabled. For shipment type 5 (add-on), the VGM flag
      // should be persisted, but the amount must stay 0. When VGM is
      // enabled, always refresh the amount from current client rates so it
      // stays in sync with m5_client_rate.
      const rawIsVgm = container.vgm || container["vgm"] || false;
      const isVgm = allowVgm ? rawIsVgm : false;

      let vgmAmount = 0;

      if (!isAddOnType && allowVgm && isVgm && clientId && pickup && dropoff) {
        try {
          const vgmQuery = `
            SELECT vgm
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const vgmResult = await client.query(vgmQuery, [
            clientId,
            pickup,
            dropoff,
          ]);
          if (vgmResult.rows.length > 0) {
            const fetched = Number.parseFloat(vgmResult.rows[0].vgm);
            if (!Number.isNaN(fetched) && fetched >= 0) vgmAmount = fetched;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch VGM:", e.message);
        }
      }

      // For shipment type 5 (add-on), force all surcharge/hazardous/VGM
      // amounts to 0 even if the flags are true.
      if (isAddOnType) {
        hazardousAmount = 0;
        vgmAmount = 0;
      }

      const updateContainerQuery = `
        UPDATE public.container 
        SET 
          containernum = $1,
          weight = $2,
          container_type = $3,
          cargo_description = $4,
          "Hazardous" = $5,
          "Add Surcharges" = $6,
          "Surcharge Amount" = $7,
          is_12m_surcharge = $8,
          surcharge_12m_amount = $9,
          "Hazardous Amount" = $10,
          file_ref = $11,
          vgm = $12,
          "vgm amount" = $13
        WHERE containerkey = $14
        RETURNING *
      `;

      // Always recompute surcharge amount from current client rates when the
      // "Add Surcharges" flag is true (except for add-on shipments where
      // amounts must remain 0). This keeps container surcharges aligned with
      // m5_client_rate even if the frontend sends an older amount.
      let rawSurchargeAmount =
        container["Surcharge Amount"] || container.surchargeAmount || 0;
      let surchargeAmount = isAddOnType ? 0 : rawSurchargeAmount;

      const hasAddSurcharges =
        container["Add Surcharges"] || container.addSurcharges || false;

      if (!isAddOnType && hasAddSurcharges && clientId && pickup && dropoff) {
        try {
          const surchargeQuery = `
            SELECT surcharges, surcharge12m
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const surchargeResult = await client.query(surchargeQuery, [
            clientId,
            pickup,
            dropoff,
          ]);

          if (surchargeResult.rows.length > 0) {
            const is12m = (container.container_type || "") === "12m";
            const fetched6 = Number.parseFloat(surchargeResult.rows[0].surcharges);
            const fetched12 = Number.parseFloat(surchargeResult.rows[0].surcharge12m);
            const fetched = is12m ? fetched12 : fetched6;
            surchargeAmount = !Number.isNaN(fetched) && fetched > 0 ? fetched : 0;
          } else {
            surchargeAmount = 0;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch surcharge:", e.message);
          // Keep surchargeAmount as 0 on error
        }
      }

      const updateValues = [
        container.containernum || "",
        container.weight,
        container.container_type || "",
        container.cargo_description || "",
        container["Hazardous"] || container.hazardous || false,
        hasAddSurcharges,
        (container.container_type || "") === "12m" ? 0 : surchargeAmount,
        (container.container_type || "") === "12m" && hasAddSurcharges,
        (container.container_type || "") === "12m" && hasAddSurcharges ? surchargeAmount : 0,
        isAddOnType ? 0 : hazardousAmount,
        container.file_ref || "",
        isVgm,
        isAddOnType ? 0 : vgmAmount,
        container.containerkey,
      ];

      console.log("Updating container with VGM values:", { isVgm, vgmAmount });

      const updateResult = await client.query(updateContainerQuery, updateValues);
      console.log(
        `[${new Date().toISOString()}] [MODEL] Container ${
          container.containerkey
        } update result: ${updateResult.rowCount} rows affected`
      );
    }

    // Insert new containers
    for (const container of containerChanges.toInsert) {
      const containerNum =
        container.containernum || container.containerNum || "";

      // Sanitize weight value
      let sanitizedWeight = null;
      if (
        container.weight !== null &&
        container.weight !== undefined &&
        container.weight !== ""
      ) {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim();
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight);
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight;
            }
          }
        } else if (
          typeof container.weight === "number" &&
          container.weight >= 0
        ) {
          sanitizedWeight = container.weight;
        }
      }
      
      // Fetch hazardous amount if container is marked as hazardous
      let hazardousAmount = container["Hazardous Amount"] || container.hazardousAmount || 0;
      const isHazardous = container["Hazardous"] || container.hazardous || false;
      
      if (isHazardous && hazardousAmount === 0) {
        try {
          // Get current instruction data to access client ID, pickup and dropoff
          const currentInstructionResult = await client.query(
            "SELECT client, pickup, dropoff FROM public.m1_controller WHERE m1key = $1",
            [instructionId]
          );
          
          if (currentInstructionResult.rows.length > 0) {
            const { client: clientId, pickup, dropoff } = currentInstructionResult.rows[0];
            
            console.log(
              `[${new Date().toISOString()}] [MODEL] New container is hazardous, fetching hazardous amount for client ${clientId}, pickup ${pickup}, dropoff ${dropoff}`
            );
            
            // Query to fetch hazardous amount from m5_client_rate table
            const hazardousRateQuery = `
              SELECT hazardous
              FROM public.m5_client_rate
              WHERE clientid = $1
                AND starting_point = $2
                AND destination = $3
              ORDER BY client_rate_id DESC
              LIMIT 1
            `;
            
            const hazardousRateResult = await client.query(hazardousRateQuery, [
              clientId,
              pickup,
              dropoff
            ]);
            
            if (hazardousRateResult.rows.length > 0) {
              hazardousAmount = hazardousRateResult.rows[0].hazardous || 0;
              console.log(
                `[${new Date().toISOString()}] [MODEL] Found hazardous amount ${hazardousAmount} for new container`
              );
            } else {
              console.log(
                `[${new Date().toISOString()}] [MODEL] No hazardous rate found for client ${clientId}, pickup ${pickup}, dropoff ${dropoff}`
              );
            }
          }
        } catch (error) {
          console.error(
            `[${new Date().toISOString()}] [MODEL] Error fetching hazardous amount for new container:`,
            error.message
          );
          // Continue with hazardous amount as 0 if there's an error
        }
      }

      // Calculate surcharge amount for new container (similar to update section)
      let insertSurchargeAmount = 0;
      const hasAddSurcharges = container["Add Surcharges"] || container.addSurcharges || false;
      
      if (!isAddOnType && hasAddSurcharges && clientId && pickup && dropoff) {
        try {
          const surchargeQuery = `
            SELECT surcharges, surcharge12m
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          const surchargeResult = await client.query(surchargeQuery, [
            clientId,
            pickup,
            dropoff,
          ]);

          if (surchargeResult.rows.length > 0) {
            const is12m = (container.container_type || "") === "12m";
            const fetched6 = Number.parseFloat(surchargeResult.rows[0].surcharges);
            const fetched12 = Number.parseFloat(surchargeResult.rows[0].surcharge12m);
            const fetched = is12m ? fetched12 : fetched6;
            insertSurchargeAmount = !Number.isNaN(fetched) && fetched > 0 ? fetched : 0;
          } else {
            insertSurchargeAmount = 0;
          }
        } catch (e) {
          console.error("ERROR: Failed to fetch surcharge for new container:", e.message);
          // Keep insertSurchargeAmount as 0 on error
        }
      }

      const containerType =
        container.containerType || container.container_type || "";
      const cargoDescription =
        container.cargoDescription || container.cargo_description || "";

      // Get VGM flag and amount with fallbacks for new container. For
      // shipment type 4 VGM is disabled. For type 5 (add-on), the VGM flag
      // is persisted but amount forced to 0.
      const rawIsVgm = container.vgm || container["vgm"] || false;
      const isVgm = allowVgm ? rawIsVgm : false;
      let vgmAmount = allowVgm
        ? (container.vgmAmount || container["vgm amount"] || 0)
        : 0;
      if (isAddOnType) {
        vgmAmount = 0;
      }
      
      const insertQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key, container_type, cargo_description, 
          "Add Surcharges", "Hazardous", "Surcharge Amount",
          is_12m_surcharge, surcharge_12m_amount,
          "Hazardous Amount", file_ref, vgm, "vgm amount"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING containerkey
      `;

      const insertResult = await client.query(insertQuery, [
        containerNum,
        sanitizedWeight,
        instructionId,
        containerType,
        cargoDescription,
        container["Add Surcharges"] || container.surcharges || false,
        container["Hazardous"] || container.hazardous || false,
        containerType === "12m" ? 0 : insertSurchargeAmount,
        containerType === "12m",
        containerType === "12m" ? insertSurchargeAmount : 0,
        isAddOnType ? 0 : hazardousAmount,
        container.file_ref || "",
        isVgm,
        isAddOnType ? 0 : vgmAmount,
      ]);

      console.log("Inserted new container with VGM values:", { isVgm, vgmAmount });
      console.log(
        `[${new Date().toISOString()}] [MODEL] Inserted new container ${insertResult.rows[0].containerkey} with hazardous=${isHazardous}, hazardousAmount=${hazardousAmount}, file_ref=${container.file_ref || ""}`,
      );
    } 

    // Commit transaction
    await client.query("COMMIT");
    console.log(
      `[${new Date().toISOString()}] [MODEL] Transaction committed successfully for instruction ${instructionId}`
    );

    // 7. Recalculate total_cost with fresh container amounts from database
    // This ensures total_cost is always correct regardless of what frontend sent
    const finalContainersForCostQuery = `
      SELECT 
        "Add Surcharges", 
        "Surcharge Amount", 
        is_12m_surcharge,
        surcharge_12m_amount,
        "Hazardous", 
        "Hazardous Amount",
        vgm,
        "vgm amount"
      FROM public.container
      WHERE m1key = $1
    `;
    const finalContainersForCost = await client.query(finalContainersForCostQuery, [instructionId]);
    
    // Sum up all surcharges, hazardous, and VGM amounts from containers
    let totalSurcharge = 0;
    let totalHazardous = 0;
    let totalVgm = 0;
    
    for (const container of finalContainersForCost.rows) {
      if (container["Add Surcharges"]) {
        const resolvedSurcharge = container.is_12m_surcharge
          ? Number(container.surcharge_12m_amount || 0)
          : Number(container["Surcharge Amount"] || 0);
        totalSurcharge += resolvedSurcharge;
      }
      if (container["Hazardous"] && container["Hazardous Amount"]) {
        totalHazardous += Number(container["Hazardous Amount"] || 0);
      }
      if (container.vgm && container["vgm amount"]) {
        totalVgm += Number(container["vgm amount"] || 0);
      }
    }
    
    // Get the instruction data for recalculation
    const currentInstructionQuery = `
      SELECT
        num_six_meters, num_twelve_meters, num_abnormal,
        rateper_6, rateper_12, rateper_abnormal,
        total_cost, is_set_rate, rateweight, shipment_type,
        weight, unitrate
      FROM public.m1_controller
      WHERE m1key = $1
    `;
    const currentInstructionResult = await client.query(currentInstructionQuery, [instructionId]);
    const d = currentInstructionResult.rows[0]; // shorthand for instruction data

    // Calculate base cost (matching frontend logic exactly)
    let baseCost = 0;
    let recalculatedTotalCost = 0;

    if (isAddOnType) {
      // Add-on: total cost is always 0
      recalculatedTotalCost = 0;
    } else if (d.is_set_rate) {
      // Set Rate mode: use the total_cost as-is (already set correctly during instruction update)
      // In Set Rate mode, there are no surcharges/hazardous/VGM added
      recalculatedTotalCost = Number(d.total_cost || 0);
    } else if ((d.rateweight === 'kg' || d.rateweight === 'ton') && String(d.shipment_type) === '4') {
      // Shipment type 4: base cost = unit rate * sum of weight rows
      const weightRowsQuery = `
        SELECT weight FROM public.m1_controller_weight WHERE m1_key = $1
      `;
      const weightRowsResult = await client.query(weightRowsQuery, [instructionId]);
      const totalWeight = weightRowsResult.rows.reduce((sum, row) => {
        return sum + (Number(row.weight) || 0);
      }, 0);
      const unitRate = Number(d.unitrate || 0);
      baseCost = totalWeight * unitRate;
      recalculatedTotalCost = Number((baseCost + totalSurcharge + totalHazardous + totalVgm).toFixed(2));
    } else {
      // Container-based calculation
      baseCost =
        (Number(d.num_six_meters || 0) * Number(d.rateper_6 || 0)) +
        (Number(d.num_twelve_meters || 0) * Number(d.rateper_12 || 0)) +
        (Number(d.num_abnormal || 0) * Number(d.rateper_abnormal || 0));
      recalculatedTotalCost = Number((baseCost + totalSurcharge + totalHazardous + totalVgm).toFixed(2));
    }
    
    console.log(
      `[${new Date().toISOString()}] [MODEL] Recalculated total_cost: ${recalculatedTotalCost} (is_set_rate: ${d.is_set_rate}, isAddOn: ${isAddOnType}, base: ${baseCost}, surcharge: ${totalSurcharge}, hazardous: ${totalHazardous}, vgm: ${totalVgm})`
    );
    
    // Update the instruction with the recalculated total_cost
    const updateTotalCostQuery = `
      UPDATE public.m1_controller
      SET total_cost = $1
      WHERE m1key = $2
    `;
    await client.query(updateTotalCostQuery, [recalculatedTotalCost, instructionId]);
    console.log(
      `[${new Date().toISOString()}] [MODEL] Updated instruction ${instructionId} with recalculated total_cost: ${recalculatedTotalCost}`
    );

    // Return updated data
    const finalInstructionQuery = `
      SELECT * FROM public.m1_controller WHERE m1key = $1
    `;
    const finalContainersQuery = `
      SELECT * FROM public.container WHERE m1key = $1 ORDER BY containerkey
    `;

    const [finalInstructionResult, finalContainersResult] = await Promise.all([
      client.query(finalInstructionQuery, [instructionId]),
      client.query(finalContainersQuery, [instructionId]),
    ]);

    return {
      instruction: finalInstructionResult.rows[0],
      containers: finalContainersResult.rows,
      changes: {
        instructionUpdated: instructionNeedsUpdate,
        containersUpdated: containerChanges.toUpdate.length,
        containersInserted: containerChanges.toInsert.length,
        containersDeleted: containerChanges.toDelete.length,
      },
    };
  } catch (error) {
    // Rollback transaction on error
    await client.query("ROLLBACK");
    console.error(
      `[${new Date().toISOString()}] [MODEL] Error in updateFCInstructionAndContainers:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
};

export const saveInstructionAndContainers = async (
  controllerData,
  containerData
) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // clientId, pickup, and dropoff variables are already defined above

    // Calculate total cost if not provided
    const totalCost =
      controllerData.total_cost !== undefined
        ? controllerData.total_cost
        : calculateTotalCost(controllerData);

    // Insert instruction
    const instructionQuery = `
      INSERT INTO public.m1_controller (
        client, "ksmFileRef", shipment_type, pickup, dropoff, surchages, surcharge,
        stackdate, "lastFreeDate", "clientFileRef", rateweight, description,
        status, vat, num_six_meters, num_twelve_meters, num_abnormal, num_breakbulk,
        weight, total_cost, booking_ref, vessel_name, rateper_6, rateper_12,
        rateper_abnormal, rateper_breakbulk, unitrate, addon_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING m1key
    `;

    const instructionValues = [
      controllerData.client,
      controllerData.ksmFileRef || controllerData.task,
      controllerData.shipment_type,
      controllerData.pickup,
      controllerData.dropoff,
      controllerData.surchages || false,
      controllerData.surcharge || 0,
      controllerData.stackdate,
      controllerData.lastFreeDate || controllerData.deadline,
      controllerData.clientFileRef || controllerData.fileref,
      controllerData.rateweight,
      controllerData.description,
      controllerData.status || "New",
      controllerData.vat || 15,
      controllerData.num_six_meters || 0,
      controllerData.num_twelve_meters || 0,
      controllerData.num_abnormal || 0,
      controllerData.num_breakbulk || 0,
      controllerData.weight,
      totalCost,
      controllerData.booking_ref,
      controllerData.vessel_name,
      controllerData.rateper_6,
      controllerData.rateper_12,
      controllerData.rateper_abnormal,
      controllerData.rateper_breakbulk,
      controllerData.unitrate,
      controllerData.addon_id ?? null,
    ];

    const instructionResult = await client.query(
      instructionQuery,
      instructionValues
    );
    const instructionId = instructionResult.rows[0].m1key;

    // Insert containers
    for (const container of containerData) {
      // Sanitize weight value
      let sanitizedWeight = null;
      if (
        container.weight !== null &&
        container.weight !== undefined &&
        container.weight !== ""
      ) {
        if (typeof container.weight === "string") {
          const trimmedWeight = container.weight.trim();
          if (trimmedWeight !== "") {
            const parsedWeight = Number.parseFloat(trimmedWeight);
            if (!isNaN(parsedWeight) && parsedWeight >= 0) {
              sanitizedWeight = parsedWeight;
            }
          }
        } else if (
          typeof container.weight === "number" &&
          container.weight >= 0
        ) {
          sanitizedWeight = container.weight;
        }
      }

      // <CHANGE> Fetch surcharge amount if surcharges is true
      let surchargeAmount = 0;
      const addSurcharges = container["Add Surcharges"] || container.surcharges || false;

      console.log(`DEBUG: Container ${container.containerNum || 'unnamed'} - addSurcharges: ${addSurcharges}`);

      if (addSurcharges && clientId && pickup && dropoff) {
        try {
          const surchargeQuery = `
            SELECT surcharges, surcharge12m
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          console.log(`DEBUG: Executing surcharge query with exact params: clientId='${clientId}', pickup='${pickup}', dropoff='${dropoff}'`);
          
          const surchargeResult = await client.query(surchargeQuery, [
            clientId,
            pickup,
            dropoff
          ]);
          
          console.log(`DEBUG: Surcharge query result rows: ${surchargeResult.rows.length}`);
          console.log(`DEBUG: Raw surcharge result rows:`, JSON.stringify(surchargeResult.rows));
          if (surchargeResult.rows.length > 0) {
            const resolvedType = container.container_type || container.containerType || "";
            const is12m = resolvedType === "12m";
            const fetched6 = Number.parseFloat(surchargeResult.rows[0].surcharges);
            const fetched12 = Number.parseFloat(surchargeResult.rows[0].surcharge12m);
            const fetchedAmount = is12m ? fetched12 : fetched6;
            console.log(`DEBUG: Resolved surcharge amount (${is12m ? "12m" : "6m"}): ${fetchedAmount}`);
            if (!isNaN(fetchedAmount) && fetchedAmount > 0) {
              surchargeAmount = fetchedAmount;
              console.log(`SUCCESS: Fetched surcharge amount: ${surchargeAmount} for container ${container.containerNum || 'unnamed'}`);
            } else {
              console.log(`DEBUG: Surcharge amount is NaN or <= 0: ${fetchedAmount}`);
            }
          } else {
            console.log(`DEBUG: No matching rates found in m5_client_rate table for surcharge`);
          }
        } catch (error) {
          console.error(`Error fetching surcharge amount for container ${container.containerNum || 'unnamed'}:`, error);
          console.log(`API call failed for surcharge amount, defaulting to 0`);
          // Continue with surchargeAmount = 0 on error
        }
      } else if (addSurcharges) {
        console.log(`WARN: Surcharges requested but missing parameters. clientId=${clientId}, pickup=${pickup}, dropoff=${dropoff}`);
      }

      // <CHANGE> Fetch hazardous amount if hazardous is true
      let hazardousAmount = 0;
      const isHazardous = container["Hazardous"] || container.hazardous || false;
      
      // <CHANGE> Fetch VGM amount if VGM is true
      let vgmAmount = 0;
      const isVgm = container["vgm"] || container.vgm || false;

      console.log(`DEBUG: Container ${container.containerNum || 'unnamed'} - isHazardous: ${isHazardous}`);

      if (isHazardous && clientId && pickup && dropoff) {
        try {
          const hazardousQuery = `
            SELECT hazardous
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          console.log(`DEBUG: Executing hazardous query with exact params: clientId='${clientId}', pickup='${pickup}', dropoff='${dropoff}'`);
          
          const hazardousResult = await client.query(hazardousQuery, [
            clientId,
            pickup,
            dropoff
          ]);
          
          console.log(`DEBUG: Hazardous query result rows: ${hazardousResult.rows.length}`);
          console.log(`DEBUG: Raw hazardous result rows:`, JSON.stringify(hazardousResult.rows));
          if (hazardousResult.rows.length > 0) {
            console.log(`DEBUG: First row hazardous value:`, hazardousResult.rows[0].hazardous);
            if (hazardousResult.rows[0].hazardous) {
              const fetchedAmount = Number.parseFloat(hazardousResult.rows[0].hazardous);
              console.log(`DEBUG: Parsed hazardous amount: ${fetchedAmount}`);
              if (!isNaN(fetchedAmount) && fetchedAmount > 0) {
                hazardousAmount = fetchedAmount;
                console.log(`SUCCESS: Fetched hazardous amount: ${hazardousAmount} for container ${container.containerNum || 'unnamed'}`);
              } else {
                console.log(`DEBUG: Hazardous amount is NaN or <= 0: ${fetchedAmount}`);
              }
            } else {
              console.log(`DEBUG: No hazardous value in database row`);
            }
          } else {
            console.log(`DEBUG: No matching rates found in m5_client_rate table for hazardous`);
          }
        } catch (error) {
          console.error(`Error fetching hazardous amount for container ${container.containerNum || 'unnamed'}:`, error);
          console.log(`API call failed for hazardous amount, defaulting to 0`);
          // Continue with hazardousAmount = 0 on error
        }
      } else if (isHazardous) {
        console.log(`WARN: Hazardous requested but missing parameters. clientId=${clientId}, pickup=${pickup}, dropoff=${dropoff}`);
      }

      // Debug log for container data
      console.log(`Processing container for DB insertion:`, {
        containerNum: container.containerNum || container.containernum,
        file_ref: container.fileRef || container.file_ref,
        addSurcharges,
        isHazardous
      });

      // <CHANGE> Fetch VGM amount if VGM is true
      if (isVgm && clientId && pickup && dropoff) {
        try {
          const vgmQuery = `
            SELECT vgm
            FROM public.m5_client_rate
            WHERE clientid = $1
              AND starting_point = $2
              AND destination = $3
            ORDER BY client_rate_id DESC
            LIMIT 1
          `;
          console.log(`DEBUG: Executing VGM query with exact params: clientId='${clientId}', pickup='${pickup}', dropoff='${dropoff}'`);
          
          const vgmResult = await client.query(vgmQuery, [
            clientId,
            pickup,
            dropoff
          ]);
          
          console.log(`DEBUG: VGM query result rows: ${vgmResult.rows.length}`);
          console.log(`DEBUG: Raw VGM result rows:`, JSON.stringify(vgmResult.rows));
          if (vgmResult.rows.length > 0) {
            console.log(`DEBUG: First row VGM value:`, vgmResult.rows[0].vgm);
            if (vgmResult.rows[0].vgm) {
              const fetchedAmount = Number.parseFloat(vgmResult.rows[0].vgm);
              console.log(`DEBUG: Parsed VGM amount: ${fetchedAmount}`);
              if (!isNaN(fetchedAmount) && fetchedAmount > 0) {
                vgmAmount = fetchedAmount;
                console.log(`SUCCESS: Fetched VGM amount: ${vgmAmount} for container ${container.containerNum || 'unnamed'}`);
              } else {
                console.log(`DEBUG: VGM amount is NaN or <= 0: ${fetchedAmount}`);
              }
            } else {
              console.log(`DEBUG: No VGM value in database row`);
            }
          } else {
            console.log(`DEBUG: No matching rates found in m5_client_rate table for VGM`);
          }
        } catch (error) {
          console.error(`Error fetching VGM amount for container ${container.containerNum || 'unnamed'}:`, error);
          console.log(`API call failed for VGM amount, defaulting to 0`);
          // Continue with vgmAmount = 0 on error
        }
      } else if (isVgm) {
        console.log(`WARN: VGM requested but missing parameters. clientId=${clientId}, pickup=${pickup}, dropoff=${dropoff}`);
      }

      // <CHANGE> Updated container query: VGM values are used only in cost
      // calculations and are not stored on the container table.
      const containerQuery = `
        INSERT INTO public.container (
          containernum, weight, m1key, container_type, cargo_description,
          "Add Surcharges", "Hazardous", "Surcharge Amount",
          is_12m_surcharge, surcharge_12m_amount,
          "Hazardous Amount", file_ref
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const resolvedContainerType = container.container_type || container.containerType || "";
      const is12mSurcharge = resolvedContainerType === "12m";
      const sixmSurchargeAmount = is12mSurcharge ? 0 : surchargeAmount;
      const surcharge12mAmount = is12mSurcharge ? surchargeAmount : 0;

      const containerValues = [
        container.containerNum || container.containernum || "",
        sanitizedWeight,
        instructionId,
        resolvedContainerType,
        container.cargo_description || container.cargoDescription || "",
        addSurcharges,
        isHazardous,
        sixmSurchargeAmount, // Legacy 6m surcharge amount
        is12mSurcharge,
        surcharge12mAmount,
        hazardousAmount, // Backend-calculated hazardous amount
        // Extract file_ref value, ensuring proper case handling for all possible variations
        (container.file_ref !== undefined
          ? container.file_ref
          : container.fileRef !== undefined
          ? container.fileRef
          : ""), // New file reference field for export shipments
      ];
      await client.query(containerQuery, containerValues);
    }

    await client.query("COMMIT");
    return instructionId;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving instruction and containers:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Function to delete an instruction and its associated containers
export const deleteInstruction = async (instructionId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // First check if the instruction exists and has an allowed status
    const checkQuery = `
      SELECT status FROM public.m1_controller 
      WHERE m1key = $1
    `;
    const checkResult = await client.query(checkQuery, [instructionId]);

    if (checkResult.rows.length === 0) {
      throw new Error("Instruction not found");
    }

    const status = checkResult.rows[0].status;
    // Allow deletion for 'New' and 'In Progress' instructions; block others
    if (status !== "New" && status !== "In Progress") {
      throw new Error(
        "Only instructions with 'New' or 'In Progress' status can be deleted"
      );
    }

    // Delete any associated weight rows first
    const deleteWeightsQuery = `
      DELETE FROM public.m1_controller_weight
      WHERE m1_key = $1
    `;
    await client.query(deleteWeightsQuery, [instructionId]);

    // Delete any associated legs for this instruction
    const deleteLegsQuery = `
      DELETE FROM public.legs_m2
      WHERE m1key = $1
    `;
    await client.query(deleteLegsQuery, [instructionId]);

    // Delete containers for this instruction (due to foreign key constraints)
    const deleteContainersQuery = `
      DELETE FROM public.container 
      WHERE m1key = $1
    `;
    await client.query(deleteContainersQuery, [instructionId]);

    // Delete any associated invoice rows for this instruction
    const deleteInvoiceQuery = `
      DELETE FROM public.invoice
      WHERE m1key = $1
    `;
    await client.query(deleteInvoiceQuery, [instructionId]);

    // Then delete the instruction
    const deleteInstructionQuery = `
      DELETE FROM public.m1_controller 
      WHERE m1key = $1
    `;
    const result = await client.query(deleteInstructionQuery, [instructionId]);

    await client.query("COMMIT");
    return { success: true, deletedRows: result.rowCount };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      `[${new Date().toISOString()}] Error in deleteInstruction:`,
      error
    );
    throw error;
  } finally {
    client.release();
  }
};

export const getClientSetRate = async (clientId, starting_point, destination) => {
  const sql = `
    SELECT set_rate, fuel_surcharge
    FROM public.m5_client_rate
    WHERE clientid = $1 AND starting_point = $2 AND destination = $3
    ORDER BY client_rate_id DESC
    LIMIT 1
  `;

  console.log(`[${new Date().toISOString()}] getClientSetRate: Executing SQL:`, sql);
  console.log(`[${new Date().toISOString()}] getClientSetRate: With params:`, [clientId, starting_point, destination]);

  try {
    const result = await query(sql, [clientId, starting_point, destination]);
    const rows = result.recordset || result.rows || [];

    console.log(`[${new Date().toISOString()}] getClientSetRate: Query completed, found ${rows.length} rates`);

    if (rows.length > 0) {
      const setRate = applyFuelSurcharge(rows[0].set_rate, rows[0].fuel_surcharge);
      console.log(`[${new Date().toISOString()}] getClientSetRate: Found set_rate: ${setRate}`);
      return { set_rate: setRate };
    } else {
      console.log(`[${new Date().toISOString()}] getClientSetRate: No set_rate found for client ${clientId}, starting_point ${starting_point}, destination ${destination}`);
      return { set_rate: null };
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] getClientSetRate: Error executing query:`, error);
    throw error;
  }
};
