import api from "../../api.js";

// Utility Functions
export const calculateTurnoverStatus = (turnover) => {
  if (turnover >= 10000) return "high";
  if (turnover >= 5000) return "medium";
  return "low";
};

export const calculateStatus = (cost) => {
  if (cost <= 3500) return "good";
  if (cost <= 4500) return "warning";
  return "bad";
};

export const getChartWidth = (dataLength, activeFilter) => {
  if (
    activeFilter === "turnoverPerMonth" ||
    activeFilter === "agingAnalysis" ||
    activeFilter === "subcontractorVsTurnover" ||
    activeFilter === "subcontractorTurnoverPerMonth" ||
    activeFilter === "wagesVsExpenses" ||
    activeFilter === "incomeVsExpense" ||
    activeFilter === "turnoverVsSubbieExpense" ||
    activeFilter === "turnoverVsFuelPerTruck" ||
    activeFilter === "paymentsReceivedPerMonth"
  ) {
    return 1000;
  }
  const minWidth = 1000;
  const barWidth = 180;
  return Math.max(minWidth, dataLength * barWidth);
};

export const formatClientName = (name) => {
  if (typeof name !== "string") return "";
  const words = name.split(/[\s&,.-]+/).filter((word) => word.length > 0);
  if (words.length <= 1 || name.length <= 8) {
    return name;
  }
  return words.join("\n");
};

export const CustomAxisTick = ({ x, y, payload }) => {
  const lines = formatClientName(payload.value).split("\n");
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={index}
          x={0}
          y={index * 12 + 10}
          dy={0}
          textAnchor="middle"
          fill="#333"
          fontSize="11"
        >
          {line}
        </text>
      ))}
    </g>
  );
};

export const getBarFill = (entry, activeFilter) => {
  console.log("getBarFill entry:", entry);
  if (activeFilter === "fuel" && entry && entry.status) {
    console.log(`Applying color for status: ${entry.status}`);
    switch (entry.status) {
      case "good":
        return "#4CAF50";
      case "warning":
        return "#FFC107";
      case "bad":
        return "#F44336";
      default:
        return "#4169E1";
    }
  } else if (activeFilter === "turnoverPerTruck" && entry && entry.status) {
    console.log(`Applying color for turnover status: ${entry.status}`);
    switch (entry.status) {
      case "high":
        return "#4CAF50";
      case "medium":
        return "#FFC107";
      case "low":
        return "#F44336";
      default:
        return "#4169E1";
    }
  } else if (
    (activeFilter === "subcontractorVsTurnover" ||
      activeFilter === "subcontractorTurnoverPerMonth" ||
      activeFilter === "wagesVsExpenses" ||
      activeFilter === "incomeVsExpense" ||
      activeFilter === "turnoverVsSubbieExpense") &&
    entry &&
    entry.type
  ) {
    return entry.type === "total"
      ? "#2196F3"
      : entry.type === "subcontractor"
        ? "#FF6347"
        : entry.type === "income"
          ? "#4169E1"
          : entry.type === "expenses"
            ? "#FF6347"
            : "#4169E1";
  } else if (activeFilter === "turnoverVsFuelPerTruck") {
    return "#4169E1";
  }
  console.log("Falling back to default color");
  return "#4169E1";
};

export const CustomBarLabelForTurnover = ({ x, y, width, value, payload = {} }) => {
  console.log("CustomBarLabelForTurnover - payload:", payload);
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      fill="#000"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
    >
      {`R${value?.toLocaleString() || 0}`}
    </text>
  );
};

export const CustomBarLabelForDieselCost = ({
  x,
  y,
  width,
  value,
  payload = {},
}) => {
  console.log("CustomBarLabelForDieselCost - payload:", payload);
  const percentage =
    payload.fuelCostPercentage ?? payload.dieselCostPercentage ?? 0;
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      fill="#000"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
    >
      {`R${value?.toLocaleString() || 0} (${percentage}%)`}
    </text>
  );
};

