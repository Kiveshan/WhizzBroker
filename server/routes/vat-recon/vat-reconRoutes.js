import express from "express"
import { getVatReconHandler } from "../../controllers/vat-recon/vat-reconController.js"

const router = express.Router()

router.get("/api/vat-recon", getVatReconHandler)

export default router
