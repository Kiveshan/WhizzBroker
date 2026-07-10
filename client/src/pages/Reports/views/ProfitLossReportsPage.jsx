"use client"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const ProfitLossReportsPage = () => {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const currentYear = new Date().getFullYear().toString()
    const [selectedYear, setSelectedYear] = useState(currentYear)

    const handleMonthClick = (month, year) => {
        navigate(`/income-expenditure-reports/${month}/${year}`)
    }

    // Generate months
    const months = [
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
    ]

    // Generate years from 2023 onwards
    const startYear = 2023

    const handleBack = () => {
        navigate("/reports");
    };

    const getYearOptions = () => {
        const currentYear = new Date().getFullYear()
        const years = []
        for (let i = currentYear - 2; i <= currentYear; i++) {
            years.push(i.toString())
        }

        return years
    }

    // Split months into two columns
    const firstHalfMonths = months.slice(0, 6)
    const secondHalfMonths = months.slice(6)

    return (
        <div className="wage-reports-wrapper">
            <div className="dashboard">
                <div className="header-actions">
                    <button onClick={handleBack} className="back-button">
                        Back
                    </button>
                </div>
                <div className="dropdown-container74">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="dropdown"
                    >
                        {getYearOptions().map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="dashboard-row">
                    <div className="button-column">
                        {firstHalfMonths.map((month, index) => (
                            <button
                                key={index}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                    <div className="button-column">
                        {secondHalfMonths.map((month, index) => (
                            <button
                                key={index + 6}
                                className="filter-button"
                                onClick={() => handleMonthClick(month, selectedYear)}
                                disabled={loading}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && <div className="loading-text">Loading report...</div>}
            </div>
        </div>
    )
}

export default ProfitLossReportsPage