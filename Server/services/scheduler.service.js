import mongoose from "mongoose";
import Advertisement from "../models/Advertisement.js";

const RUN_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

/**
 * Close Published advertisements whose end_date has passed.
 * Status lifecycle stays consistent with the admin transition map
 * (Published → Closed); applications under a Closed advertisement keep
 * their own status untouched.
 */
export async function closeExpiredAdvertisements() {
  // end_date is inclusive: an ad ending 2026-06-06 stays open through
  // 23:59:59 that day, so only close ads whose end_date is before today.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const result = await Advertisement.updateMany(
    { status: "Published", end_date: { $lt: startOfToday } },
    { $set: { status: "Closed" } },
  );
  if (result.modifiedCount > 0)
    console.log(
      `[CRON] Closed ${result.modifiedCount} expired advertisement(s)`,
    );
  return result.modifiedCount;
}

async function runJobs() {
  if (mongoose.connection.readyState !== 1) return; // DB not connected yet
  try {
    await closeExpiredAdvertisements();
  } catch (err) {
    console.error("[CRON] closeExpiredAdvertisements failed:", err.message);
  }
}

let timer = null;

export function startScheduler() {
  if (timer) return;
  runJobs(); // run once at startup so statuses are correct immediately
  timer = setInterval(runJobs, RUN_INTERVAL_MS);
  timer.unref?.();
  console.log("✅ Scheduler started (advertisement status sync every 15 min)");
}
