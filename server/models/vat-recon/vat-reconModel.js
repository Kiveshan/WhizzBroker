import { pool } from "../../config/database.js"

export const getOutputVat = async (month, year) => {
    const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ].indexOf(month) + 1

    const query = `
        SELECT 
            c.m5clientkey,
            c.client AS client_name,
            SUM(m.total_cost) AS total_cost,
            COALESCE(m.vat, 15) AS vat_rate
        FROM m1_controller m
        JOIN m5_client c ON m.client = c.m5clientkey
        WHERE EXTRACT(MONTH FROM m.created_at) = $1
        AND EXTRACT(YEAR FROM m.created_at) = $2
        AND m.total_cost IS NOT NULL
        AND m.total_cost > 0
        GROUP BY c.m5clientkey, c.client, COALESCE(m.vat, 15)
        ORDER BY c.client
    `

    try {
        const result = await pool.query(query, [monthIndex, year])
        return result.rows.map((row) => ({
            clientId: row.m5clientkey,
            clientName: row.client_name,
            totalCost: parseFloat(row.total_cost) || 0,
            vatRate: parseFloat(row.vat_rate) || 15,
        }))
    } catch (error) {
        console.error("Error fetching output VAT:", error)
        throw error
    }
}

export const getInputVat = async (month, year) => {
    const monthIndex = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ].indexOf(month) + 1

    const query = `
        SELECT 
            po.date,
            et.expense AS expense_type,
            po.total,
            po.vat
        FROM purchase_orders po
        JOIN expense_types et ON po.expense_type_id = et.id
        WHERE EXTRACT(MONTH FROM po.date) = $1
        AND EXTRACT(YEAR FROM po.date) = $2
        AND po.vat IS NOT NULL
        AND po.vat > 0
        ORDER BY po.date, et.expense
    `

    try {
        const result = await pool.query(query, [monthIndex, year])
        return result.rows.map((row) => ({
            date: row.date ? new Date(row.date).toISOString().split("T")[0] : null,
            expenseType: row.expense_type,
            total: parseFloat(row.total) || 0,
            vat: parseFloat(row.vat) || 0,
        }))
    } catch (error) {
        console.error("Error fetching input VAT:", error)
        throw error
    }
}

export const getSubbieRates = async (month, year) => {
    const monthIndex = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ].indexOf(month) + 1

    const query = `
        SELECT 
            e.companyname,
            m.vat AS vat_rate,
            SUM(l.driverrate) AS total_rate
        FROM legs_m2 l
        JOIN m5_employee e ON l.driverid = e.userid
        JOIN m1_controller m ON l.m1key = m.m1key
        WHERE EXTRACT(MONTH FROM l.date) = $1
        AND EXTRACT(YEAR FROM l.date) = $2
        AND l.driverrate IS NOT NULL
        AND l.driverrate > 0
        AND e.roleid = 6
        AND e.companyname IS NOT NULL
        GROUP BY e.companyname, m.vat
        ORDER BY e.companyname
    `

    try {
        const result = await pool.query(query, [monthIndex, year])

        return result.rows.map((row) => {
            const totalRate = parseFloat(row.total_rate) || 0
            // Only apply VAT if m1_controller.vat is set (not null)
            const vatRate = row.vat_rate !== null ? parseFloat(row.vat_rate) : null
            const vat = vatRate !== null ? (totalRate * vatRate) / 100 : 0

            return {
                expenseType: `Subbie rate - ${row.companyname}`,
                total: totalRate,
                vat: vat,
                date: null,
                companyName: row.companyname,
                vatRate: vatRate,
            }
        })
    } catch (error) {
        console.error("Error fetching subbie rates:", error)
        throw error
    }
}