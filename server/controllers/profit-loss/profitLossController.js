import { getProfitLossData, getCompanyDetails } from '../../models/profit-loss/profitLossModel.js';

const generateProfitLossReport = async (req, res) => {
    const { month, year } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        const { profitDetails, lossDetails, totalProfit, totalLoss, net } = await getProfitLossData(month, year);

        const responseData = {
            month,
            year,
            profitDetails,
            lossDetails,
            totalProfit,
            totalLoss,
            net,
        };

        res.json(responseData);
    } catch (error) {
        console.error('Error generating report:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
};

const getCompanyDetailsHandler = async (req, res) => {
    try {
        const companyname = await getCompanyDetails();
        res.json({ companyname });
    } catch (error) {
        console.error('Error fetching company details:', error);
        res.status(500).json({ error: 'Failed to fetch company details' });
    }
};

export { generateProfitLossReport, getCompanyDetailsHandler };