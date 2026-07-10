import React from "react";
import PropTypes from "prop-types";
import "../pages/payments/css/ClientPayments.css"; // Import the updated ClientPayments.css

const Pagination = ({
  totalRecords,
  recordsPerPage,
  currentPage,
  onPageChange,
}) => {
  // Calculate total pages
  const totalPages = Math.ceil(totalRecords / recordsPerPage);

  // Calculate start and end indices for display
  const startIndex = (currentPage - 1) * recordsPerPage + 1;
  const endIndex = Math.min(currentPage * recordsPerPage, totalRecords);

  // Handle page navigation
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pageNumbers.push(i);
        }
      } else {
        pageNumbers.push(1);
        pageNumbers.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(i);
        }
        pageNumbers.push("...");
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  // Don't render pagination if there's only one page
  if (totalPages <= 1) return null;

  return (
    <div className="client-payment-dashboard-wrapper">
      <div className="pagination-container">
        <div className="pagination-info">
          Showing {startIndex} to {endIndex} of {totalRecords} entries
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn prev-btn"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>

          <div className="pagination-numbers">
            {getPageNumbers().map((pageNum, index) => (
              <span key={index}>
                {pageNum === "..." ? (
                  <span className="pagination-ellipsis">...</span>
                ) : (
                  <button
                    className={`pagination-number ${
                      currentPage === pageNum ? "active" : ""
                    }`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                )}
              </span>
            ))}
          </div>

          <button
            className="pagination-btn next-btn"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
        <div className="pagination-summary">
          Page {currentPage} of {totalPages}
        </div>
      </div>
    </div>
  );
};

// Define prop types for validation
Pagination.propTypes = {
  totalRecords: PropTypes.number.isRequired,
  recordsPerPage: PropTypes.number,
  currentPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

// Default props
Pagination.defaultProps = {
  recordsPerPage: 10,
};

export default Pagination;
