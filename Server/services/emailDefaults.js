/**
 * Built-in wording for the portal's emails.
 *
 * Used whenever no active template for that email has been saved in the admin
 * panel (Email Templates), so these emails go out on a fresh install exactly as
 * OTP emails do. A template saved in the admin panel always takes priority.
 * scripts/seedEmailTemplates.js copies these into the admin panel as a starting
 * point for editing.
 */
export const EMAIL_TEMPLATES = [
  {
    key: "registration_id_issued",
    subject: "Your Registration ID — Nagar Palika Recruitment Portal",
    body: `<p>Dear {{NAME}},</p>
<p>Your OTR registration is complete.</p>
<p><strong>Registration ID:</strong> {{REGISTRATION_ID}}</p>
<p>Please save this ID — you will need it to apply for posts and download your admit card.</p>
<p>Login at: {{PORTAL_URL}}</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "application_submitted",
    subject: "Application Submitted — {{POST_TITLE}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your application has been submitted successfully.</p>
<ul>
  <li><strong>Application Ref No:</strong> {{APPLICATION_REF_NO}}</li>
  <li><strong>Advertisement No:</strong> {{ADVT_NO}}</li>
  <li><strong>Post:</strong> {{POST_TITLE}}</li>
</ul>
<p>Please complete your fee payment to confirm your application.</p>
<p>Login at: {{PORTAL_URL}}</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "fee_receipt",
    subject: "Fee Payment Confirmation — {{ADVT_NO}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your application fee payment has been received.</p>
<ul>
  <li><strong>Registration ID:</strong> {{REGISTRATION_ID}}</li>
  <li><strong>Advertisement No:</strong> {{ADVT_NO}}</li>
  <li><strong>Receipt No:</strong> {{RECEIPT_NO}}</li>
  <li><strong>Amount Paid:</strong> &#8377;{{AMOUNT}}</li>
</ul>
<p>Please find the receipt attached to this email.</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "call_letter_published",
    subject: "Your Admit Card is Ready — {{ADVT_NO}}",
    body: `<p>Dear {{NAME}},</p>
<p>Your admit card (call letter) for Advertisement No. <strong>{{ADVT_NO}}</strong> is now available for download.</p>
<p><strong>Registration ID:</strong> {{REGISTRATION_ID}}</p>
<p>Download your admit card from: {{PORTAL_URL}}</p>
<p>Please carry a printed copy to the examination centre.</p>
<p>Regards,<br>Nagar Palika Recruitment Cell</p>`,
  },
  {
    key: "bulk_export_ready",
    subject: "Bulk Export Ready — {{ADVT_NO}}",
    body: `<p>The bulk application export for Advertisement No. <strong>{{ADVT_NO}}</strong> is ready.</p>
<p>Download link: {{DOWNLOAD_LINK}}</p>
<p>This link expires in 7 days.</p>
<p>Regards,<br>Nagar Palika Recruitment Portal</p>`,
  },
  {
    key: "otp",
    subject: "Your OTP Code",
    body: `<p>Dear {{NAME}},</p>
<p>Your OTP is: <strong>{{OTP_CODE}}</strong></p>
<p>This code expires in {{EXPIRY_MINUTES}} minutes. Do not share it with anyone.</p>
<p>If you did not request this OTP, please ignore this message.</p>`,
  },
];

export const DEFAULT_EMAILS = Object.fromEntries(
  EMAIL_TEMPLATES.map((t) => [t.key, t]),
);