export const CustomBarLabelForFuelAndTurnover = ({ x, y, width, value, index, chartData }) => {
  if (value === undefined || value === null) {
    console.log(
      "CustomBarLabelForFuelAndTurnover: Value is undefined or null, skipping label"
    );
    return null;
  }
  console.log(
    `CustomBarLabelForFuelAndTurnover: index=${index}, chartData=`,
    chartData
  );
  
  // Handle case where chartData is undefined or index is out of bounds
  const percentage = chartData && chartData[index] ? chartData[index].percentage || 0 : 0;
  console.log(`Selected percentage: ${percentage}%`);
  const labelText = `R${value.toLocaleString()} (${percentage}%)`;
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      fill="#000"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
    >
      {labelText}
    </text>
  );
};

export const CustomBarLabelForDefault = ({ x, y, width, value }) => {
  if (value === undefined || value === null) {
    console.log(
      "CustomBarLabelForDefault: Value is undefined or null, skipping label"
    );
    return null;
  }
  const labelText = `R${value.toLocaleString()}`;
  return (
    <text
      x={x + width / 2}
      y={y - 10}
      fill="#000"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={12}
    >
      {labelText}
    </text>
  );
};

export const CustomBarLabelForPayments = (props) => {
  const { x, y, width, value } = props;

  if (value === undefined || value === null || isNaN(value)) {
    return null;
  }

  const formatted = Number(value).toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 0,
  });

  const labelY = y - 10;

  return (
    <text
      x={x + width / 2}
      y={labelY}
      fill="#333"
      fontSize={12}
      fontWeight="bold"
      textAnchor="middle"
    >
      {formatted}
    </text>
  );
};

// Data Fetching Functions
export const fetchClients = async (setClients, setError) => {
  try {
    const response = await api.get("/api/get-clients");
    if (response.data.success) {
      setClients(response.data.data);
    } else {
      setError("Failed to fetch clients");
    }
  } catch (err) {
    setError(`Failed to fetch clients: ${err.message}`);
  }
};

export const fetchSubcontractors = async (setSubcontractors, setError) => {
  try {
    const response = await api.get("/api/get-subcontractors");
    if (response.data.success) {
      setSubcontractors(response.data.data);
    } else {
      setError("Failed to fetch subcontractors");
    }
  } catch (err) {
    setError(`Failed to fetch subcontractors: ${err.message}`);
  }
};

export const fetchTrucks = async (setTrucks, setError) => {
  try {
    const response = await api.get("/api/get-trucks");
    console.log("Raw /api/get-trucks response:", response);
    if (response.data.success) {
      const truckData = response.data.data.filter(
        (truck) => !truck.issubcontractor
      );
      console.log("Filtered trucks (non-subcontractors):", truckData);
      if (truckData.length === 0) {
        console.warn(
          "No non-subcontractor trucks found in /api/get-trucks response"
        );
        setError("No trucks available");
        setTrucks([]);
        return;
      }
      setTrucks(
        truckData.map((truck) => ({
          ...truck,
          truckregnumber:
            truck.truckregnum ||
            truck.reg_number ||
            truck.truck_reg ||
            truck.registration_number ||
            `Truck ID ${truck.m5truckskey}`,
        }))
      );
    } else {
      console.error("API error in /api/get-trucks:", response.data.message);
      setError("Failed to fetch trucks: " + response.data.message);
      setTrucks([]);
    }
  } catch (err) {
    console.error("Error fetching trucks:", err);
    setError(`Failed to fetch trucks: ${err.message}`);
    setTrucks([]);
  }
};

