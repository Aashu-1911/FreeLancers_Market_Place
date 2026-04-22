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
  const safeContractId = escapeHtml(contractId);
  const contractUrl = `http://localhost:5173/contracts/${encodeURIComponent(String(contractId || ""))}`;

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SkillHire Offer Letter</title>
  </head>
  <body style="margin: 0; padding: 24px 0; background-color: #f2f5f9; font-family: Arial, sans-serif; color: #1f2937;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #1E2A3A; padding: 22px 24px; text-align: center;">
        <div style="font-size: 30px; font-weight: 700; letter-spacing: 0.3px; color: #ffffff;">
          Skill<span style="color: #4EA8F7;">Hire</span>
        </div>
        <div style="color: #dbe8f6; font-size: 14px; margin-top: 6px;">Official Offer Letter</div>
      </div>

      <div style="padding: 24px;">
        <p style="margin: 0 0 14px; font-size: 16px;">Dear ${safeFreelancerName},</p>
        <p style="margin: 0 0 18px; font-size: 15px; line-height: 1.6; color: #334155;">
          Congratulations. You have been selected by ${safeClientName} for the project <strong>${safeProjectTitle}</strong> on SkillHire. We are pleased to extend this official offer letter for your engagement.
        </p>

        <div style="background-color: #E6F1FB; border-left: 4px solid #4EA8F7; padding: 14px 16px; margin: 0 0 20px; border-radius: 4px;">
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Project:</strong> ${safeProjectTitle}</p>
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Contract ID:</strong> ${safeContractId}</p>
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Agreed Amount:</strong> &#8377;${formatAmount(agreedAmount)}</p>
          <p style="margin: 0 0 8px; font-size: 14px;"><strong>Start Date:</strong> ${formatDate(startDate)}</p>
          <p style="margin: 0; font-size: 14px;"><strong>End Date:</strong> ${formatDate(endDate)}</p>
        </div>

        <h3 style="margin: 0 0 10px; font-size: 18px; color: #0f172a;">Project Details</h3>
        <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.65; color: #475569;">
          This engagement confirms your onboarding for the above project under the agreed timeline and compensation. Please review all contract terms carefully and proceed with acceptance to begin collaboration with the client.
        </p>

        <div style="text-align: center; margin: 0 0 20px;">
          <a href="${contractUrl}" style="display: inline-block; background-color: #1D9E75; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 32px; border-radius: 6px;">
            Accept &amp; View Contract
          </a>
        </div>

        <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
          <p style="margin: 0 0 6px;"><strong>Terms:</strong></p>
          <p style="margin: 0 0 4px;">1. Timely delivery of milestones and assigned tasks is expected.</p>
          <p style="margin: 0 0 4px;">2. Professional conduct and clear communication must be maintained.</p>
          <p style="margin: 0;">3. Payment will be released upon successful completion and approval.</p>
        </div>
      </div>

      <div style="background-color: #f3f4f6; text-align: center; padding: 16px 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0 0 4px; font-size: 12px; color: #6b7280;">This is an automated email from SkillHire. Please do not reply.</p>
        <p style="margin: 0; font-size: 12px; color: #9ca3af;">&copy; ${new Date().getFullYear()} SkillHire. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
`;
}

module.exports = { generateOfferLetter };
