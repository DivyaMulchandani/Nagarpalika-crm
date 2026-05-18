import Counter from "../models/Counter.js";

const formatDateKey = (d = new Date()) => {
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
};

export const generateInvoiceNumber = async (now = new Date()) => {
  const dateKey = formatDateKey(now);
  const counterKey = `INVOICE-${dateKey}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const seq = String(counter.seq).padStart(4, "0");
  return `INV-${dateKey}-${seq}`;
};

export const generateReceiptNumber = async (now = new Date()) => {
  const dateKey = formatDateKey(now);
  const counterKey = `RECEIPT-${dateKey}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const seq = String(counter.seq).padStart(4, "0");
  return `REC-${dateKey}-${seq}`;
};
