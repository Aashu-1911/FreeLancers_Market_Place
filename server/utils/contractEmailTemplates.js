function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  const parsed = value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount) {
  const safeAmount = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

function buildContractUrl(contractId) {
  return `http://localhost:5173/contracts/${encodeURIComponent(String(contractId || ""))}`;
}

function renderSummaryRows(rows) {
  return rows
    .map(({ label, value }) => {
      return `<p style="margin: 0 0 10px; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>${escapeHtml(
        label
      )}:</strong> ${escapeHtml(value)}</p>`;
    })
    .join("\n");
}

function renderEmailLayout({
  sectionTitle,
  greetingName,
  intro,
  summaryRows,
  detailsTitle,
  detailsBody,
  actionLabel,
  actionUrl,
}) {
  const summaryHtml = renderSummaryRows(summaryRows);
  const actionHtml = actionLabel && actionUrl
    ? `
        <div style="text-align: center; margin: 0 0 24px;">
          <a href="${escapeHtml(actionUrl)}" style="display: inline-block; background-color: #1D9E75; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 30px; border-radius: 6px;">
            ${escapeHtml(actionLabel)}
          </a>
        </div>
      `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillHire Update</title>
  </head>
  <body style="margin: 0; padding: 28px 0; background-color: #d7dbe1; font-family: Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 0 rgba(15, 23, 42, 0.05);">
      <div style="background-color: #1f2e45; padding: 28px 24px 24px; text-align: center;">
        <div style="font-size: 48px; font-weight: 700; letter-spacing: 0.2px; color: #ffffff; line-height: 1;">
          Skill<span style="color: #4EA8F7;">Hire</span>
        </div>
        <div style="color: #dbe8f6; font-size: 15px; margin-top: 10px; line-height: 1.2;">${escapeHtml(sectionTitle)}</div>
      </div>

      <div style="padding: 28px 26px;">
        <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.4; color: #1e293b;">Dear ${escapeHtml(greetingName)},</p>
        <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #334155;">
          ${escapeHtml(intro)}
        </p>

        <div style="background-color: #d9e4ef; border-left: 4px solid #4EA8F7; padding: 18px 20px; margin: 0 0 24px; border-radius: 4px;">
          ${summaryHtml}
        </div>

        <h3 style="margin: 0 0 12px; font-size: 32px; color: #0f172a; line-height: 1.25;">${escapeHtml(detailsTitle)}</h3>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.65; color: #475569;">
          ${escapeHtml(detailsBody)}
        </p>

        ${actionHtml}

        <div style="font-size: 12px; color: #6b7280; line-height: 1.65;">
          <p style="margin: 0 0 6px;"><strong>Terms:</strong></p>
          <p style="margin: 0 0 4px;">1. Timely delivery of milestones and assigned tasks is expected.</p>
          <p style="margin: 0 0 4px;">2. Professional conduct and clear communication must be maintained.</p>
          <p style="margin: 0;">3. Payment and feedback updates are tracked on your contract page.</p>
        </div>
      </div>

      <div style="background-color: #f3f4f6; text-align: center; padding: 16px 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px; font-size: 14px; color: #6b7280;">This is an automated email from SkillHire. Please do not reply.</p>
        <p style="margin: 0; font-size: 14px; color: #9ca3af;">&copy; ${new Date().getFullYear()} SkillHire. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
`;
}

function ratingStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"*".repeat(safeRating)}${"-".repeat(5 - safeRating)} (${safeRating}/5)`;
}

function buildWorkFinishedEmail({ freelancerName, clientName, projectTitle, contractId }) {
  const safeProjectTitle = projectTitle || "Untitled Project";
  const safeContractId = contractId || "N/A";
  const safeClientName = clientName || "Your client";

  return renderEmailLayout({
    sectionTitle: "Official Contract Update",
    greetingName: freelancerName || "Freelancer",
    intro: `${safeClientName} has marked your work as finished for ${safeProjectTitle}.`,
    summaryRows: [
      { label: "Project", value: safeProjectTitle },
      { label: "Contract ID", value: safeContractId },
      { label: "Status", value: "Work Finished" },
      { label: "Next Step", value: "Await payment confirmation" },
    ],
    detailsTitle: "Project Details",
    detailsBody: "The client has acknowledged delivery for this contract. You can now track payment and final review updates from the contract page.",
    actionLabel: "View Contract",
    actionUrl: buildContractUrl(contractId),
  });
}

function buildPaymentCompletedEmail({
  freelancerName,
  clientName,
  projectTitle,
  contractId,
  amount,
  transactionId,
  paymentDate,
}) {
  const safeProjectTitle = projectTitle || "Untitled Project";
  const safeContractId = contractId || "N/A";
  const safeClientName = clientName || "Your client";

  return renderEmailLayout({
    sectionTitle: "Official Payment Update",
    greetingName: freelancerName || "Freelancer",
    intro: `${safeClientName} has completed payment for ${safeProjectTitle}.`,
    summaryRows: [
      { label: "Project", value: safeProjectTitle },
      { label: "Contract ID", value: safeContractId },
      { label: "Amount", value: formatCurrency(amount) },
      { label: "Transaction ID", value: transactionId || "N/A" },
      { label: "Date", value: formatDate(paymentDate) },
    ],
    detailsTitle: "Project Details",
    detailsBody: "Your payment has been marked as completed. The final client review, if pending, will be shared with you in a separate update.",
    actionLabel: "View Contract",
    actionUrl: buildContractUrl(contractId),
  });
}

function buildReviewReceivedEmail({ freelancerName, clientName, projectTitle, contractId, rating, comment }) {
  const safeProjectTitle = projectTitle || "Untitled Project";
  const safeClientName = clientName || "A client";

  return renderEmailLayout({
    sectionTitle: "Official Review Update",
    greetingName: freelancerName || "Freelancer",
    intro: `${safeClientName} submitted your review for ${safeProjectTitle}.`,
    summaryRows: [
      { label: "Project", value: safeProjectTitle },
      { label: "Contract ID", value: contractId || "N/A" },
      { label: "Rating", value: ratingStars(rating) },
      { label: "Comment", value: comment || "No comment provided" },
    ],
    detailsTitle: "Project Details",
    detailsBody: "This feedback is now recorded on your profile for this contract. Keep up the great work and continue delivering high-quality outcomes.",
    actionLabel: "View Contract",
    actionUrl: contractId ? buildContractUrl(contractId) : "",
  });
}

module.exports = {
  buildWorkFinishedEmail,
  buildPaymentCompletedEmail,
  buildReviewReceivedEmail,
};
