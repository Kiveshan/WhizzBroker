import { getAllDrivers } from "../../models/drivers/driverModel.js";

const getDriversHandler = async (req, res) => {
  console.log("Route /employees/drivers was accessed");

  try {
    const result = await getAllDrivers();
    console.log("Drivers found:", result);
    if (result.length === 0) {
      console.log("No drivers found in the m5_employee table");
    } else {
      console.log(`Found ${result.length} drivers`);
    }
    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({
      error: "Server Error",
      message: error.message,
    });
  }
};

export { getDriversHandler };
