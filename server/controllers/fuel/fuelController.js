import {
  // getTrucksWithFuelExpenses,
  getAllCompanyOwnedTrucks,
  getExpensesByTruckId,
  getAllExpenses,
} from "../../models/fuel/fuelModel.js";

// const getTrucksWithFuelExpensesHandler = async (req, res) => {
//   console.log("Route /trucks/fuel-expenses was accessed");

//   try {
//     const trucks = await getTrucksWithFuelExpenses();
//     console.log("Trucks with fuel expenses found:", trucks);

//     if (trucks.length === 0) {
//       console.log("No trucks with fuel expenses found");
//     } else {
//       console.log(`Found ${trucks.length} trucks with fuel expenses`);
//     }

//     res.status(200).json(trucks);
//   } catch (err) {
//     console.error("Error fetching trucks with fuel expenses:", err);
//     res.status(500).json({ error: err.message });
//   }
// };
const getAllCompanyOwnedTrucksHandler = async (req, res) => {
  try {
    const trucks = await getAllCompanyOwnedTrucks();
    res.status(200).json(trucks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getTruckExpensesHandler = async (req, res) => {
  const { truckId } = req.params;
  console.log(`Route /expenses/truck/${truckId} was accessed`);

  try {
    const expenses = await getExpensesByTruckId(truckId);
    console.log(`Found ${expenses.length} expenses for truck ID ${truckId}`);

    const processedResults = expenses.map((row) => ({
      ...row,
      documentfrom: row.documentfrom_display,
    }));

    res.status(200).json(processedResults);
  } catch (err) {
    console.error(`Error fetching expenses for truck ID ${truckId}:`, err);
    res.status(500).json({ error: err.message });
  }
};

const getAllExpensesHandler = async (req, res) => {
  console.log("Route GET /expenses was accessed");

  try {
    const expenses = await getAllExpenses();
    console.log(`Found ${expenses.length} expenses`);

    res.status(200).json(expenses);
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

export {
  getAllCompanyOwnedTrucksHandler,
  // getTrucksWithFuelExpensesHandler,
  getTruckExpensesHandler,
  getAllExpensesHandler,
};
