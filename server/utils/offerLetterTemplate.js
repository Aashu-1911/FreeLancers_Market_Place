function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "To be discussed";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "To be discussed";
  }

  return parsed.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatAmount(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "N/A";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function generateOfferLetter({
  freelancerName,
  clientName,
  projectTitle,
  agreedAmount,
  startDate,
  endDate,
  contractId,
}) {
  const safeFreelancerName = escapeHtml(freelancerName || "Freelancer");
  const safeClientName = escapeHtml(clientName || "Client");
  const safeProjectTitle = escapeHtml(projectTitle || "Untitled Project");
  const safeContractId = escapeHtml(contractId || "N/A");
  const contractUrl = `http://localhost:5173/contracts/${encodeURIComponent(String(contractId || ""))}`;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillHire Offer Letter</title>
  </head>
  <body style="margin: 0; padding: 28px 0; background-color: #d7dbe1; font-family: Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 680px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 0 rgba(15, 23, 42, 0.05);">
      <div style="background-color: #1f2e45; padding: 28px 24px 24px; text-align: center;">
        <div style="font-size: 48px; font-weight: 700; letter-spacing: 0.2px; color: #ffffff; line-height: 1;">
          Skill<span style="color: #4EA8F7;">Hire</span>
        </div>
        <div style="color: #dbe8f6; font-size: 15px; margin-top: 10px; line-height: 1.2;">Official Offer Letter</div>
      </div>

      <div style="padding: 28px 26px;">
        <p style="margin: 0 0 14px; font-size: 16px; line-height: 1.4; color: #1e293b;">Dear ${safeFreelancerName},</p>
        <p style="margin: 0 0 22px; font-size: 15px; line-height: 1.6; color: #334155;">
          Congratulations. You have been selected by ${safeClientName} for the project <strong>${safeProjectTitle}</strong> on SkillHire. We are pleased to extend this official offer letter for your engagement.
        </p>

        <div style="background-color: #d9e4ef; border-left: 4px solid #4EA8F7; padding: 18px 20px; margin: 0 0 24px; border-radius: 4px;">
          <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>Project:</strong> ${safeProjectTitle}</p>
          <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>Contract ID:</strong> ${safeContractId}</p>
          <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>Agreed Amount:</strong> &#8377;${formatAmount(agreedAmount)}</p>
          <p style="margin: 0 0 10px; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>Start Date:</strong> ${formatDate(startDate)}</p>
          <p style="margin: 0; font-size: 14px; line-height: 1.45; color: #1f2937;"><strong>End Date:</strong> ${formatDate(endDate)}</p>
        </div>

        <h3 style="margin: 0 0 12px; font-size: 32px; color: #0f172a; line-height: 1.25;">Project Details</h3>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.65; color: #475569;">
          This engagement confirms your onboarding for the above project under the agreed timeline and compensation. Please review all contract terms carefully and proceed with acceptance to begin collaboration with the client.
        </p>

        <div style="text-align: center; margin: 0 0 24px;">
          <a href="${contractUrl}" style="display: inline-block; background-color: #1D9E75; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 30px; border-radius: 6px;">
            Accept &amp; View Contract
          </a>
        </div>

        <div style="font-size: 12px; color: #6b7280; line-height: 1.65;">
          <p style="margin: 0 0 6px;"><strong>Terms:</strong></p>
          <p style="margin: 0 0 4px;">1. Timely delivery of milestones and assigned tasks is expected.</p>
          <p style="margin: 0 0 4px;">2. Professional conduct and clear communication must be maintained.</p>
          <p style="margin: 0;">3. Payment will be released upon successful completion and approval.</p>
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

module.exports = { generateOfferLetter };
