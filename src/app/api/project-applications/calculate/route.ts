import { NextRequest, NextResponse } from "next/server";
import { calculateProjectAdvance } from "@/lib/project-calculator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = calculateProjectAdvance({
      projectTypeId: body.projectType || body.projectTypeId,
      features: body.features || [],
      authOption: body.authOption,
      authExtras: body.authExtras || [],
      dashboardOption: body.dashboardOption,
      databaseOption: body.databaseOption,
      animationLevel: body.animationLevel,
      integrations: body.integrations || [],
      specificFeatures: body.specificFeatures || {},
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Calculation failed" },
      { status: 400 }
    );
  }
}
