import { post } from "./index";

/**
 * Full-screen "don't close this" overlay shown during the hand-off to the bank.
 * Plain DOM rather than React state: the page is navigating away, so this has
 * to survive outside the component tree and needs no unmount path.
 */
function showLeavingNotice() {
  if (document.getElementById("easypay-leaving")) return;

  const overlay = document.createElement("div");
  overlay.id = "easypay-leaving";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.style.cssText = [
    "position:fixed", "inset:0", "z-index:99999",
    "background:rgba(255,255,255,.97)",
    "display:flex", "flex-direction:column",
    "align-items:center", "justify-content:center",
    "gap:14px", "padding:24px", "text-align:center",
    "font-family:inherit",
  ].join(";");

  const heading = document.createElement("p");
  heading.textContent = "Redirecting you to the bank's secure payment page…";
  heading.style.cssText = "margin:0;font-size:17px;font-weight:700;color:#1a2a4a";

  const warn = document.createElement("p");
  warn.textContent =
    "Please do NOT close this window, press Back, or refresh the page. You will be brought back automatically once the payment is complete.";
  warn.style.cssText =
    "margin:0;max-width:38em;font-size:14px;line-height:1.6;color:#8a2a2a;font-weight:600";

  const guj = document.createElement("p");
  guj.textContent =
    "કૃપા કરીને આ વિન્ડો બંધ કરશો નહીં, બેક દબાવશો નહીં કે પેજ રિફ્રેશ કરશો નહીં. ચુકવણી પૂર્ણ થયા બાદ તમને આપમેળે પાછા લાવવામાં આવશે.";
  guj.style.cssText =
    "margin:0;max-width:38em;font-size:13.5px;line-height:1.7;color:#3a3a3a";

  overlay.append(heading, warn, guj);
  document.body.appendChild(overlay);
}

/**
 * Start an Axis EasyPay payment for an application.
 *
 * EasyPay is a redirect integration, not a JS SDK: the server hands back an
 * encrypted payload that has to reach the bank as a real form POST, so we build
 * a throwaway form and submit it. That navigates the tab away from the portal —
 * the user comes back via the server's return URL, which settles the payment.
 *
 * @param {string} applicationRefNo
 * @returns {Promise<never>} Resolves only if navigation somehow doesn't happen;
 *                           throws with a readable message when initiation fails.
 */
export async function startEasyPayPayment(applicationRefNo) {
  const res = await post("/api/v1/fee-payments/easypay/initiate", {
    application_ref_no: applicationRefNo,
  });

  const { url, i } = res?.data || {};
  if (!url || !i) throw new Error("Payment could not be started. Please try again.");

  const form = document.createElement("form");
  form.method = "POST";
  form.action = url;
  // Leaving the SPA entirely — the bank owns the next page.
  form.style.display = "none";

  const field = document.createElement("input");
  field.type = "hidden";
  field.name = "i";
  field.value = i;
  form.appendChild(field);

  // Cover the page while the browser navigates, so nobody closes the tab during
  // the hand-off and leaves a paid transaction we can't see.
  showLeavingNotice();

  document.body.appendChild(form);
  form.submit();

  // Give the navigation a moment. If it was blocked we're still here, so clear
  // the overlay rather than stranding the user behind it.
  await new Promise((resolve) => setTimeout(resolve, 4000));
  form.remove();
  document.getElementById("easypay-leaving")?.remove();
  throw new Error("Could not open the payment page. Please disable any pop-up blocker and retry.");
}
