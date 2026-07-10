/**
 * useWeightRows — weight row CRUD for Cross-Haul Weight (shipmentTypeId === "4").
 *
 * Manages: weightRows array, pending row deletion, weightRowsRef for stale-closure
 * protection.
 *
 * @returns {{
 *   weightRows:                WeightRow[],
 *   setWeightRows:             React.Dispatch,
 *   weightRowsRef:             React.MutableRefObject<WeightRow[]>,
 *   weightRowToDelete:         WeightRow | null,
 *   addWeightRow:              () => void,
 *   updateWeightRow:           (id: number, field: string, value: any) => void,
 *   handleRequestDeleteWeightRow: (row: WeightRow) => void,
 *   confirmDeleteWeightRow:    () => void,
 *   cancelDeleteWeightRow:     () => void,
 * }}
 */

import { useState, useEffect, useCallback, useRef } from "react";

export function useWeightRows() {
  const [weightRows, setWeightRows] = useState([]);
  const [weightRowToDelete, setWeightRowToDelete] = useState(null);

  // Stable ref — always reflects current weightRows without closing over state
  const weightRowsRef = useRef([]);
  useEffect(() => {
    weightRowsRef.current = weightRows;
  }, [weightRows]);

  // Stable ref for pending deletion — lets confirm/cancel be zero-dep callbacks
  const weightRowToDeleteRef = useRef(null);
  useEffect(() => {
    weightRowToDeleteRef.current = weightRowToDelete;
  }, [weightRowToDelete]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addWeightRow = useCallback(() => {
    setWeightRows((prev) => [
      ...prev,
      {
        id: prev.length > 0 ? prev[prev.length - 1].id + 1 : 1,
        ksmDmNo: "",
        ticketNo: "",
        receiptBookNo: "",
        weight: "",
      },
    ]);
  }, []);

  const updateWeightRow = useCallback((id, field, value) => {
    setWeightRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  }, []);

  // ── Deletion flow ────────────────────────────────────────────────────────────

  const handleRequestDeleteWeightRow = useCallback((row) => {
    setWeightRowToDelete(row);
  }, []);

  const confirmDeleteWeightRow = useCallback(() => {
    const row = weightRowToDeleteRef.current;
    if (row) {
      setWeightRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    setWeightRowToDelete(null);
  }, []); // stable — reads deletion target from ref

  const cancelDeleteWeightRow = useCallback(() => {
    setWeightRowToDelete(null);
  }, []);

  return {
    weightRows,
    setWeightRows,
    weightRowsRef,
    weightRowToDelete,
    addWeightRow,
    updateWeightRow,
    handleRequestDeleteWeightRow,
    confirmDeleteWeightRow,
    cancelDeleteWeightRow,
  };
}
