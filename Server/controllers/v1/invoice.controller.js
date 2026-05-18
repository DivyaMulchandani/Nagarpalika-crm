import mongoose from "mongoose";
import Invoice from "../../models/Invoice.js";
import Payment from "../../models/Payment.js";
import { generateInvoiceNumber, generateReceiptNumber } from "../../utils/invoiceIdGenerator.js";

export const createInvoice = async (req, res) => {
  try {
    const { patientId, appointmentId, treatmentPlanId, lineItems, discountType, discountValue, dueDate, notes } = req.body;

    if (!patientId) {
      return res.status(400).json({ message: "patientId is required", isOk: false, status: 400 });
    }
    if (!lineItems || lineItems.length === 0) {
      return res.status(400).json({ message: "At least one line item is required", isOk: false, status: 400 });
    }

    const invoiceNumber = await generateInvoiceNumber();

    const subtotal = lineItems.reduce((sum, item) => sum + ((Number(item.unitCost) || 0) * (Number(item.quantity) || 1)), 0);
    let discAmount = 0;
    if (discountType === "percentage") discAmount = subtotal * ((Number(discountValue) || 0) / 100);
    else if (discountType === "fixed") discAmount = Number(discountValue) || 0;

    const taxAmount = lineItems.reduce((sum, item) => {
      if (item.taxable && item.taxRate) {
        const itemTotal = (Number(item.unitCost) || 0) * (Number(item.quantity) || 1);
        return sum + (itemTotal * (Number(item.taxRate) / 100));
      }
      return sum;
    }, 0);

    const grandTotal = Math.max(0, subtotal - discAmount + taxAmount);

    const invoice = new Invoice({
      invoiceNumber,
      patientId,
      appointmentId: appointmentId || undefined,
      treatmentPlanId: treatmentPlanId || undefined,
      lineItems: lineItems.map((item) => ({
        ...item,
        total: (Number(item.unitCost) || 0) * (Number(item.quantity) || 1),
      })),
      subtotal,
      discountType: discountType || "",
      discountValue: Number(discountValue) || 0,
      discountAmount: discAmount,
      taxAmount,
      grandTotal,
      balanceAmount: grandTotal,
      status: "issued",
      dueDate,
      notes,
      createdBy: req.user?.id,
    });

    await invoice.save();

    return res.status(201).json({
      message: "Invoice created successfully",
      isOk: true,
      status: 201,
      data: { _id: invoice._id, invoiceNumber },
    });
  } catch (error) {
    console.error("Error in createInvoice:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId)
      .populate("patientId", "patientId firstName lastName mobileNumber")
      .populate("appointmentId", "appointmentDate startTime doctorId")
      .populate("treatmentPlanId", "planName");

    if (!invoice) {
      return res.status(400).json({ message: "Invoice not found", isOk: false, status: 400 });
    }

    const payments = await Payment.find({ invoiceId: invoice._id })
      .populate("paymentMethodId", "label")
      .populate("recordedBy", "firstName lastName")
      .sort({ paymentDate: -1 });

    return res.status(200).json({
      message: "Invoice found",
      data: { ...invoice.toObject(), payments },
      isOk: true,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getInvoiceById:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(400).json({ message: "Invoice not found", isOk: false, status: 400 });
    }

    if (invoice.status === "paid") {
      return res.status(400).json({ message: "Cannot edit a fully paid invoice", isOk: false, status: 400 });
    }

    const { lineItems, discountType, discountValue, dueDate, notes, status } = req.body;

    if (lineItems) {
      invoice.lineItems = lineItems.map((item) => ({
        ...item,
        total: (Number(item.unitCost) || 0) * (Number(item.quantity) || 1),
      }));
      invoice.subtotal = lineItems.reduce((sum, item) => sum + ((Number(item.unitCost) || 0) * (Number(item.quantity) || 1)), 0);
    }

    if (discountType !== undefined) invoice.discountType = discountType;
    if (discountValue !== undefined) invoice.discountValue = Number(discountValue) || 0;

    let discAmount = 0;
    if (invoice.discountType === "percentage") discAmount = invoice.subtotal * (invoice.discountValue / 100);
    else if (invoice.discountType === "fixed") discAmount = invoice.discountValue;
    invoice.discountAmount = discAmount;

    const taxAmount = (invoice.lineItems || []).reduce((sum, item) => {
      if (item.taxable && item.taxRate) {
        const itemTotal = (Number(item.unitCost) || 0) * (Number(item.quantity) || 1);
        return sum + (itemTotal * (Number(item.taxRate) / 100));
      }
      return sum;
    }, 0);
    invoice.taxAmount = taxAmount;
    invoice.grandTotal = Math.max(0, invoice.subtotal - discAmount + taxAmount);
    invoice.balanceAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);

    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (notes !== undefined) invoice.notes = notes;
    if (status !== undefined) invoice.status = status;
    invoice.updatedBy = req.user?.id;

    await invoice.save();

    return res.status(200).json({ message: "Invoice updated successfully", isOk: true, status: 200 });
  } catch (error) {
    console.error("Error in updateInvoice:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(400).json({ message: "Invoice not found", isOk: false, status: 400 });
    }

    if (invoice.paidAmount > 0) {
      return res.status(400).json({ message: "Cannot delete invoice with payments", isOk: false, status: 400 });
    }

    await Invoice.findByIdAndDelete(invoiceId);

    return res.status(200).json({ message: "Invoice deleted successfully", isOk: true, status: 200 });
  } catch (error) {
    console.error("Error in deleteInvoice:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const listInvoicesByParams = async (req, res) => {
  try {
    let { skip, per_page, sorton, sortdir, match, isActive, patientId, status } = req.body;

    let matchCondition = {};
    if (isActive !== undefined && isActive !== null && isActive !== "") matchCondition.isActive = isActive;
    if (patientId) matchCondition.patientId = new mongoose.Types.ObjectId(patientId);
    if (status) matchCondition.status = status;

    let query = [
      { $match: matchCondition },
      { $lookup: { from: "patients", localField: "patientId", foreignField: "_id", as: "patient" } },
      { $unwind: { path: "$patient", preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          stage1: [{ $group: { _id: null, count: { $sum: 1 } } }],
          stage2: [{ $skip: skip }, { $limit: per_page }],
        },
      },
      { $unwind: "$stage1" },
      { $project: { count: "$stage1.count", data: "$stage2" } },
    ];

    if (match) {
      query.splice(2, 0, {
        $match: {
          $or: [
            { invoiceNumber: { $regex: match, $options: "i" } },
            { "patient.firstName": { $regex: match, $options: "i" } },
            { "patient.lastName": { $regex: match, $options: "i" } },
            { "patient.patientId": { $regex: match, $options: "i" } },
            { "patient.mobileNumber": { $regex: match, $options: "i" } },
          ],
        },
      });
    }

    if (sorton && sortdir) {
      let sort = {};
      sort[sorton] = sortdir === "desc" ? -1 : 1;
      query = [{ $sort: sort }].concat(query);
    } else {
      query = [{ $sort: { createdAt: -1 } }].concat(query);
    }

    const list = await Invoice.aggregate(query);

    return res.status(200).json({ isOk: true, data: list, status: 200 });
  } catch (error) {
    console.error("Error in listInvoicesByParams:", error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

// ============ PAYMENT ENDPOINTS ============

export const recordPayment = async (req, res) => {
  try {
    const { invoiceId, amount, paymentMethodId, paymentDate, notes } = req.body;

    if (!invoiceId || !amount) {
      return res.status(400).json({ message: "invoiceId and amount are required", isOk: false, status: 400 });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(400).json({ message: "Invoice not found", isOk: false, status: 400 });
    }

    if (Number(amount) > invoice.balanceAmount) {
      return res.status(400).json({ message: "Payment amount exceeds balance", isOk: false, status: 400 });
    }

    const receiptNumber = await generateReceiptNumber();

    const payment = new Payment({
      receiptNumber,
      invoiceId,
      patientId: invoice.patientId,
      amount: Number(amount),
      paymentMethodId: paymentMethodId || undefined,
      paymentDate: paymentDate || new Date(),
      notes,
      recordedBy: req.user?.id,
      createdBy: req.user?.id,
    });

    await payment.save();

    invoice.paidAmount += Number(amount);
    invoice.balanceAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
    if (invoice.balanceAmount === 0) {
      invoice.status = "paid";
    } else {
      invoice.status = "partially_paid";
    }
    invoice.updatedBy = req.user?.id;
    await invoice.save();

    return res.status(201).json({
      message: "Payment recorded successfully",
      isOk: true,
      status: 201,
      data: { _id: payment._id, receiptNumber, balanceAmount: invoice.balanceAmount },
    });
  } catch (error) {
    console.error("Error in recordPayment:", error);
    return res.status(500).json({ message: "Internal server error", isOk: false, status: 500 });
  }
};

export const getPatientPayments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const payments = await Payment.find({ patientId })
      .populate("invoiceId", "invoiceNumber grandTotal")
      .populate("paymentMethodId", "label")
      .sort({ paymentDate: -1 });

    return res.status(200).json({ isOk: true, data: payments, status: 200 });
  } catch (error) {
    console.error("Error in getPatientPayments:", error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};

export const getOutstandingInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({
      status: { $in: ["issued", "partially_paid", "overdue"] },
      balanceAmount: { $gt: 0 },
    })
      .populate("patientId", "patientId firstName lastName mobileNumber")
      .sort({ createdAt: -1 });

    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceAmount, 0);

    return res.status(200).json({
      isOk: true,
      data: { invoices, totalOutstanding, count: invoices.length },
      status: 200,
    });
  } catch (error) {
    console.error("Error in getOutstandingInvoices:", error);
    return res.status(500).json({ isOk: false, message: error.message, status: 500 });
  }
};
