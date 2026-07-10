import { pool, query } from "../../config/database.js";

const getCompletedInvoices = async ({ year, month, type, clientId }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    let queryText = `
      SELECT 
        m1.m1key, 
        m1."ksmFileRef" as instruction_no, 
        s.shipmenttype as shipment_type, 
        m1."clientFileRef" as file_no, 
        m1.status,
        i.ikey,
        i.invoice_num,
        i.date as date
      FROM 
        public.m1_controller m1
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      JOIN
        public.invoice i ON m1.m1key = i.m1key
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (clientId) {
      queryText += ` WHERE m1.client = $${paramIndex}`;
      queryParams.push(clientId);
      paramIndex++;
    }

    if (type && type !== "All") {
      queryText += ` AND s.shipmenttype = $${paramIndex}`;
      queryParams.push(type);
      paramIndex++;
    }

    if (year && month) {
      queryText += ` AND EXTRACT(YEAR FROM i.date) = $${paramIndex} 
                    AND EXTRACT(MONTH FROM i.date) = $${paramIndex + 1}`;
      queryParams.push(year, month);
      paramIndex += 2;
    } else if (year) {
      queryText += ` AND EXTRACT(YEAR FROM i.date) = $${paramIndex}`;
      queryParams.push(year);
      paramIndex++;
    } else if (month) {
      queryText += ` AND EXTRACT(MONTH FROM i.date) = $${paramIndex}`;
      queryParams.push(month);
      paramIndex++;
    }

    queryText += ` ORDER BY i.date DESC`;

    console.log("Executing query:", queryText, "with params:", queryParams);
    const result = await query(queryText, queryParams);
    return { success: true, data: result.rows };
  } catch (error) {
    throw error;
  }
};

// In invoiceModel.js - Update the getInvoiceDetails function
const getInvoiceDetails = async (id) => {
  let client;
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }
    client = await pool.connect();

    const queryText = `
      SELECT 
        m1.m1key,
        m1."ksmFileRef" as instruction_no,
        s.shipmenttype as shipment_type,
        m1.shipment_type as shipment_type_key,
        m1."clientFileRef" as file_no,
        c.client as client_name,
        c.m5clientkey,
        c.companyaddress as client_address,
        c.cellnum as client_telephone,
        c.email as client_email,
        c.vatregno as client_vat,
        c.suburb as client_suburb,
        m1.description,
        m1.total_cost,  
        m1.vat,
        m1.rateweight,
        m1.unitrate,
        m1.is_set_rate,
        m1.historical_set_rate,
        m1.booking_ref,
        m1.pickup,
        m1.dropoff,
        m1.vessel_name,
        -- Base rates from m1_controller
        m1.rateper_6,
        m1.rateper_12,
        m1.rateper_abnormal,
        i.invoice_num,
        i.date,
        i.additional_destination_info,
        ut.cluster_box,
        ut.vat_reg_num,
        ut.address,
        ut.suburb,
        ut.branch_code,
        ut.bank,
        ut.name_of_acc,
        ut.companyname,
        ut.swift_code,
        ut.account_num,
        COALESCE(ut.cell_num, ut.cell_num2) AS phonenumber,
        COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
      FROM 
        invoice i
      INNER JOIN
        public.m1_controller m1 ON i.m1key = m1.m1key
      LEFT JOIN 
        public.shipment s ON m1.shipment_type = s.shipkey
      LEFT JOIN 
        public.m5_client c ON i.clientid = c.m5clientkey
      INNER JOIN
        usertable ut ON ut.roleid = 1 AND ut.status = 'active'
      WHERE 
        i.ikey = $1
    `;
    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      return { success: false, message: "Instruction not found" };
    }

    // Get the base rates from the result
    const baseRates = {
      rateper_6: result.rows[0].rateper_6 || 0,
      rateper_12: result.rows[0].rateper_12 || 0,
      rateper_abnormal: result.rows[0].rateper_abnormal || 0,
    };

    // Updated container query to include all new fields and truck information
    const containerQuery = `
      SELECT 
        c.containernum as container_number,
        c.weight,
        c.container_type,
        c.cargo_description,
        c."Add Surcharges" as add_surcharges,
        c."Hazardous" as hazardous,
        c."Surcharge Amount" as surcharge_amount,
        c.is_12m_surcharge,
        c.surcharge_12m_amount,
        c."Hazardous Amount" as hazardous_amount,
        c."vgm amount" as vgm_amount,
        c.vgm,
        l.truckregnumber,
        l.driverrate as leg_rate,
        l.date as leg_date,
        ROW_NUMBER() OVER (PARTITION BY c.containernum ORDER BY l.date DESC) as rn
      FROM 
        public.container c
      INNER JOIN
        invoice i ON i.m1key = c.m1key
      LEFT JOIN 
        public.legs_m2 l ON c.containernum = l.containernumber AND c.m1key = l.m1key
      WHERE
        i.ikey = $1
      ORDER BY c.containerkey, l.date DESC
    `;
    
    const containerResult = await query(containerQuery, [id]);
    
    // Process container data to get the most recent truck for each container and determine the correct rate
    const containerMap = new Map();
    containerResult.rows.forEach(row => {
      const containerNum = row.container_number;
      if (!containerMap.has(containerNum)) {
        // Determine the container type for base rate lookup (6m, 12m, abnormal)
        let containerType = 'abnormal'; // default
        const ct = (row.container_type || '').toLowerCase();
        if (ct && (ct.includes('20') || ct.includes('6'))) {
          containerType = '6';
        } else if (ct && (ct.includes('40') || ct.includes('12'))) {
          containerType = '12';
        }

        // Determine the rate to use - prioritize special rates, then leg rate, then base rate
        let displayRate = 0;
        const hasSpecialRate = 
          row.surcharge_amount > 0 || 
          row.hazardous_amount > 0 || 
          row.vgm_amount > 0;

        if (hasSpecialRate) {
          // Use the highest special rate
          displayRate = Math.max(
            row.surcharge_amount || 0,
            row.hazardous_amount || 0,
            row.vgm_amount || 0
          );
        } else if (row.leg_rate && row.rn === 1) {
          // Use leg rate if available and it's the most recent leg
          displayRate = row.leg_rate;
        } else {
          // Use base rate based on container type
          displayRate = baseRates[`rateper_${containerType}`] || 0;
        }

        containerMap.set(containerNum, {
          container_number: row.container_number,
          weight: row.weight,
          container_type: row.container_type || 'Standard',
          container_type_key: containerType, // For reference
          cargo_description: row.cargo_description,
          add_surcharges: row.add_surcharges || false,
          hazardous: row.hazardous || false,
          surcharge_amount: row.surcharge_amount || 0,
          is_12m_surcharge: row.is_12m_surcharge || false,
          surcharge_12m_amount: row.surcharge_12m_amount || 0,
          hazardous_amount: row.hazardous_amount || 0,
          vgm: row.vgm || false,
          vgm_amount: row.vgm_amount || 0,
          truckregnumber: null,
          rate_per_container: displayRate,
          leg_rate: row.leg_rate || 0,
          base_rate: baseRates[`rateper_${containerType}`] || 0,
          has_special_rate: hasSpecialRate,
          leg_date: null
        });
      }
      
      // Prefer truck from the most recent leg; if that's missing, fall back to next with a truck
      const existing = containerMap.get(containerNum);
      if (row.rn === 1 && row.truckregnumber) {
        containerMap.set(containerNum, {
          ...existing,
          truckregnumber: row.truckregnumber,
          leg_date: row.leg_date,
          rate_per_container: existing.has_special_rate ? existing.rate_per_container : (row.leg_rate || existing.base_rate)
        });
      } else if (!existing.truckregnumber && row.truckregnumber) {
        // Set truck from a slightly older leg if latest leg has none
        containerMap.set(containerNum, {
          ...existing,
          truckregnumber: row.truckregnumber,
          // Do not override rate/date here; keep latest leg's rate preference
          leg_date: existing.leg_date || row.leg_date,
        });
      }
    });

    const containers = Array.from(containerMap.values());
    console.log(
      `Container query returned ${containers.length} unique containers for invoice ID ${id}`
    );
    console.log("Sample container rates:", containers.slice(0, 2).map(c => ({
      container: c.container_number,
      rate: c.rate_per_container,
      has_special: c.has_special_rate,
      base_rate: c.base_rate,
      leg_rate: c.leg_rate
    })));

    // If shipment type is 4 (weight-based), fetch weight items
    const shipmentTypeKey = result.rows[0].shipment_type_key;
    const isSetRate = result.rows[0].is_set_rate === true || result.rows[0].rateweight === "SetRate";
    const historicalSetRate = Number(result.rows[0].historical_set_rate || 0);
    let weightItems = [];
    const unitrate = Number(result.rows[0].unitrate || 0);
    if (shipmentTypeKey === 4) {
      const weightQuery = `
        SELECT 
          w.ksm_dm_no,
          w.ticket_no,
          w.receipt_book_no,
          w.weight
        FROM public.m1_controller_weight w
        JOIN public.invoice i2 ON i2.m1key = w.m1_key
        WHERE i2.ikey = $1
        ORDER BY w.weight_pk ASC
      `;
      const weightRes = await query(weightQuery, [id]);
      weightItems = weightRes.rows.map((r) => {
        const w = Number(r.weight || 0);
        // For set rate: unitrate = historical_set_rate, price = set_rate × weight
        // For normal weight-based: unitrate = unitrate, price = unitrate × weight
        const rowUnitRate = isSetRate ? historicalSetRate : unitrate;
        const price = Number((w * rowUnitRate).toFixed(2));
        return {
          ksm_dm_no: r.ksm_dm_no || "",
          ticket_no: r.ticket_no || "",
          receipt_book_no: r.receipt_book_no || "",
          weight: w,
          unitrate: rowUnitRate,
          price: price,
        };
      });
      console.log(`Fetched ${weightItems.length} weight items for invoice ID ${id}`);
    }

    return {
      success: true,
      data: {
        ...result.rows[0],
        base_rates: baseRates, // Include base rates for reference
        containers,
        weightItems,
        unitrate,
      },
    };
  } catch (error) {
    throw error;
  } finally {
    if (client) client.release();
  }
};
// Update the updateInstructionDetails function to handle the new field
const updateInstructionDetails = async ({
  m1key,
  dropoff,
  rate,
  invoice_num,
  additional_destination_info, // New parameter
  date,
}) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    // Validate inputs
    if (!m1key) {
      return {
        success: false,
        message: "m1key is required",
      };
    }

    if (rate !== undefined && (isNaN(rate) || rate < 0)) {
      return {
        success: false,
        message: "Rate must be a positive number",
      };
    }

    if (
      invoice_num !== undefined &&
      (!invoice_num || typeof invoice_num !== "string")
    ) {
      return {
        success: false,
        message: "Invoice number must be a non-empty string",
      };
    }

    // Validate additional destination info if provided
    if (
      additional_destination_info !== undefined &&
      (additional_destination_info === "" || typeof additional_destination_info !== "string")
    ) {
      return {
        success: false,
        message: "Additional destination info must be a valid string",
      };
    }

    // Validate date if provided
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return {
          success: false,
          message: "Date must be a valid date string",
        };
      }
    }

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let m1Result = null;
      let invoiceResult = null;

      // Check if invoice_num already exists
      if (invoice_num !== undefined) {
        const invoiceNumCheck = await checkInvoiceNumExists(invoice_num, m1key);
        if (invoiceNumCheck.exists) {
          throw new Error("Invoice number already exists in the database");
        }
      }

      // Update m1_controller table if dropoff or rate is provided
      if (dropoff !== undefined || rate !== undefined) {
        const m1UpdateFields = [];
        const m1QueryParams = [];
        let paramIndex = 1;

        if (dropoff !== undefined) {
          m1UpdateFields.push(`dropoff = $${paramIndex}`);
          m1QueryParams.push(dropoff);
          paramIndex++;
        }

        if (rate !== undefined) {
          m1UpdateFields.push(`total_cost = $${paramIndex}`);
          m1QueryParams.push(rate);
          paramIndex++;
        }

        m1QueryParams.push(m1key);

        const m1QueryText = `
          UPDATE public.m1_controller
          SET ${m1UpdateFields.join(", ")}
          WHERE m1key = $${paramIndex}
          RETURNING m1key, dropoff, total_cost
        `;

        console.log(
          "Executing m1_controller update query:",
          m1QueryText,
          "with params:",
          m1QueryParams
        );
        m1Result = await client.query(m1QueryText, m1QueryParams);

        if (m1Result.rows.length === 0) {
          throw new Error("Instruction not found in m1_controller");
        }
      }

      // Update invoice table if invoice_num or additional_destination_info or date is provided
      if (invoice_num !== undefined || additional_destination_info !== undefined || date !== undefined) {
        const invoiceUpdateFields = [];
        const invoiceQueryParams = [];
        let paramIndex = 1;

        if (invoice_num !== undefined) {
          invoiceUpdateFields.push(`invoice_num = $${paramIndex}`);
          invoiceQueryParams.push(invoice_num);
          paramIndex++;
        }

        if (additional_destination_info !== undefined) {
          invoiceUpdateFields.push(`additional_destination_info = $${paramIndex}`);
          invoiceQueryParams.push(additional_destination_info);
          paramIndex++;
        }

        if (date !== undefined) {
          invoiceUpdateFields.push(`date = $${paramIndex}`);
          invoiceQueryParams.push(date);
          paramIndex++;
        }

        invoiceQueryParams.push(m1key);

        const invoiceQueryText = `
          UPDATE public.invoice
          SET ${invoiceUpdateFields.join(", ")}
          WHERE m1key = $${paramIndex}
          RETURNING ikey, invoice_num, additional_destination_info, date
        `;

        console.log(
          "Executing invoice update query:",
          invoiceQueryText,
          "with params:",
          invoiceQueryParams
        );
        invoiceResult = await client.query(invoiceQueryText, invoiceQueryParams);

        if (invoiceResult.rows.length === 0) {
          throw new Error("Invoice not found for the provided m1key");
        }
      }

      await client.query("COMMIT");

      return {
        success: true,
        data: {
          m1key: m1Result ? m1Result.rows[0].m1key : m1key,
          dropoff: m1Result ? m1Result.rows[0].dropoff : undefined,
          total_cost: m1Result ? m1Result.rows[0].total_cost : undefined,
          invoice_num: invoiceResult ? invoiceResult.rows[0].invoice_num : undefined,
          additional_destination_info: invoiceResult ? invoiceResult.rows[0].additional_destination_info : undefined,
          date: invoiceResult ? invoiceResult.rows[0].date : undefined,
        },
        message: "Instruction and/or invoice updated successfully",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating instruction details:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

// Check if an m1key exists in the invoice table
const checkInvoiceExists = async (m1key) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE m1key = $1
    `;

    const result = await query(queryText, [m1key]);
    const count = Number.parseInt(result.rows[0].count, 10);

    return {
      success: true,
      exists: count > 0,
    };
  } catch (error) {
    console.error("Error checking if invoice exists:", error);
    return {
      success: false,
      message: error.message,
      exists: false,
    };
  }
};

