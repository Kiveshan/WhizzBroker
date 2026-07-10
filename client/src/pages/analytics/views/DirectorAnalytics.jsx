"use client";

import { useState, useEffect, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import "../css/Analytics.css";
import { useNavigate } from "react-router-dom";
import {
  getChartWidth,
  CustomAxisTick,
  getBarFill,
  CustomBarLabelForTurnover,
  CustomBarLabelForDieselCost,
  CustomBarLabelForFuelAndTurnover,
  CustomBarLabelForDefault,
  CustomBarLabelForPayments,
  fetchClients,
  fetchSubcontractors,
  fetchTrucks,
  fetchFuelData,
  fetchTurnoverData,
  fetchAgingAnalysisData,
  fetchTurnoverVsDieselCost,
  fetchIncomeVsExpenses,
  fetchTurnoverPerTruck,
  fetchWagesVsExpenses,
  fetchSubcontractorTurnoverPerMonth,
  fetchSubcontractorVsTurnover,
  fetchTurnoverVsSubbieExpense,
  fetchTurnoverVsFuelPerTruck,
  fetchPaymentClients,
  fetchPaymentsReceivedPerMonth,
} from "../AnalyticsFunctions";

export default function DirectorAnalytics() {
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

  const currentDate = new Date();
  const [activeMonth, setActiveMonth] = useState(
    monthNames[currentDate.getMonth()]
  );
  const [activeYear, setActiveYear] = useState(
    currentDate.getFullYear().toString()
  );
  const [activeFilter, setActiveFilter] = useState("fuel");
  const [chartData, setChartData] = useState([]);
  const [clients, setClients] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [paymentClients, setPaymentClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedSubcontractor, setSelectedSubcontractor] = useState("");
  const [selectedTruck, setSelectedTruck] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const roleId = JSON.parse(localStorage.getItem("user"))?.roleid;
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    fetchClients(setClients, setError);
    fetchSubcontractors(setSubcontractors, setError);
    fetchTrucks(setTrucks, setError);
  }, []);

  useEffect(() => {
    if (activeFilter === "paymentsReceivedPerMonth") {
      fetchPaymentClients(activeMonth, activeYear, setPaymentClients, setError);
    }
  }, [activeMonth, activeYear, activeFilter]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setChartData([]);
      setError(null);
      setIsLoading(true);

      let data = [];
      try {
        switch (activeFilter) {
          case "fuel":
            data = await fetchFuelData(activeMonth, activeYear, setIsLoading, setError);
            break;
          case "turnoverPerMonth":
            data = await fetchTurnoverData(
              activeMonth,
              activeYear,
              selectedClient,
              setIsLoading,
              setError,
              clients
            );
            break;
          case "agingAnalysis":
            data = await fetchAgingAnalysisData(
              activeMonth,
              activeYear,
              selectedClient,
              setIsLoading,
              setError
            );
            break;
          case "turnoverVsDieselCost":
            data = await fetchTurnoverVsDieselCost(activeMonth, activeYear, setIsLoading, setError);
            break;
          case "subcontractorTurnoverPerMonth":
            data = await fetchSubcontractorTurnoverPerMonth(
              activeMonth,
              activeYear,
              setIsLoading,
              setError
            );
            break;
          case "subcontractorVsTurnover":
            data = await fetchSubcontractorVsTurnover(
              activeMonth,
              activeYear,
              selectedSubcontractor,
              setIsLoading,
              setError
            );
            break;
          case "turnoverPerTruck":
            data = await fetchTurnoverPerTruck(activeMonth, activeYear, setIsLoading, setError);
            break;
          case "incomeVsExpense":
            data = await fetchIncomeVsExpenses(activeMonth, activeYear, setIsLoading, setError);
            break;
          case "wagesVsExpenses":
            data = await fetchWagesVsExpenses(activeMonth, activeYear, setIsLoading, setError);
            break;
          case "turnoverVsSubbieExpense":
            data = await fetchTurnoverVsSubbieExpense(
              activeMonth,
              activeYear,
              selectedSubcontractor,
              setIsLoading,
              setError
            );
            break;
          case "turnoverVsFuelPerTruck":
            data = await fetchTurnoverVsFuelPerTruck(
              activeMonth,
              activeYear,
              selectedTruck,
              setIsLoading,
              setError
            );
            break;
          case "paymentsReceivedPerMonth":
            data = await fetchPaymentsReceivedPerMonth(activeMonth, activeYear, selectedClient, setIsLoading, setError);
            break;
          default:
            data = [];
        }
        if (isMounted) {
          console.log("Setting chartData:", data);
          setChartData(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(`Failed to load data: ${err.message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [
    activeFilter,
    activeMonth,
    activeYear,
    selectedClient,
    selectedSubcontractor,
    selectedTruck,
    clients,
  ]);

  // Disable vertical scrolling while this page is mounted
  useEffect(() => {
    try {
      document.body.classList.add("no-vertical-scroll");
      document.documentElement.classList.add("no-vertical-scroll");
    } catch (e) {
      // ignore if not in browser context
    }
    return () => {
      try {
        document.body.classList.remove("no-vertical-scroll");
        document.documentElement.classList.remove("no-vertical-scroll");
      } catch (e) {
        // ignore if not in browser context
      }
    };
  }, []);

  useEffect(() => {
    const computeWrapperHeight = () => {
      if (!wrapperRef.current) return;
      const top = wrapperRef.current.getBoundingClientRect().top;
      // Try to find your global footer element. Adjust this query if your footer has a known selector.
      const footerEl =
        document.querySelector("footer") ||
        document.querySelector('[role="contentinfo"]');
      const footerHeight = footerEl
        ? footerEl.getBoundingClientRect().height
        : 0;

      const available = Math.max(0, window.innerHeight - top - footerHeight);
      wrapperRef.current.style.height = `${available}px`;
    };

    computeWrapperHeight();
    window.addEventListener("resize", computeWrapperHeight);
    return () => window.removeEventListener("resize", computeWrapperHeight);
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="tooltip-value"
              style={{ color: entry.color }}
            >
              {`${entry.name}: R${entry.value.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  
  const renderChart = () => {
    console.log("Rendering chart with chartData:", chartData);
    const chartWidth = getChartWidth(chartData.length, activeFilter);

    switch (activeFilter) {
      case "fuel":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading fuel data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No fuel data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis
                        dataKey="truckId"
                        angle={0}
                        textAnchor="middle"
                        height={150}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: "Expense Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Fuel Expense"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.9}
                        isAnimationActive={true}
                        animationDuration={500}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={(props) => CustomBarLabelForFuelAndTurnover({ ...props, chartData })}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span
                      className="legend-color green"
                    ></span>
                    <span>Good: R0-R3,500</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color yellow"
                    ></span>
                    <span>Warning: R3,501-R4,500</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color red"
                    ></span>
                    <span>High: R4,501+</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "turnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">Loading turnover data...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.length > 1 && (
                    <div className="chart-header-item">
                      <span
                        className="legend-color royal-blue"
                      ></span>
                      <span>Selected Client</span>
                    </div>
                  )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Turnover (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="turnover"
                        name="Turnover"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Total Turnover"
                                ? "#2196F3"
                                : "#4169E1"
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="turnover"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "agingAnalysis":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading aging analysis data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No aging analysis data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color royal-blue"
                    ></span>
                    <span>Current</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color green"
                    ></span>
                    <span>30 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color yellow"
                    ></span>
                    <span>60 Days</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color red"
                    ></span>
                    <span>90 Days</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 40, right: 30, left: 60, bottom: 100 }}
                    >
                      <XAxis
                        dataKey="name"
                        angle={0}
                        textAnchor="middle"
                        height={120}
                        interval={0}
                        tick={<CustomAxisTick />}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="current"
                        name="Current"
                        fill="#4169E1"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="current"
                          content={CustomBarLabelForDefault}
                          position="top"
                        />
                      </Bar>
                      <Bar
                        dataKey="thirtyDays"
                        name="30 Days"
                        fill="#4CAF50"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="thirtyDays"
                          content={CustomBarLabelForDefault}
                          position="top"
                        />
                      </Bar>
                      <Bar
                        dataKey="sixtyDays"
                        name="60 Days"
                        fill="#FFC107"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="sixtyDays"
                          content={CustomBarLabelForDefault}
                          position="top"
                        />
                      </Bar>
                      <Bar
                        dataKey="ninetyDays"
                        name="90 Days"
                        fill="#F44336"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="ninetyDays"
                          content={CustomBarLabelForDefault}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "subcontractorTurnoverPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading Turnover VS Total Subbie data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs total subcontractor data available for{" "}
                {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Total Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color tomato"
                    ></span>
                    <span>Total Subcontractor Turnover</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "subcontractorVsTurnover":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading Subbie VS Turnover data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.some(
                    (entry) => entry.type === "subcontractor"
                  ) && (
                      <div className="chart-header-item">
                        <span
                          className="legend-color tomato"
                        ></span>
                        <span>Selected Subcontractor</span>
                      </div>
                    )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "turnoverVsSubbieExpense":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading Turnover VS Subbie Expense data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs subbie expense data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Total Turnover</span>
                  </div>
                  {chartData.some(
                    (entry) => entry.type === "subcontractor"
                  ) && (
                      <div className="chart-header-item">
                        <span
                          className="legend-color tomato"
                        ></span>
                        <span>Selected Subcontractor</span>
                      </div>
                    )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "turnoverVsDieselCost":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading turnover vs diesel cost data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs diesel cost data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color tomato"
                    ></span>
                    <span>Diesel Cost</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="month" />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="totalTurnover"
                        name="Turnover"
                        fill="#2196F3"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="totalTurnover"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                      <Bar
                        dataKey="dieselCost"
                        name="Diesel Cost"
                        fill="#FF6347"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="dieselCost"
                          content={CustomBarLabelForDieselCost}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "turnoverPerTruck":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading turnover per truck data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover per truck data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis
                        dataKey="truckregnumber"
                        angle={0}
                        textAnchor="middle"
                        height={150}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: "Turnover (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="total_turnover"
                        name="Turnover"
                        radius={[4, 4, 0, 0]}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.status === "high"
                                ? "#4CAF50"
                                : entry.status === "medium"
                                  ? "#FFC107"
                                  : "#F44336"
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="total_turnover"
                          content={(props) => CustomBarLabelForFuelAndTurnover({ ...props, chartData })}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <span
                      className="legend-color green"
                    ></span>
                    <span>High: R10,000+</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color yellow"
                    ></span>
                    <span>Medium: R5,000-R9,999</span>
                  </div>
                  <div className="legend-item">
                    <span
                      className="legend-color red"
                    ></span>
                    <span>Low: R0-R4,999</span>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case "incomeVsExpense":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading income vs expenses data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No income vs expenses data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color royal-blue"
                    ></span>
                    <span>Income</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color tomato"
                    ></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis dataKey="name" tick={{ fill: "#000" }} />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "wagesVsExpenses":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading wages vs expenses data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No wages vs expenses data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color royal-blue"
                    ></span>
                    <span>Wages</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color tomato"
                    ></span>
                    <span>Expenses</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={<CustomAxisTick />}
                        height={150}
                        tickMargin={10}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        name="Amount"
                        radius={[4, 4, 0, 0]}
                        fillOpacity={0.9}
                        isAnimationActive={true}
                        animationDuration={500}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                                                        fill={getBarFill(entry, activeFilter)}
                          />
                        ))}
                        <LabelList
                          dataKey="value"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "turnoverVsFuelPerTruck":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading turnover vs fuel per truck data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No turnover vs fuel per truck data available for {activeMonth}{" "}
                {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color blue"
                    ></span>
                    <span>Turnover</span>
                  </div>
                  <div className="chart-header-item">
                    <span
                      className="legend-color tomato"
                    ></span>
                    <span>Diesel Cost</span>
                  </div>
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height={500}>
                    <BarChart
                      data={
                        selectedTruck
                          ? chartData
                          : [
                            {
                              truckId: "Totals",
                              turnover: chartData.reduce(
                                (sum, item) => sum + (item.turnover || 0),
                                0
                              ),
                              fuelCost: chartData.reduce(
                                (sum, item) => sum + (item.fuelCost || 0),
                                0
                              ),
                              turnoverPercentage: 100,
                              fuelCostPercentage: 100,
                              month: chartData[0]?.month,
                              year: chartData[0]?.year,
                            },
                          ]
                      }
                      margin={{ top: 40, right: 30, left: 60, bottom: 120 }}
                    >
                      <XAxis
                        dataKey="truckId"
                        angle={0}
                        textAnchor="middle"
                        height={150}
                        interval={0}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="turnover"
                        name="Turnover"
                        fill="#2196F3"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="turnover"
                          content={CustomBarLabelForTurnover}
                          position="top"
                        />
                      </Bar>
                      <Bar
                        dataKey="fuelCost"
                        name="Diesel Cost"
                        fill="#FF6347"
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey="fuelCost"
                          content={CustomBarLabelForDieselCost}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      case "paymentsReceivedPerMonth":
        return (
          <div className="chart-wrapper">
            {isLoading ? (
              <div className="loading-indicator">
                Loading payments received data...
              </div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : !Array.isArray(chartData) || chartData.length === 0 ? (
              <div className="no-data-message">
                No payments received data available for {activeMonth} {activeYear}
              </div>
            ) : (
              <>
                <div className="chart-header">
                  <div className="chart-header-item">
                    <span
                      className="legend-color royal-blue"
                    ></span>
                    <span>Total Payments</span>
                  </div>
                  {selectedClient && (
                    <div className="chart-header-item">
                      <span
                        className="legend-color blue"
                      ></span>
                      <span>Selected Client</span>
                    </div>
                  )}
                </div>
                <div className="chart-scroll-container">
                  <ResponsiveContainer width={chartWidth} height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 24, right: 24, left: 48, bottom: 16 }}
                    >
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tick={<CustomAxisTick />}
                        height={150}
                        tickMargin={10}
                      />
                      <YAxis
                        label={{
                          value: "Amount (R)",
                          angle: 0,
                          position: "top",
                          dy: -20,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="payments" name="Payments" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.name === "Total Payments" ? "#4169E1" : "#2196F3"
                            }
                          />
                        ))}
                        <LabelList
                          dataKey="payments"
                          content={CustomBarLabelForPayments}
                          position="top"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleBack = () => {
    if (roleId === 1) {
      navigate("/analytics-reports");
    } else if (roleId === 4) {
      navigate("/analytics-reports");
    }
  };

  return (
    <div className="analytics-page-wrapper" ref={wrapperRef}>
      <div className="analytics-container">
        <div className="header-actions">
          <button onClick={handleBack} className="back-button">
            Back
          </button>
        </div>

        <div className="date-filters">
          <select
            value={activeMonth}
            onChange={(e) => setActiveMonth(e.target.value)}
          >
            {monthNames.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <select
            className="year-select"
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
          >
            {Array.from(
              { length: currentDate.getFullYear() - 2024 + 1 },
              (_, idx) => (2024 + idx).toString()
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          {(activeFilter === "turnoverPerMonth" ||
            activeFilter === "agingAnalysis" ||
            activeFilter === "paymentsReceivedPerMonth"  // Added
          ) && (
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="client-select"
              >
                <option value="">Select Client</option>
                {(activeFilter === "paymentsReceivedPerMonth" ? paymentClients : clients).map((client) => (
                  <option key={client.m5clientkey} value={client.m5clientkey}>
                    {client.client}
                  </option>
                ))}
              </select>
            )}
          {(activeFilter === "subcontractorVsTurnover" ||
            activeFilter === "turnoverVsSubbieExpense") && (
              <select
                value={selectedSubcontractor}
                onChange={(e) => setSelectedSubcontractor(e.target.value)}
                className="subcontractor-select"
              >
                <option value="">Select Subcontractor</option>
                {subcontractors.map((subcontractor) => (
                  <option
                    key={subcontractor.subei_reg_num || subcontractor.userid}
                    value={subcontractor.subei_reg_num || subcontractor.userid}
                  >
                    {subcontractor.companyname}
                  </option>
                ))}
              </select>
            )}
          {activeFilter === "turnoverVsFuelPerTruck" && (
            <select
              value={selectedTruck}
              onChange={(e) => setSelectedTruck(e.target.value)}
              className="truck-select"
            >
              <option value="">Totals</option>
              {trucks.map((truck) => (
                <option key={truck.m5truckskey} value={truck.m5truckskey}>
                  {truck.truckregnumber || `Truck ID ${truck.m5truckskey}`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="analytics-content">
          <div className="sidebar-filters">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="filter-select"
            >
              <option value="fuel">Fuel Per Truck</option>
              <option value="turnoverPerMonth">
                Turnover per month vs Client
              </option>
              <option value="agingAnalysis">30, 60, 90, Current</option>
              <option value="subcontractorVsTurnover">
                Subbie VS Turnover
              </option>
              <option value="subcontractorTurnoverPerMonth">
                Turnover VS Total Subbie
              </option>
              <option value="wagesVsExpenses">
                Wages per month VS Expenses
              </option>
              <option value="turnoverVsDieselCost">
                Turnover vs Diesel Cost
              </option>
              <option value="turnoverPerTruck">
                Turnover Per Truck
              </option>
              <option value="incomeVsExpense">
                Income vs Expense Per Month
              </option>
              <option value="turnoverVsSubbieExpense">
                Turnover VS Subbie Expense
              </option>
              <option value="turnoverVsFuelPerTruck">
                Turnover Per Truck VS Diesel
              </option>
              <option value="paymentsReceivedPerMonth">
                Payments Received per Month
              </option>
            </select>
          </div>

          <div className="chart-area">
            <h2 className="chart-title">
              {activeFilter === "fuel" && "Fuel Per Truck"}
              {activeFilter === "turnoverPerMonth" &&
                "Turnover per month vs Client"}
              {activeFilter === "agingAnalysis" && "30, 60, 90, Current"}
              {activeFilter === "subcontractorTurnoverPerMonth" &&
                "Turnover VS Total Subbie"}
              {activeFilter === "subcontractorVsTurnover" &&
                "Subbie VS Turnover"}
              {activeFilter === "wagesVsExpenses" &&
                "Wages per month VS Expenses"}
              {activeFilter === "turnoverVsDieselCost" &&
                "Turnover vs Diesel Cost"}
              {activeFilter === "turnoverPerTruck" && "Turnover Per Truck"}
              {activeFilter === "incomeVsExpense" &&
                "Income vs Expense Per Month"}
              {activeFilter === "turnoverVsSubbieExpense" &&
                "Turnover VS Subbie Expense"}
              {activeFilter === "turnoverVsFuelPerTruck" &&
                "Turnover Per Truck VS Diesel"}
              {activeFilter === "paymentsReceivedPerMonth" &&
                "Payments Received per Month"}
            </h2>
            {renderChart()}
          </div>
        </div>
      </div>
    </div>
  );
}