import mongoose from "mongoose";

// Single-use token registry — MongoDB TTL index auto-expires entries after 11 min
const UsedTokenSchema = new mongoose.Schema({
  token_hash: { type: String, required: true, unique: true },
  created_at: { type: Date, default: Date.now },
});

// TTL: 660s (11 min) — slightly longer than the 600s token expiry so consumed tokens
// remain blocked until they would have expired anyway
UsedTokenSchema.index({ created_at: 1 }, { expireAfterSeconds: 660 });

export default mongoose.model("UsedToken", UsedTokenSchema);