// Check if an invoice number already exists in the invoice table
const checkInvoiceNumExists = async (invoice_num, m1key) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    const queryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE invoice_num = $1 AND m1key != $2
    `;

    const result = await query(queryText, [invoice_num, m1key]);
    const count = Number.parseInt(result.rows[0].count, 10);

    return {
      success: true,
      exists: count > 0,
    };
  } catch (error) {
    console.error("Error checking if invoice number exists:", error);
    return {
      success: false,
      message: error.message,
      exists: false,
    };
  }
};

// Create a new invoice for an instruction
const createInvoice = async ({ m1key, clientId }) => {
  try {
    if (!pool) {
      throw new Error(
        "Database connection not established. Please try again later."
      );
    }

    // Check if invoice already exists for this m1key
    const existsCheck = await checkInvoiceExists(m1key);
    if (existsCheck.exists) {
      return {
        success: false,
        message: "Invoice already exists for this instruction",
      };
    }

    // Generate invoice number (format: INV-YYYYMMDD-XXXX where XXXX is a sequential number)
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Get the next sequential number for today
    const seqQueryText = `
      SELECT COUNT(*) as count
      FROM public.invoice
      WHERE invoice_num LIKE $1
    `;
    const seqResult = await query(seqQueryText, [`INV-${dateStr}-%`]);
    const seqNum = Number.parseInt(seqResult.rows[0].count, 10) + 1;

    // Format the invoice number
    const invoiceNum = `INV-${dateStr}-${String(seqNum).padStart(4, "0")}`;

    // Insert the new invoice
    const insertQueryText = `
      INSERT INTO public.invoice
      (clientid, m1key, invoice_num, date)
      VALUES ($1, $2, $3, $4)
      RETURNING ikey
    `;

    // Determine invoice date based on earliest date for legnumber = 1
    const legDateQuery = `
      SELECT MIN(l.date) AS first_leg_date
      FROM public.legs_m2 l
      WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
    `;
    const legDateResult = await query(legDateQuery, [m1key]);
    const firstLegDate =
      legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
        ? new Date(legDateResult.rows[0].first_leg_date)
        : null;
    const invoiceDate = firstLegDate || today;

    const result = await query(insertQueryText, [
      clientId,
      m1key,
      invoiceNum,
      invoiceDate,
    ]);

    return {
      success: true,
      data: {
        ikey: result.rows[0].ikey,
        invoice_num: invoiceNum,
      },
    };
  } catch (error) {
    console.error("Error creating invoice:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};


// Helper function to get instruction details for preview
const getInstructionDetailsForPreview = async (instructionId) => {
  try {
    if (!pool) {
      throw new Error("Database connection not established");
    }

    const client = await pool.connect();

    try {
      // Get m1_controller details
      const m1Query = `
        SELECT 
          m1.m1key,
          m1."ksmFileRef" as instruction_no,
          m1."clientFileRef" as file_no,
          m1.description,
          m1.total_cost,
          m1.vat,
          m1.booking_ref,
          m1.pickup,
          m1.dropoff,
          m1.vessel_name,
          m1.rateper_6,
          m1.rateper_12,
          m1.rateper_abnormal,
          m1.shipment_type as shipment_type_key,
          m1.unitrate,
          m1.is_set_rate,
          m1.historical_set_rate,
          c.client as client_name,
          c.m5clientkey,
          c.companyaddress as client_address,
          c.cellnum as client_telephone,
          c.email as client_email,
          c.vatregno as client_vat,
          c.suburb as client_suburb,
          s.shipmenttype as shipment_type,
          COALESCE(m1.num_six_meters, 0) + COALESCE(m1.num_twelve_meters, 0) + COALESCE(m1.num_abnormal, 0) as num_containers
        FROM public.m1_controller m1
        LEFT JOIN public.m5_client c ON m1.client = c.m5clientkey
        LEFT JOIN public.shipment s ON m1.shipment_type = s.shipkey
        WHERE m1.m1key = $1
      `;
      
      const m1Result = await client.query(m1Query, [instructionId]);
      
      if (m1Result.rows.length === 0) {
        return { success: false, message: "Instruction not found" };
      }

      // Get containers and join legs_m2 to fetch latest truck per container
      const containerQuery = `
        SELECT 
          c.containernum as container_number,
          c.weight,
          c.container_type,
          c.cargo_description,
          c."Add Surcharges" as add_surcharges,
          c."Hazardous" as hazardous,
          c."Surcharge Amount" as surcharge_amount,
          c.is_12m_surcharge,
          c.surcharge_12m_amount,
          c."Hazardous Amount" as hazardous_amount,
          c."vgm amount" as vgm_amount,
          c.vgm,
          l.truckregnumber,
          l.driverrate as leg_rate,
          l.date as leg_date,
          ROW_NUMBER() OVER (PARTITION BY c.containernum ORDER BY l.date DESC) as rn
        FROM public.container c
        LEFT JOIN public.legs_m2 l 
          ON c.containernum = l.containernumber AND c.m1key = l.m1key
        WHERE c.m1key = $1
        ORDER BY c.containerkey, l.date DESC
      `;
      
      const containerResult = await client.query(containerQuery, [instructionId]);

      // Get company details (same as regular invoice)
      const companyQuery = `
        SELECT 
          cluster_box,
          vat_reg_num,
          address,
          suburb,
          branch_code,
          bank,
          name_of_acc,
          companyname,
          swift_code,
          account_num,
          COALESCE(cell_num, cell_num2) AS phonenumber
        FROM usertable 
        WHERE roleid = 1 AND status = 'active'
        LIMIT 1
      `;
      
      const companyResult = await client.query(companyQuery);

      const baseRates = {
        rateper_6: m1Result.rows[0].rateper_6 || 0,
        rateper_12: m1Result.rows[0].rateper_12 || 0,
        rateper_abnormal: m1Result.rows[0].rateper_abnormal || 0,
      };

      // Process containers with rate logic and attach latest truck info
      const containerMap = new Map();
      containerResult.rows.forEach(row => {
        const containerNum = row.container_number;
        if (!containerMap.has(containerNum)) {
          let containerType = 'abnormal';
          if ((row.container_type && row.container_type.toLowerCase().includes('20')) || 
              (row.container_type && row.container_type.toLowerCase().includes('6'))) {
            containerType = '6';
          } else if ((row.container_type && row.container_type.toLowerCase().includes('40')) || 
                     (row.container_type && row.container_type.toLowerCase().includes('12'))) {
            containerType = '12';
          }

          let displayRate = 0;
          const hasSpecialRate = 
            (row.surcharge_amount || 0) > 0 || 
            (row.hazardous_amount || 0) > 0 || 
            (row.vgm_amount || 0) > 0;

          if (hasSpecialRate) {
            displayRate = Math.max(
              row.surcharge_amount || 0,
              row.hazardous_amount || 0,
              row.vgm_amount || 0
            );
          } else if (row.leg_rate && row.rn === 1) {
            displayRate = row.leg_rate;
          } else {
            displayRate = baseRates[`rateper_${containerType}`] || 0;
          }

          containerMap.set(containerNum, {
            container_number: row.container_number,
            weight: row.weight,
            container_type: row.container_type || 'Standard',
            container_type_key: containerType,
            cargo_description: row.cargo_description,
            add_surcharges: row.add_surcharges || false,
            hazardous: row.hazardous || false,
            surcharge_amount: row.surcharge_amount || 0,
            hazardous_amount: row.hazardous_amount || 0,
            vgm: row.vgm || false,
            vgm_amount: row.vgm_amount || 0,
            truckregnumber: null,
            rate_per_container: displayRate,
            leg_rate: row.leg_rate || 0,
            base_rate: baseRates[`rateper_${containerType}`] || 0,
            has_special_rate: hasSpecialRate,
            leg_date: null
          });
        }
        // Update with latest truck info if this is the most recent leg
        if (row.rn === 1 && row.truckregnumber) {
          const existing = containerMap.get(containerNum);
          containerMap.set(containerNum, {
            ...existing,
            truckregnumber: row.truckregnumber,
            leg_date: row.leg_date,
            rate_per_container: existing.has_special_rate ? existing.rate_per_container : (row.leg_rate || existing.base_rate)
          });
        } else if (!containerMap.get(containerNum).truckregnumber && row.truckregnumber) {
          // Fallback: if latest leg has no truck, use the next available leg's truck
          const existing = containerMap.get(containerNum);
          containerMap.set(containerNum, {
            ...existing,
            truckregnumber: row.truckregnumber,
            leg_date: existing.leg_date || row.leg_date,
          });
        }
      });

      const containers = Array.from(containerMap.values());

      // Weight-based items for preview when shipment_type_key = 4
      let weightItems = [];
      const unitratePrev = Number(m1Result.rows[0].unitrate || 0);
      const isSetRatePrev = m1Result.rows[0].is_set_rate === true;
      const historicalSetRatePrev = Number(m1Result.rows[0].historical_set_rate || 0);
      if (m1Result.rows[0].shipment_type_key === 4) {
        const weightQuery = `
          SELECT 
            w.ksm_dm_no,
            w.ticket_no,
            w.receipt_book_no,
            w.weight
          FROM public.m1_controller_weight w
          WHERE w.m1_key = $1
          ORDER BY w.weight_pk ASC
        `;
        const weightRes = await client.query(weightQuery, [instructionId]);
        weightItems = weightRes.rows.map((r) => {
          const w = Number(r.weight || 0);
          // For set rate: unitrate = historical_set_rate, price = set_rate × weight
          // For normal weight-based: unitrate = unitrate, price = unitrate × weight
          const rowUnitRate = isSetRatePrev ? historicalSetRatePrev : unitratePrev;
          const price = Number((w * rowUnitRate).toFixed(2));
          return {
            ksm_dm_no: r.ksm_dm_no || "",
            ticket_no: r.ticket_no || "",
            receipt_book_no: r.receipt_book_no || "",
            weight: w,
            unitrate: rowUnitRate,
            price: price,
          };
        });
      }

      // Determine earliest date for legnumber = 1 to be used as preview invoice date
      const legDateQuery = `
        SELECT MIN(l.date) AS first_leg_date
        FROM public.legs_m2 l
        WHERE l.m1key = $1 AND l.legnumber = 1 AND l.date IS NOT NULL
      `;
      const legDateResult = await client.query(legDateQuery, [instructionId]);
      const firstLegDate =
        legDateResult.rows.length > 0 && legDateResult.rows[0].first_leg_date
          ? new Date(legDateResult.rows[0].first_leg_date)
          : new Date();

      return {
        success: true,
        data: {
          ...m1Result.rows[0],
          containers,
          weightItems,
          unitrate: unitratePrev,
          base_rates: baseRates,
          // Add company details
          ...companyResult.rows[0],
          // Add preview metadata
          is_preview: true,
          preview_instruction_id: instructionId,
          preview_generated_at: new Date().toISOString(),
          preview_invoice_date: firstLegDate
        }
      };

    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error getting instruction details for preview:", error);
    return { success: false, message: error.message };
  }
};


export {
  getCompletedInvoices,
  getInvoiceDetails,
  checkInvoiceExists,
  checkInvoiceNumExists,
  createInvoice,
  updateInstructionDetails,
  getInstructionDetailsForPreview,
};
