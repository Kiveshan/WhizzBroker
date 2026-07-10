import { getOutputVat, getInputVat, getSubbieRates } from "../../models/vat-recon/vat-reconModel.js"

export const getVatReconHandler = async (req, res) => {
    try {
        const { month, year } = req.query

        if (!month || !year) {
            return res.status(400).json({ error: "Month and year are required" })
        }

        console.log(`Generating VAT recon report for ${month} ${year}`)

        const outputVat = await getOutputVat(month, year)
        console.log(`Fetched ${outputVat.length} output VAT records`)

        const inputVat = await getInputVat(month, year)
        console.log(`Fetched ${inputVat.length} input VAT records`)

        const subbieRates = await getSubbieRates(month, year)
        console.log(`Fetched ${subbieRates.length} subbie rate records`) // ✅ fix: .length not .total

        // Output VAT: sum of (totalCost * vatRate / 100) per client
        const totalOutputVat = outputVat.reduce((sum, item) => {
            return sum + (item.totalCost * item.vatRate) / 100
        }, 0)

        // Input VAT: purchase orders VAT + subbie rates VAT ✅ fix: subbies now included
        const totalPurchaseOrderVat = inputVat.reduce((sum, item) => {
            return sum + item.vat
        }, 0)

        const totalSubbieVat = subbieRates.reduce((sum, item) => {
            return sum + item.vat
        }, 0)

        const totalInputVat = totalPurchaseOrderVat + totalSubbieVat

        const vatOwed = totalOutputVat - totalInputVat

        res.json({
            success: true,
            month,
            year,
            outputVat,
            inputVat,
            subbieRates,
            summary: {
                totalOutputVat: parseFloat(totalOutputVat.toFixed(2)),
                totalInputVat: parseFloat(totalInputVat.toFixed(2)),
                totalPurchaseOrderVat: parseFloat(totalPurchaseOrderVat.toFixed(2)), // optional breakdown
                totalSubbieVat: parseFloat(totalSubbieVat.toFixed(2)),               // optional breakdown
                vatOwed: parseFloat(vatOwed.toFixed(2)),
            },
        })
    } catch (error) {
        console.error("Error generating VAT recon report:", error)
        res.status(500).json({ error: "Failed to generate VAT recon report" })
    }
}