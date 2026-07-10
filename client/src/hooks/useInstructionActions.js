import { useState, useCallback } from "react";
import {
  fetchInstruction as fetchInstructionService,
  updateInstruction as updateInstructionService,
  deleteInstruction as deleteInstructionService,
  generateInvoice as generateInvoiceService,
  checkInvoiceStatus as checkInvoiceStatusService,
} from "../services/instructionService.js";
import { resolveBaseCost } from "../utils/instructions/costCalculation.js";
import { buildUpdatePayload } from "../utils/instructions/payloadBuilders.js";

/**
 * Manages save / delete / invoice actions for the update instruction form.
 * Extracted from FCcontrollerinstructions to keep that file lean.
 */
export function useInstructionActions({
  formData,
  containers,
  weightRows,
  instructionId,
  isSetRateMode,
  historicalSetRate,
  isAddOn,
  allowVgmUI,
  isSetRate,
  setRateValue,
  containersRef,
  weightRowsRef,
  fetchFreshAmounts,
  validateAllFields,
  checkRateCounterMismatch,
  recalculateTotalCost,
  setIsContainerLoading,
  setContainerSuccessMessage,
  setIsContainerDataModified,
  setErrorModal,
  setConfirmationModal,
  navigate,
  clientId,
  clientName,
  selectedMonth,
  selectedYear,
  activeFilter,
}) {
  const [isInvoiced, setIsInvoiced] = useState(false);

  // ─── helpers ────────────────────────────────────────────────────────────────

  const fetchOriginalData = useCallback(async () => {
    try {
      return await fetchInstructionService(instructionId);
    } catch (error) {
      console.error("Error fetching original data:", error);
      return null;
    }
  }, [instructionId]);

  // ─── invoice status ──────────────────────────────────────────────────────────

  const checkIfInvoiced = useCallback(async () => {
    try {
      if (!instructionId) return;
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) return;
      const invoiceData = await checkInvoiceStatusService(instructionData.m1key);
      setIsInvoiced(invoiceData.exists);
    } catch {
      setIsInvoiced(false);
    }
  }, [instructionId, fetchOriginalData]);

  // ─── perform save ────────────────────────────────────────────────────────────

  const performSave = useCallback(async () => {
    try {
      setIsContainerLoading(true);
      setContainerSuccessMessage("");

      const baseCost = resolveBaseCost(formData, weightRows, {
        isSetRateMode,
        historicalSetRate,
        isAddOn,
      });

      const freshContainers = await fetchFreshAmounts(containers, formData);

      const totalSurchargeAmount = freshContainers.reduce((total, c) => {
        if (!c.addSurcharges) return total;
        return total + (c.is_12m_surcharge
          ? Number(c.surcharge_12m_amount || 0)
          : Number(c.surchargeAmount || 0));
      }, 0);

      const totalHazardousAmount = freshContainers.reduce(
        (total, c) =>
          c.hazardous && c.hazardousAmount
            ? total + Number(c.hazardousAmount || 0)
            : total,
        0
      );

      const totalVgmAmount = freshContainers.reduce(
        (total, c) =>
          c.vgm && c.vgmAmount ? total + Number(c.vgmAmount || 0) : total,
        0
      );

      const totalCost = isSetRateMode
        ? baseCost
        : Number(
            (baseCost + totalSurchargeAmount + totalHazardousAmount + totalVgmAmount).toFixed(2)
          );

      const currentContainers = containersRef.current || [];

      const { instructionUpdateData, containerData, weightData } =
        buildUpdatePayload(formData, weightRows, currentContainers, {
          isSetRateMode,
          isAddOn,
          allowVgmUI,
          isSetRate,
          setRateValue,
          totalCost,
        });

      await updateInstructionService(
        instructionId,
        instructionUpdateData,
        containerData,
        weightData
      );

      setContainerSuccessMessage("Changes saved successfully!");
      setIsContainerDataModified(false);
      recalculateTotalCost(formData, containersRef.current, weightRowsRef.current);

      setTimeout(() => {
        navigate("/instructions", {
          state: { clientId, clientName, selectedMonth, selectedYear, activeFilter },
        });
      }, 2000);
    } catch (error) {
      console.error("Error saving changes:", error);
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to save changes. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  }, [
    formData,
    containers,
    weightRows,
    instructionId,
    isSetRateMode,
    historicalSetRate,
    isAddOn,
    allowVgmUI,
    isSetRate,
    setRateValue,
    containersRef,
    weightRowsRef,
    fetchFreshAmounts,
    recalculateTotalCost,
    setIsContainerLoading,
    setContainerSuccessMessage,
    setIsContainerDataModified,
    setErrorModal,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  ]);

  // ─── handle save (with validation + mismatch check) ─────────────────────────

  const handleSaveChanges = useCallback(async () => {
    if (!validateAllFields()) {
      setErrorModal({
        isOpen: true,
        message: "Please fix all validation errors before saving.",
      });
      return;
    }

    const { needsConfirmation, message: mismatchMessage } =
      checkRateCounterMismatch();
    if (needsConfirmation) {
      setConfirmationModal({
        isOpen: true,
        message: mismatchMessage,
        action: "save",
      });
      return;
    }

    await performSave();
  }, [
    validateAllFields,
    checkRateCounterMismatch,
    performSave,
    setErrorModal,
    setConfirmationModal,
  ]);

  // ─── delete ──────────────────────────────────────────────────────────────────

  const handleDeleteInstruction = useCallback(() => {
    setConfirmationModal({
      isOpen: true,
      message:
        "Are you sure you want to delete this instruction? This action cannot be undone.",
      action: "delete",
    });
  }, [setConfirmationModal]);

  const performDelete = useCallback(async () => {
    try {
      setIsContainerLoading(true);
      await deleteInstructionService(instructionId);
      setContainerSuccessMessage("Instruction deleted successfully!");
      setTimeout(() => {
        navigate("/instructions", {
          state: { clientId, clientName, selectedMonth, selectedYear, activeFilter },
        });
      }, 2000);
    } catch (error) {
      console.error("Error deleting instruction:", error);
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to delete instruction. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  }, [
    instructionId,
    setIsContainerLoading,
    setContainerSuccessMessage,
    setErrorModal,
    navigate,
    clientId,
    clientName,
    selectedMonth,
    selectedYear,
    activeFilter,
  ]);

  // ─── invoice ─────────────────────────────────────────────────────────────────

  const handleCreateInvoice = useCallback(async () => {
    try {
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        setErrorModal({
          isOpen: true,
          message: "Could not create invoice: No instruction ID found.",
        });
        return;
      }
      setConfirmationModal({
        isOpen: true,
        message:
          "Are you sure you want to create an invoice before dispatching containers?",
        action: "invoice",
      });
    } catch (error) {
      console.error("Error preparing invoice creation:", error);
      setErrorModal({
        isOpen: true,
        message: "Error preparing invoice creation. Please try again.",
      });
    }
  }, [fetchOriginalData, setErrorModal, setConfirmationModal]);

  const performInvoiceCreation = useCallback(async () => {
    try {
      setIsContainerLoading(true);
      const instructionData = await fetchOriginalData();
      if (!instructionData || !instructionData.m1key) {
        throw new Error("No m1key found for instruction");
      }
      await generateInvoiceService(instructionData.m1key);
      setContainerSuccessMessage("Invoice created successfully!");
      setIsInvoiced(true);
    } catch (error) {
      console.error("Error creating invoice:", error);
      setErrorModal({
        isOpen: true,
        message:
          error.response?.data?.message ||
          "Failed to create invoice. Please try again.",
      });
    } finally {
      setIsContainerLoading(false);
    }
  }, [
    fetchOriginalData,
    setIsContainerLoading,
    setContainerSuccessMessage,
    setErrorModal,
  ]);

  return {
    isInvoiced,
    checkIfInvoiced,
    handleSaveChanges,
    handleDeleteInstruction,
    performSave,
    performDelete,
    handleCreateInvoice,
    performInvoiceCreation,
  };
}
