import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { generateTotpSecret, generateQrCodeDataUrl } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { secret, otpauthUrl } = generateTotpSecret(user.username || user.email || user.id);
    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);

    return NextResponse.json({
      success: true,
      secret,
      qrCodeDataUrl,
      otpauthUrl,
    });
  } catch (error: any) {
    console.error("2FA Setup Error:", error);
    return NextResponse.json({ error: "Failed to initialize 2FA setup." }, { status: 500 });
  }
}
