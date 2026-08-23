import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { referenceId: string } }
) {
  try {
    const referenceId = params.referenceId;
    if (!referenceId) {
      return NextResponse.json({ success: false, error: "Missing reference ID" }, { status: 400 });
    }

    const application = await db.projectApplication.findUnique({
      where: { referenceId },
      include: {
        payments: {
          select: {
            id: true,
            provider: true,
            amount: true,
            currency: true,
            status: true,
            razorpayPaymentId: true,
            capturedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Project application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      application: {
        id: application.id,
        referenceId: application.referenceId,
        fullName: application.fullName,
        email: application.email,
        phone: application.phone,
        company: application.company,
        city: application.city,
        preferredContact: application.preferredContact,
        projectType: application.projectType,
        customProjectType: application.customProjectType,
        closestCategory: application.closestCategory,
        purposes: application.purposes,
        features: application.features,
        specificFeatures: application.specificFeatures,
        authOption: application.authOption,
        authExtras: application.authExtras,
        dashboardOption: application.dashboardOption,
        dashboardFeatures: application.dashboardFeatures,
        databaseOption: application.databaseOption,
        databaseDataTypes: application.databaseDataTypes,
        integrations: application.integrations,
        designStyles: application.designStyles,
        animationLevel: application.animationLevel,
        pageRange: application.pageRange,
        timeline: application.timeline,
        budgetRange: application.budgetRange,
        description: application.description,
        baseAdvance: application.baseAdvance,
        featureAdvance: application.featureAdvance,
        finalAdvance: application.finalAdvance,
        currency: application.currency,
        status: application.status,
        createdAt: application.createdAt,
        payments: application.payments,
      },
    });
  } catch (error: any) {
    console.error("Error fetching project application:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
