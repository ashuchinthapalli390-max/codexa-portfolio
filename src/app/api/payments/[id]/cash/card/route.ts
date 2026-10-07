import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/[id]/cash/card
 * Dynamically generates a professional SVG Cash Payment Request Card.
 * Adheres strictly to security rule: Watermarked "PENDING CASH APPROVAL".
 * Never claims payment is successful or verified.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const payment = await db.paymentRequest.findFirst({
      where: {
        OR: [{ id }, { referenceId: id }],
      },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            email: true,
            department: true,
            employmentProfile: {
              select: {
                employeeId: true,
                department: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return new NextResponse("Payment not found", { status: 404 });
    }

    const internName =
      payment.userName ||
      payment.user?.fullName ||
      payment.user?.username ||
      "Intern";
    const internId =
      payment.internId ||
      payment.user?.employmentProfile?.employeeId ||
      "CXA-INT-2026";
    const domain =
      payment.domain ||
      payment.user?.employmentProfile?.department ||
      payment.user?.department ||
      "Development with AI";
    const amount = Number(payment.fixedAmount || 450);
    const referenceId = payment.referenceId;
    const requestedDate = payment.cashRequestedAt
      ? new Date(payment.cashRequestedAt).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        });

    const isConfirmed = payment.cashStatus === "CASH_RECEIVED" && (payment.paymentStatus === "APPROVED" || payment.paymentStatus === "SUCCESS");
    const statusText = isConfirmed ? "CONFIRMED & RECEIVED" : "PENDING CASH APPROVAL";
    const statusColor = isConfirmed ? "#10B981" : "#F59E0B";
    const watermarkText = isConfirmed ? "CASH RECEIVED — OFFICIAL RECEIPT" : "PENDING CASH APPROVAL — NOT PAID";

    // Escape XML characters
    const escapeXml = (unsafe: string) =>
      unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case "<": return "&lt;";
          case ">": return "&gt;";
          case "&": return "&amp;";
          case "'": return "&apos;";
          case '"': return "&quot;";
          default: return c;
        }
      });

    const safeName = escapeXml(internName);
    const safeInternId = escapeXml(internId);
    const safeDomain = escapeXml(domain);
    const safeRef = escapeXml(referenceId);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="500" viewBox="0 0 800 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="800" y2="500" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B0F17" />
      <stop offset="50%" stop-color="#121826" />
      <stop offset="100%" stop-color="#070A0F" />
    </linearGradient>
    <linearGradient id="crimsonGrad" x1="0" y1="0" x2="200" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E11D48" />
      <stop offset="100%" stop-color="#BE123C" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0" y1="0" x2="720" y2="420" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#1A2234" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#0F1420" stop-opacity="0.95" />
    </linearGradient>
    <pattern id="gridPattern" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#E11D48" stroke-width="0.3" stroke-opacity="0.12" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="800" height="500" rx="16" fill="url(#bgGrad)" />
  <rect width="800" height="500" rx="16" fill="url(#gridPattern)" />

  <!-- Diagonal Watermark Across Canvas -->
  <g transform="rotate(-25 400 250)">
    <text x="400" y="250" font-family="'Inter', sans-serif" font-size="44" font-weight="900" fill="#E11D48" fill-opacity="0.08" text-anchor="middle" letter-spacing="6">
      ${watermarkText}
    </text>
  </g>

  <!-- Main Inner Container -->
  <rect x="40" y="40" width="720" height="420" rx="14" fill="url(#cardGrad)" stroke="#334155" stroke-opacity="0.4" stroke-width="1.5" />

  <!-- Crimson Top Accent Bar -->
  <rect x="40" y="40" width="720" height="6" rx="3" fill="url(#crimsonGrad)" />

  <!-- Header -->
  <g transform="translate(70, 75)">
    <!-- CodeXa Hexagon Logo Icon -->
    <rect x="0" y="0" width="38" height="38" rx="8" fill="#E11D48" />
    <path d="M11 19 L19 11 L27 19 L19 27 Z" fill="#FFFFFF" />
    <circle cx="19" cy="19" r="3" fill="#E11D48" />

    <text x="50" y="20" font-family="'Inter', sans-serif" font-size="18" font-weight="800" fill="#FFFFFF" letter-spacing="2">
      CODEXA AGENCY
    </text>
    <text x="50" y="34" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#94A3B8" letter-spacing="1">
      OFFICIAL PAYMENT CONTROL CENTER
    </text>

    <!-- Status Badge -->
    <rect x="490" y="2" width="160" height="30" rx="15" fill="${statusColor}" fill-opacity="0.15" stroke="${statusColor}" stroke-width="1" />
    <circle cx="505" cy="17" r="4" fill="${statusColor}" />
    <text x="517" y="21" font-family="'Inter', sans-serif" font-size="10.5" font-weight="700" fill="${statusColor}" letter-spacing="0.5">
      ${statusText}
    </text>
  </g>

  <!-- Title Section -->
  <g transform="translate(70, 140)">
    <text x="0" y="0" font-family="'Inter', sans-serif" font-size="22" font-weight="800" fill="#FFFFFF">
      CASH PAYMENT REQUEST
    </text>
    <text x="0" y="18" font-family="'Inter', sans-serif" font-size="12" font-weight="500" fill="#94A3B8">
      Mandatory Internship Service Bill (ID Card ₹150 + AI Dev Tools ₹300)
    </text>
  </g>

  <!-- Divider Line -->
  <line x1="70" y1="175" x2="730" y2="175" stroke="#334155" stroke-opacity="0.5" stroke-width="1" />

  <!-- Intern Details Grid -->
  <g transform="translate(70, 205)">
    <!-- Column 1: Intern Info -->
    <text x="0" y="0" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">INTERN NAME</text>
    <text x="0" y="20" font-family="'Inter', sans-serif" font-size="15" font-weight="700" fill="#F8FAFC">${safeName}</text>

    <text x="0" y="55" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">INTERN ID</text>
    <text x="0" y="75" font-family="'Courier New', monospace" font-size="14" font-weight="700" fill="#38BDF8">${safeInternId}</text>

    <text x="0" y="110" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">DOMAIN</text>
    <text x="0" y="130" font-family="'Inter', sans-serif" font-size="13" font-weight="600" fill="#CBD5E1">${safeDomain}</text>

    <!-- Column 2: Payment Parameters -->
    <text x="320" y="0" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">FIXED AMOUNT</text>
    <text x="320" y="24" font-family="'Inter', sans-serif" font-size="24" font-weight="900" fill="#F43F5E">₹${amount}</text>

    <text x="320" y="55" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">METHOD</text>
    <text x="320" y="75" font-family="'Inter', sans-serif" font-size="14" font-weight="700" fill="#F8FAFC">CASH</text>

    <text x="320" y="110" font-family="'Inter', sans-serif" font-size="11" font-weight="600" fill="#64748B" letter-spacing="0.5">PAYMENT REFERENCE</text>
    <text x="320" y="130" font-family="'Courier New', monospace" font-size="13" font-weight="700" fill="#E2E8F0">${safeRef}</text>
  </g>

  <!-- Footer Warning & Instruction -->
  <g transform="translate(70, 395)">
    <rect x="0" y="0" width="660" height="42" rx="8" fill="#0F172A" stroke="#334155" stroke-opacity="0.6" stroke-width="1" />
    <circle cx="20" cy="21" r="7" fill="#E11D48" fill-opacity="0.2" stroke="#E11D48" stroke-width="1" />
    <text x="20" y="24" font-family="'Inter', sans-serif" font-size="10" font-weight="800" fill="#E11D48" text-anchor="middle">!</text>
    <text x="36" y="18" font-family="'Inter', sans-serif" font-size="10.5" font-weight="600" fill="#CBD5E1">
      Hand ₹450 to an authorized CodeXa representative. Payment completes upon Founder / Co-Founder approval.
    </text>
    <text x="36" y="32" font-family="'Inter', sans-serif" font-size="9.5" font-weight="500" fill="#64748B">
      Requested on: ${requestedDate} • Not valid as receipt until confirmed in system.
    </text>
  </g>
</svg>`;

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error: any) {
    console.error("GET /api/payments/[id]/cash/card error:", error);
    return new NextResponse("Failed to generate cash card", { status: 500 });
  }
}
