import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function maskName(name: string): string {
  const parts = name.trim().split(" ");
  return parts
    .map((p) => (p.length > 2 ? `${p[0]}${"*".repeat(p.length - 2)}${p[p.length - 1]}` : p))
    .join(" ");
}

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const { code } = params;
  const cleanCode = (code || "").trim().toUpperCase();

  try {
    // 1. Check Offer Letters
    const letter: any = await db.offerLetter.findFirst({
      where: {
        OR: [{ verificationCode: cleanCode }, { offerNumber: cleanCode }],
      },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (letter) {
      return NextResponse.json({
        verified: true,
        documentType: "OFFICIAL_OFFER_LETTER",
        documentId: letter.offerNumber,
        verificationCode: letter.verificationCode,
        recipient: maskName(letter.user?.fullName || letter.user?.username || "Verified Member"),
        role: letter.role,
        department: letter.department,
        issuedBy: "CodeXa Agency Executive Board",
        issueDate: letter.issueDate,
        status: letter.status,
        issuer: {
          name: "CodeXa Agency",
          portal: "https://codxa-agency.online",
          verificationAuthority: "CodeXa Trust & Security Infrastructure",
        },
      });
    }

    // 2. Check General Document Vault
    const doc: any = await db.documentItem.findFirst({
      where: {
        OR: [{ verificationCode: cleanCode }, { documentNumber: cleanCode }],
      },
      include: {
        user: {
          select: {
            fullName: true,
            username: true,
            role: true,
          },
        },
      },
    });

    if (doc) {
      return NextResponse.json({
        verified: true,
        documentType: doc.documentType,
        documentId: doc.documentNumber || doc.id,
        verificationCode: doc.verificationCode,
        title: doc.title,
        recipient: maskName(doc.user?.fullName || doc.user?.username || "Verified Member"),
        issuedBy: doc.issuedBy || "CodeXa Agency Leadership",
        issueDate: doc.issuedAt,
        status: doc.status,
        issuer: {
          name: "CodeXa Agency",
          portal: "https://codxa-agency.online",
          verificationAuthority: "CodeXa Trust & Security Infrastructure",
        },
      });
    }

    return NextResponse.json(
      {
        verified: false,
        error: "Document not found or invalid verification code.",
      },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("[GET /api/verify/:code]", err);
    return NextResponse.json({ error: "Verification lookup failed." }, { status: 500 });
  }
}