export const fetchFuelData = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(`Fetching fuel data for month: ${month}, year: ${year}`);
    const response = await api.get("/api/fuel-expenses", {
      params: { month, year, _t: new Date().getTime() },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      console.log("Fuel data received:", response.data.data);
      const fuelExpenses = response.data.data.map((expense) => {
        const cost = Number.parseFloat(expense.total_cost);
        const status = calculateStatus(cost);
        console.log(
          `Truck ${expense.truckregnum}: Cost=${cost}, Status=${status}, Percentage=${expense.percentage}%`
        );
        return {
          truckId: expense.truckregnum,
          value: cost,
          month: expense.month_name.trim(),
          year: expense.year.toString(),
          status: status,
          percentage: expense.percentage,
        };
      });
      console.log("Processed fuel expenses:", fuelExpenses);
      return fuelExpenses;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error(
      "Error fetching fuel data:",
      err.response ? err.response.data : err.message
    );
    setError(`Failed to fetch fuel data: ${err.message}`);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverData = async (month, year, clientId, setIsLoading, setError, clients) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching turnover data for month: ${month}, year: ${year}, clientId: ${clientId}`
    );
    const response = await api.get("/api/turnover-per-month", {
      params: {
        month,
        year,
        clientId: clientId || undefined,
        _t: new Date().getTime(),
      },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      let turnoverData = response.data.data.map((item) => {
        const turnover = Number.parseFloat(item.turnover);
        console.log(
          `Client ${item.client}: Turnover=${turnover}, Percentage=${item.percentage}%`
        );
        return {
          name: item.client,
          turnover: turnover,
          month: item.month_name.trim(),
          year: item.year,
          percentage: item.percentage,
        };
      });
      console.log("Processed turnover data before handling zero:", turnoverData);

      // If a client is selected and only the total is present, add a zero entry for the client
      if (clientId && turnoverData.length === 1 && turnoverData[0].name === "Total Turnover") {
        const selectedClientName = clients.find((c) => c.m5clientkey === clientId)?.client || "";
        if (selectedClientName) {
          turnoverData.push({
            name: selectedClientName,
            turnover: 0,
            month: month.trim(),
            year: turnoverData[0].year || year,
            percentage: 0,
          });
          console.log(`Added zero-turnover entry for client: ${selectedClientName}`);
        }
      }

      console.log("Processed turnover data before sorting:", turnoverData);

      turnoverData = turnoverData.sort((a, b) => {
        if (a.name === "Total Turnover") return -1;
        if (b.name === "Total Turnover") return 1;
        if (
          clientId &&
          a.name === clients.find((c) => c.m5clientkey === clientId)?.client
        )
          return 1;
        if (
          clientId &&
          b.name === clients.find((c) => c.m5clientkey === clientId)?.client
        )
          return -1;
        return a.name.localeCompare(b.name);
      });

      console.log("Processed turnover data after sorting:", turnoverData);
      return turnoverData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching turnover data:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchAgingAnalysisData = async (month, year, clientId, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching aging analysis data for month: ${month}, year: ${year}, clientId: ${clientId}`
    );
    const response = await api.get("/api/aging-analysis", {
      params: {
        month,
        year,
        clientId: clientId || undefined,
        _t: new Date().getTime(),
      },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      console.log("Aging analysis data received:", response.data.data);
      const agingData = response.data.data.map((item) => ({
        name: item.client || "Total Aging",
        current: Number(item.current) || 0,
        thirtyDays: Number(item.thirtyDays) || 0,
        sixtyDays: Number(item.sixtyDays) || 0,
        ninetyDays: Number(item.ninetyDays) || 0,
        month: item.month,
        year: item.year,
      }));
      console.log("Processed aging analysis data:", agingData);
      return agingData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error(
      "Error fetching aging analysis data:",
      err.response ? err.response.data : err.message
    );
    setError(`Failed to fetch aging analysis data: ${err.message}`);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverVsDieselCost = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    const monthNames = [
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
    ];
    const numericMonth = monthNames.indexOf(month) + 1;
    console.log(
      `Fetching turnover vs diesel cost for month: ${month} (numeric: ${numericMonth}), year: ${year}`
    );
    const response = await api.get("/api/turnover-vs-diesel-cost", {
      params: { month: numericMonth, year, _t: new Date().getTime() },
    });
    if (response.data.success) {
      const data = response.data.data.map((item) => {
        console.log(
          `Received percentages: turnoverPercentage=${item.turnoverPercentage
          } (${typeof item.turnoverPercentage}), dieselCostPercentage=${item.dieselCostPercentage
          } (${typeof item.dieselCostPercentage})`
        );
        return {
          month: item.month,
          year: item.year,
          totalTurnover: Number(item.totalTurnover) || 0,
          dieselCost: Number(item.dieselCost) || 0,
        };
      });
      console.log("Processed turnover vs diesel cost data:", data);
      return data;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching turnover vs diesel cost:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchIncomeVsExpenses = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching income (total turnover) vs expenses for month: ${month}, year: ${year}`
    );

    const turnoverResponse = await api.get("/api/turnover-per-month", {
      params: { month, year, _t: new Date().getTime() },
    });

    const expensesResponse = await api.get("/api/all-expenses", {
      params: { month, year, _t: new Date().getTime() },
    });

    if (!turnoverResponse.data.success) {
      throw new Error(
        turnoverResponse.data.message || "Failed to fetch turnover data"
      );
    }
    if (!expensesResponse.data.success) {
      throw new Error(
        expensesResponse.data.message || "Failed to fetch expenses data"
      );
    }

    const turnoverData = turnoverResponse.data.data.find(
      (item) => item.client === "Total Turnover"
    );
    const income = turnoverData
      ? Number.parseFloat(turnoverData.turnover) || 0
      : 0;

    const totalExpenses =
      Number.parseFloat(
        expensesResponse.data.data.expenses.reduce(
          (sum, item) => sum + Number.parseFloat(item.total_cost || 0),
          0
        )
      ) || 0;

    const data = [
      {
        name: "Income",
        value: income,
        type: "income",
        month: month,
        year: year,
      },
      {
        name: "Expenses",
        value: totalExpenses,
        type: "expenses",
        month: month,
        year: year,
      },
    ];

    console.log("Processed income vs expenses data:", data);
    return data;
  } catch (err) {
    console.error("Error fetching income vs expenses:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverPerTruck = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching turnover per truck for month: ${month}, year: ${year}`
    );
    const response = await api.get("/api/turnover-per-truck", {
      params: { month, year, _t: new Date().getTime() },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const turnoverData = response.data.data.map((item) => {
        const turnover = Number.parseFloat(item.total_turnover);
        const status = calculateTurnoverStatus(turnover);
        return {
          truckregnumber: item.truckregnumber,
          total_turnover: turnover,
          month: item.month_name.trim(),
          year: item.year,
          percentage: item.percentage,
          status,
        };
      });
      console.log("Processed turnover per truck data:", turnoverData);
      return turnoverData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching turnover per truck:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchWagesVsExpenses = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching wages vs expenses for month: ${month}, year: ${year}`
    );
    const response = await api.get("/api/wages-vs-expenses", {
      params: { month, year, _t: new Date().getTime() },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const data = response.data.data.map((item) => {
        console.log(
          `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
        );
        return {
          name: item.name,
          value: Number(item.value) || 0,
          type: item.type,
          month: item.month,
          year: item.year,
        };
      });
      console.log("Processed wages vs expenses data:", data);
      return data;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching wages vs expenses:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchSubcontractorTurnoverPerMonth = async (month, year, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching turnover vs total subcontractor for month: ${month}, year: ${year}`
    );
    const response = await api.get("/api/subcontractor-turnover-per-month", {
      params: { month, year, _t: new Date().getTime() },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const turnoverData = response.data.data.map((item) => {
        const value = Number.parseFloat(item.value);
        console.log(
          `Name ${item.name}: Value=${value}, Type=${item.type}, Percentage=${item.percentage}%`
        );
        return {
          name: item.name,
          value: value,
          type: item.type,
          month: item.month.trim(),
          year: item.year,
        };
      });
      console.log(
        "Processed turnover vs total subcontractor data:",
        turnoverData
      );
      return turnoverData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error(
      "Error fetching turnover vs total subcontractor data:",
      err
    );
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchSubcontractorVsTurnover = async (
  month,
  year,
  subcontractorId,
  setIsLoading,
  setError
) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching subcontractor vs turnover for month: ${month}, year: ${year}, subcontractorId: ${subcontractorId}`
    );
    const response = await api.get("/api/subcontractor-vs-turnover", {
      params: {
        month,
        year,
        subcontractorId: subcontractorId || undefined,
        _t: new Date().getTime(),
      },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const data = response.data.data.map((item) => {
        console.log(
          `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
        );
        return {
          name: item.name,
          value: Number(item.value) || 0,
          type: item.type,
          month: item.month,
          year: item.year,
        };
      });
      console.log("Processed subcontractor vs turnover data:", data);
      return data;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching subcontractor vs turnover:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverVsSubbieExpense = async (
  month,
  year,
  subcontractorId,
  setIsLoading,
  setError
) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching turnover vs subbie expense for month: ${month}, year: ${year}, subcontractorId: ${subcontractorId}`
    );
    const response = await api.get("/api/turnover-vs-subbie-expense", {
      params: {
        month,
        year,
        subcontractorId: subcontractorId || undefined,
        _t: new Date().getTime(),
      },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const data = response.data.data.map((item) => {
        console.log(
          `Received: name=${item.name}, value=${item.value}, type=${item.type}, percentage=${item.percentage}%`
        );
        return {
          name: item.name,
          value: Number(item.value) || 0,
          type: item.type,
          month: item.month,
          year: item.year,
        };
      });
      console.log("Processed turnover vs subbie expense data:", data);
      return data;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching turnover vs subbie expense:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchTurnoverVsFuelPerTruck = async (month, year, truckId, setIsLoading, setError) => {
  setIsLoading(true);
  setError(null);
  try {
    console.log(
      `Fetching turnover vs fuel per truck for month: ${month}, year: ${year}, truckId: ${truckId}`
    );
    const response = await api.get("/api/turnover-vs-fuel-per-truck", {
      params: {
        month,
        year,
        truckId: truckId || undefined,
        _t: new Date().getTime(),
      },
    });
    console.log("API response:", response.data);
    if (response.data.success) {
      const processedData = response.data.data.map((item) => ({
        truckId: item.truckregnumber || item.truckregnum || 'Totals',
        turnover: Number.parseFloat(item.total_turnover) || 0,
        fuelCost: Number.parseFloat(item.total_fuel_cost) || 0,
        month: item.month_name.trim(),
        year: item.year,
        turnoverPercentage: Number.parseFloat(item.turnoverPercentage) || 0,
        fuelCostPercentage: Number.parseFloat(item.fuelCostPercentage) || 0,
      }));
      console.log("Processed turnover vs fuel per truck data:", processedData);
      return processedData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching turnover vs fuel per truck:", err);
    setError(err.message);
    return [];
  } finally {
    setIsLoading(false);
  }
};

export const fetchPaymentClients = async (month, year, setPaymentClients, setError) => {
  try {
    const response = await api.get("/api/payment-clients", {
      params: { month, year },
    });
    if (response.data.success) {
      setPaymentClients(response.data.data);
    } else {
      setError("Failed to fetch payment clients");
    }
  } catch (err) {
    setError(`Failed to fetch payment clients: ${err.message}`);
  }
};

export const fetchPaymentsReceivedPerMonth = async (month, year, clientId, setIsLoading, setError) => {
  setIsLoading(true);
  try {
    const response = await api.get("/api/payments-received-per-month", {
      params: {
        month,
        year,
        clientId: clientId || undefined,
        _t: new Date().getTime(),
      },
    });

    if (response.data.success) {
      let paymentsData = response.data.data.map((item) => {
        const amount = Number(item.amount) || 0;

        return {
          name: item.name === "Total Payments"
            ? "Total Payments"
            : (item.client || item.name || "Unknown Client"),
          payments: amount,
          month: item.month?.trim() || month.trim(),
          year: item.year.toString(),
          percentage: Number(item.percentage) || 0,
        };
      });

      // CRITICAL: Always show "Total Payments" first, then the selected client
      paymentsData = paymentsData.sort((a, b) => {
        if (a.name === "Total Payments") return -1;
        if (b.name === "Total Payments") return 1;
        return 0; // keep relative order (total first, client second)
      });

      console.log("Final sorted payments data:", paymentsData);
      return paymentsData;
    } else {
      throw new Error(response.data.message || "Failed to fetch data");
    }
  } catch (err) {
    console.error("Error fetching payments received:", err);
    setError(err.message || "Failed to load payments data");
    return [];
  } finally {
    setIsLoading(false);
  }
};