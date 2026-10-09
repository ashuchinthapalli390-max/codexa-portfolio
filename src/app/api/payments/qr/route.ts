import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/qr
 * Generates an official, scannable UPI QR code dynamically.
 * URI Format: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pa = searchParams.get("pa") || process.env.DEFAULT_UPI_ID || "7075920852@ptyes";
    const pn = searchParams.get("pn") || process.env.DEFAULT_UPI_NAME || "CodeXa Agency";
    const am = searchParams.get("am");
    const tn = searchParams.get("tn") || "CodeXa Payment";
    const cu = searchParams.get("cu") || "INR";

    let upiUri = `upi://pay?pa=${encodeURIComponent(pa)}&pn=${encodeURIComponent(pn)}&cu=${encodeURIComponent(cu)}`;
    if (am) {
      const numAm = parseFloat(am);
      if (!isNaN(numAm) && numAm > 0) {
        upiUri += `&am=${numAm.toFixed(2)}`;
      }
    }
    if (tn) {
      upiUri += `&tn=${encodeURIComponent(tn)}`;
    }

    const pngBuffer = await QRCode.toBuffer(upiUri, {
      width: 420,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("GET /api/payments/qr error:", error);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
