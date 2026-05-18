import express from "express";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import {
  mongoIdValidator,
  handleValidationErrors,
  searchValidation,
} from "../../middlewares/inputValidator.js";
import {
  createInvoice,
  getInvoiceById,
  updateInvoice,
  deleteInvoice,
  listInvoicesByParams,
  recordPayment,
  getPatientPayments,
  getOutstandingInvoices,
} from "../../controllers/v1/invoice.controller.js";

const router = express.Router();

const invoiceIdParam = [mongoIdValidator("invoiceId", "param"), handleValidationErrors];
const patientIdParam = [mongoIdValidator("patientId", "param"), handleValidationErrors];

router.post(
  "/invoices",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  createInvoice,
);

router.get(
  "/invoices/outstanding",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  getOutstandingInvoices,
);

router.get(
  "/invoices/:invoiceId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  invoiceIdParam,
  getInvoiceById,
);

router.put(
  "/invoices/:invoiceId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  invoiceIdParam,
  updateInvoice,
);

router.delete(
  "/invoices/:invoiceId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  invoiceIdParam,
  deleteInvoice,
);

router.post(
  "/invoices/search",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  searchValidation,
  listInvoicesByParams,
);

router.post(
  "/payments",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  recordPayment,
);

router.get(
  "/payments/patient/:patientId",
  authMiddleware(["ADMIN", "EMPLOYEE"]),
  patientIdParam,
  getPatientPayments,
);

export default router;
