function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrency(amount) {
  const safeAmount = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(safeAmount);
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

function ratingStars(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  return `${"*".repeat(safeRating)}${"-".repeat(5 - safeRating)} (${safeRating}/5)`;
}

function buildWorkFinishedEmail({ freelancerName, clientName, projectTitle, contractId }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Work Marked as Finished</h2>
      <p>Hello ${escapeHtml(freelancerName || "Freelancer")},</p>
      <p>${escapeHtml(clientName || "Your client")} has marked your work as finished for <strong>${escapeHtml(projectTitle || "your project")}</strong>.</p>
      <p>Contract ID: <strong>#${escapeHtml(contractId)}</strong></p>
      <p>You can now check the contract page for payment status and final review.</p>
      <p style="margin-top: 20px;">Regards,<br/>SkillHire Team</p>
    </div>
  `;
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
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">Payment Completed</h2>
      <p>Hello ${escapeHtml(freelancerName || "Freelancer")},</p>
      <p>${escapeHtml(clientName || "Your client")} has completed payment for <strong>${escapeHtml(projectTitle || "your project")}</strong>.</p>
      <ul>
        <li>Contract ID: <strong>#${escapeHtml(contractId)}</strong></li>
        <li>Amount: <strong>${escapeHtml(formatCurrency(amount))}</strong></li>
        <li>Transaction ID: <strong>${escapeHtml(transactionId || "N/A")}</strong></li>
        <li>Date: <strong>${escapeHtml(formatDate(paymentDate))}</strong></li>
      </ul>
      <p>You will receive another email when the client submits your rating and review.</p>
      <p style="margin-top: 20px;">Regards,<br/>SkillHire Team</p>
    </div>
  `;
}

function buildReviewReceivedEmail({ freelancerName, clientName, projectTitle, rating, comment }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <h2 style="margin-bottom: 8px;">You Received a New Review</h2>
      <p>Hello ${escapeHtml(freelancerName || "Freelancer")},</p>
      <p>${escapeHtml(clientName || "A client")} submitted your review for <strong>${escapeHtml(projectTitle || "a project")}</strong>.</p>
      <ul>
        <li>Rating: <strong>${escapeHtml(ratingStars(rating))}</strong></li>
        <li>Comment: <strong>${escapeHtml(comment || "No comment provided")}</strong></li>
      </ul>
      <p style="margin-top: 20px;">Keep up the great work.<br/>SkillHire Team</p>
    </div>
  `;
}

module.exports = {
  buildWorkFinishedEmail,
  buildPaymentCompletedEmail,
  buildReviewReceivedEmail,
};
