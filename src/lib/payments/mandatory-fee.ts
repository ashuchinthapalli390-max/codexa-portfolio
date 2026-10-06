/**
 * CodeXa Mandatory Internship Service Fee & Reminder Policies
 *
 * Fee Structure:
 * - Mandatory Student ID Card:   ₹150
 * - AI Development Tools Pack:   ₹300
 * ------------------------------------
 * TOTAL MANDATORY SERVICE BILL:  ₹450
 */

export const MANDATORY_INTERNSHIP_SERVICE_FEE = 450;
export const MANDATORY_ID_CARD_FEE = 150;
export const MANDATORY_AI_TOOLS_FEE = 300;

export const MANDATORY_BILL_LINE_ITEMS = [
  { item: "Mandatory Student ID Card", amount: MANDATORY_ID_CARD_FEE },
  { item: "AI Development Tools Pack", amount: MANDATORY_AI_TOOLS_FEE },
];

/**
 * Excluded Cyber domain slugs, keywords, and specialized tracks.
 * Cyber-specific package payments (₹1,100 / ₹1,900 / ₹2,300) must NEVER receive
 * this ₹450 daily reminder.
 */
export const CYBER_REMINDER_EXCLUDED_DOMAINS = [
  "ethical-hacking",
  "ethical hacking",
  "penetration-testing",
  "penetration testing",
  "pentesting",
  "bug-bounty",
  "bug bounty",
  "vapt",
  "cyber-ethical-pentesting",
  "cyber-elite",
  "cyber elite",
  "cybersecurity",
  "cyber-security",
  "cyber",
];

export const EXCLUDED_CYBER_AMOUNTS = [1100, 1900, 2300];

/**
 * Checks if a domain, track, or payment plan is excluded from mandatory ₹450 reminders.
 */
export function isCyberExcludedDomain(
  domain?: string | null,
  planType?: string | null,
  amount?: number | null
): boolean {
  if (typeof amount === "number" && EXCLUDED_CYBER_AMOUNTS.includes(amount)) {
    return true;
  }

  const normalizedDomain = (domain || "").trim().toLowerCase();
  const normalizedPlan = (planType || "").trim().toLowerCase();

  for (const term of CYBER_REMINDER_EXCLUDED_DOMAINS) {
    if (
      normalizedDomain.includes(term) ||
      normalizedPlan.includes(term)
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the current calendar date key formatted in Asia/Kolkata (IST) timezone.
 * Format: "YYYY-MM-DD"
 */
export function getCurrentISTDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export interface InternReminderCandidate {
  id: string; // User ID
  userId?: string;
  name: string;
  email: string;
  isActive: boolean;
  role?: string;
  domain?: string | null;
  department?: string | null;
  paymentRequestId?: string | null;
  referenceId?: string | null;
  paymentStatus?: string | null;
  amount?: number;
  lastReminderAt?: Date | null;
}

/**
 * Server-side determination of reminder eligibility.
 * Only interns with active status, pending/unpaid mandatory fee, and non-cyber domains qualify.
 */
export function requiresMandatoryFeeReminder(candidate: InternReminderCandidate): boolean {
  if (!candidate.isActive) {
    return false;
  }

  if (candidate.role && candidate.role.toUpperCase() !== "INTERN") {
    return false;
  }

  const status = (candidate.paymentStatus || "UNPAID").toUpperCase();
  if (status === "PAID" || status === "APPROVED" || status === "WAIVED") {
    return false;
  }

  if (
    isCyberExcludedDomain(
      candidate.domain || candidate.department,
      undefined,
      candidate.amount
    )
  ) {
    return false;
  }

  return true;
}

/**
 * Builds the authenticated payment redirection URL for an intern.
 * Directs the student to their authenticated dashboard payments page without
 * trusting client-supplied amounts or secrets.
 */
export function buildInternPaymentUrl(
  candidate?: { referenceId?: string | null }
): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://codxa-agency.online");

  if (candidate?.referenceId) {
    return `${baseUrl}/dashboard/payments?ref=${encodeURIComponent(candidate.referenceId)}`;
  }
  return `${baseUrl}/dashboard/payments`;
}
