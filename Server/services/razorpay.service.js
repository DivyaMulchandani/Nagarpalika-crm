// Requires: bun add razorpay
import Razorpay from "razorpay";
import crypto from "crypto";

const getInstance = () =>
  new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

/**
 * Create a Razorpay order.
 * @param {string} applicationRefNo  Used as receipt (truncated to 40 chars)
 * @param {number} amountInPaise
 * @param {string} currency
 */
export const createOrder = async (
  applicationRefNo,
  amountInPaise,
  currency = "INR",
) => {
  const order = await getInstance().orders.create({
    amount: amountInPaise,
    currency,
    receipt: applicationRefNo.slice(-40),
    notes: { application_ref_no: applicationRefNo },
  });
  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID,
  };
};

/**
 * Verify Razorpay webhook signature (HMAC-SHA256).
 * rawBody must be the raw Buffer captured in req.rawBody.
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!signature || !rawBody) return false;
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expBuf = Buffer.from(expected, "hex");
    return (
      sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)
    );
  } catch {
    return false;
  }
};

/**
 * Fetch a single payment record from Razorpay.
 */
export const getPaymentStatus = async (gatewayTxnId) =>
  getInstance().payments.fetch(gatewayTxnId);
