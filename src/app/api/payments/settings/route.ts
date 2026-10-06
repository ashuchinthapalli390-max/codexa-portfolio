import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission, Permission } from "@/lib/permissions";
import { dataStore } from "@/lib/data-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/payments/settings
 * Retrieves active UPI payment configuration and payment accounts.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = hasPermission(user, Permission.MANAGE_PAYMENT_SETTINGS) || hasPermission(user, Permission.CREATE_PAYMENT_REQUEST);

    const [settings, accounts] = await Promise.all([
      db.paymentSetting.findFirst({ where: { id: "cxa_payment_settings" } }),
      db.paymentAccount.findMany({
        where: isAdmin ? {} : { isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
    ]);

    const resolvedSettings = settings || {
      id: "cxa_payment_settings",
      upiDisplayName: process.env.DEFAULT_UPI_NAME || "CodeXa Agency",
      defaultUpiId: process.env.DEFAULT_UPI_ID || "shaikashu33@fam",
      qrCodeUrl: null,
      paymentInstructions:
        "Scan the QR code or click your preferred UPI app. Pay the exact amount and upload your payment screenshot with UTR number.",
      proofUploadEnabled: true,
      isUtrRequired: false,
      allowResubmission: true,
    };

    if (!isAdmin) {
      // Return safe user-facing config
      return NextResponse.json({
        upiDisplayName: resolvedSettings.upiDisplayName,
        defaultUpiId: resolvedSettings.defaultUpiId,
        qrCodeUrl: resolvedSettings.qrCodeUrl,
        paymentInstructions: resolvedSettings.paymentInstructions,
        proofUploadEnabled: resolvedSettings.proofUploadEnabled,
        isUtrRequired: resolvedSettings.isUtrRequired,
        allowResubmission: resolvedSettings.allowResubmission,
        accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          upiId: a.upiId,
          payeeName: a.payeeName,
          qrCodeUrl: a.qrCodeUrl,
          purpose: a.purpose,
          instructions: a.instructions,
        })),
      });
    }

    return NextResponse.json({
      settings: resolvedSettings,
      accounts,
      canManage: true,
    });
  } catch (error: any) {
    console.error("GET /api/payments/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to load payment settings" }, { status: 500 });
  }
}

/**
 * PUT /api/payments/settings
 * Updates global payment settings. Requires MANAGE_PAYMENT_SETTINGS.
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.MANAGE_PAYMENT_SETTINGS)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage payment settings." }, { status: 403 });
    }

    const body = await req.json();
    const {
      upiDisplayName,
      defaultUpiId,
      qrCodeUrl,
      paymentInstructions,
      proofUploadEnabled,
      isUtrRequired,
      allowResubmission,
      verificationRoles,
    } = body;

    const updated = await db.paymentSetting.upsert({
      where: { id: "cxa_payment_settings" },
      update: {
        upiDisplayName: upiDisplayName !== undefined ? upiDisplayName : undefined,
        defaultUpiId: defaultUpiId !== undefined ? defaultUpiId : undefined,
        qrCodeUrl: qrCodeUrl !== undefined ? qrCodeUrl : undefined,
        paymentInstructions: paymentInstructions !== undefined ? paymentInstructions : undefined,
        proofUploadEnabled: proofUploadEnabled !== undefined ? Boolean(proofUploadEnabled) : undefined,
        isUtrRequired: isUtrRequired !== undefined ? Boolean(isUtrRequired) : undefined,
        allowResubmission: allowResubmission !== undefined ? Boolean(allowResubmission) : undefined,
        verificationRoles: verificationRoles !== undefined ? verificationRoles : undefined,
        updatedById: user.id,
      },
      create: {
        id: "cxa_payment_settings",
        upiDisplayName: upiDisplayName || process.env.DEFAULT_UPI_NAME || "CodeXa Agency",
        defaultUpiId: defaultUpiId || process.env.DEFAULT_UPI_ID || "shaikashu33@fam",
        qrCodeUrl: qrCodeUrl || null,
        paymentInstructions: paymentInstructions || "Scan the QR code or click your preferred UPI app.",
        proofUploadEnabled: proofUploadEnabled !== undefined ? Boolean(proofUploadEnabled) : true,
        isUtrRequired: isUtrRequired !== undefined ? Boolean(isUtrRequired) : false,
        allowResubmission: allowResubmission !== undefined ? Boolean(allowResubmission) : true,
        verificationRoles: verificationRoles || ["FOUNDER", "CO_FOUNDER", "HR"],
        updatedById: user.id,
      },
    });

    await dataStore.logAudit(user.id, "PAYMENT_ACCOUNT_CHANGED", "Updated CodeXa global UPI payment settings");

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error("PUT /api/payments/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to update payment settings" }, { status: 500 });
  }
}

/**
 * POST /api/payments/settings
 * Adds or manages payment accounts. Requires MANAGE_PAYMENT_SETTINGS.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(user, Permission.MANAGE_PAYMENT_SETTINGS)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to manage payment accounts." }, { status: 403 });
    }

    const body = await req.json();
    const { name, upiId, payeeName, qrCodeUrl, isDefault, isActive, purpose, instructions } = body;

    if (!name || !upiId) {
      return NextResponse.json({ error: "Account name and UPI ID are required." }, { status: 400 });
    }

    if (isDefault) {
      // Clear existing defaults
      await db.paymentAccount.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.paymentAccount.create({
      data: {
        name,
        upiId,
        payeeName: payeeName || "CodeXa Agency",
        qrCodeUrl: qrCodeUrl || null,
        isActive: isActive !== false,
        isDefault: Boolean(isDefault),
        purpose: purpose || "ALL",
        instructions: instructions || null,
      },
    });

    await dataStore.logAudit(user.id, "PAYMENT_ACCOUNT_CHANGED", `Created payment account ${name} (${upiId})`);

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/payments/settings error:", error);
    return NextResponse.json({ error: error.message || "Failed to create payment account" }, { status: 500 });
  }
}
