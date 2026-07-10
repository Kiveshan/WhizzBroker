import { getEmployeeById } from "../../models/employees/employeeModel.js";

const getEmployeeHandler = async (req, res) => {
  const { id } = req.params;
  console.log(`Route /api/employee/${id} was accessed`);

  try {
    const result = await getEmployeeById(id);
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    console.log(`Found employee data for ID ${id}:`, result.data);
    res.json(result.data);
  } catch (error) {
    console.error(`Error fetching employee data for ID ${id}:`, error);
    res.status(500).json({
      error: "An error occurred while fetching employee data",
      message: error.message,
    });
  }
};

export { getEmployeeHandler };
