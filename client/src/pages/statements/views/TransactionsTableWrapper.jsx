"use client";

// TransactionsTableWrapper.jsx
const TransactionsTableWrapper = ({ children, className }) => {
  return (
    <div className={`transactions-wrapper ${className || ""}`}>
      <style jsx>{`
        .transactions-wrapper {
          overflow-x: auto;
          max-width: 100%;
        }

        .transactions-wrapper table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .transactions-wrapper th,
        .transactions-wrapper td {
          padding: 8px 4px;
          border: 1px solid #ddd;
          text-align: left;
          vertical-align: top;
          height: auto;
          min-height: 30px;
          max-height: 50px;
          overflow: hidden;
          word-wrap: break-word;
        }

        .transactions-wrapper th {
          background-color: #f5f5f5;
          font-weight: bold;
          height: 35px;
        }

        .transactions-wrapper td {
          height: 35px;
          line-height: 1.2;
        }

        .transactions-wrapper tr {
          height: 35px;
        }

        @media print {
          .transactions-wrapper {
            overflow: visible;
            page-break-inside: auto;
          }

          .transactions-wrapper th,
          .transactions-wrapper td {
            padding: 6px 3px;
            font-size: 10px;
            height: 25px;
            min-height: 25px;
            max-height: 25px;
          }

          .transactions-wrapper tr {
            height: 25px;
          }
        }
      `}</style>
      {children}
    </div>
  );
};

export default TransactionsTableWrapper;
