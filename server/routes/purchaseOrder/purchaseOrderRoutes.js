import express from "express"
import {
  getPurchaseOrdersHandler,
  getExpenseTypesHandler,
  getStatementsHandler,
  getSupplierSummaryHandler,
  getSuppliersByExpenseTypeHandler,
  calculatePurchaseOrderHandler,
  createPurchaseOrderHandler,
  createMultiplePurchaseOrdersHandler, // New handler
  getPurchaseOrderListHandler,
  getCompanyOwnedTrucksHandler,
  getPurchaseOrderByPonumHandler,
  deletePurchaseOrderByPonumHandler
} from "../../controllers/purchaseOrder/purchaseOrderController.js"
import { uploadPurchaseOrderSlipHandler,checkSlipStatusHandler,viewSlipHandler } from "../../controllers/purchaseOrder/purchaseOrderController.js"
import { uploadPurchaseOrder } from '../../utils/s3-config.js'

const router = express.Router()

router.get("/api/purchase-orders", getPurchaseOrdersHandler)
router.delete("/api/purchase-orders/:ponum", deletePurchaseOrderByPonumHandler)
router.get("/api/po-form/details/:ponum", getPurchaseOrderByPonumHandler)
router.get("/api/po/expense-types", getExpenseTypesHandler)
router.get("/api/statements", getStatementsHandler)
router.get("/api/supplier-summary", getSupplierSummaryHandler)
router.get("/api/po-form/suppliers/:expenseTypeId", getSuppliersByExpenseTypeHandler)
router.post("/api/po-form/calculate", calculatePurchaseOrderHandler)
router.post("/api/po-form/create", createPurchaseOrderHandler)
router.post("/api/po-form/create-multiple", createMultiplePurchaseOrdersHandler) 
router.get("/api/po-form/list", getPurchaseOrderListHandler)
router.get("/api/po-form/trucks", getCompanyOwnedTrucksHandler)
router.post(
  "/api/po-form/upload-slip",
  uploadPurchaseOrder.single("slip"),
  uploadPurchaseOrderSlipHandler
)
router.get("/api/po-form/slip-status/:ponum", checkSlipStatusHandler)
router.get("/api/po-form/view-slip/:ponum", viewSlipHandler)

export default router
