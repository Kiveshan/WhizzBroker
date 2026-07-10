export const fetchDrivers = async ({ api, setEmployeeDrivers }) => {
  try {
    const response = await api.get("/employees/driverssub");
    const data = response.data;
    console.log("Drivers from backend:", data);
    setEmployeeDrivers(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Error fetching drivers:", error);
  }
};

export const fetchTruckRegNums = async ({ api, setTruckRegOptions }) => {
  try {
    const response = await api.get("/trucks/regnums");
    const data = response.data;
    console.log("Truck registration numbers from backend:", data);
    setTruckRegOptions(data);
  } catch (error) {
    console.error("Error fetching truck registration numbers:", error);
  }
};
