import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculateProjectAdvance,
  calculateLeadQualityScore,
  generateProjectRefId,
} from "@/lib/project-calculator";
import { createRazorpayOrder, getRazorpayKeys } from "@/lib/razorpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      fullName,
      email,
      phone,
      company,
      city,
      preferredContact = "EMAIL",
      projectType,
      customProjectType,
      closestCategory,
      purposes = [],
      features = [],
      specificFeatures = {},
      authOption,
      authExtras = [],
      dashboardOption,
      dashboardFeatures = [],
      databaseOption,
      databaseDataTypes = [],
      integrations = [],
      designStyles = [],
      animationLevel = "Standard",
      pageRange = "2–5 Pages",
      hasExistingDesign,
      designLinks,
      existingProjectType,
      existingProjectUrl,
      existingTechStack,
      timeline = "2–4 Weeks",
      budgetRange = "₹20,000–₹40,000",
      description,
      termsAccepted,
    } = body;

    // Validation
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ success: false, error: "Full Name is required." }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ success: false, error: "Valid email address is required." }, { status: 400 });
    }
    if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
      return NextResponse.json({ success: false, error: "Valid phone number is required." }, { status: 400 });
    }
    if (!projectType) {
      return NextResponse.json({ success: false, error: "Project type selection is required." }, { status: 400 });
    }
    if (!description || description.trim().length < 15) {
      return NextResponse.json(
        { success: false, error: "Please provide a project description (at least 15 characters)." },
        { status: 400 }
      );
    }
    if (!termsAccepted) {
      return NextResponse.json(
        { success: false, error: "You must accept the terms and advance booking policy to continue." },
        { status: 400 }
      );
    }

    // Recalculate advance amount strictly on server side
    const calc = calculateProjectAdvance({
      projectTypeId: projectType,
      features,
      authOption,
      authExtras,
      dashboardOption,
      databaseOption,
      animationLevel,
      integrations,
      specificFeatures,
    });

    const leadScore = calculateLeadQualityScore({
      description,
      budgetRange,
      timeline,
      phone,
      hasExistingDesign,
      featuresCount: (features || []).length + (integrations || []).length,
    });

    const referenceId = generateProjectRefId();

    // Persist Project Application to database
    const application = await db.projectApplication.create({
      data: {
        referenceId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        company: company?.trim() || null,
        city: city?.trim() || null,
        preferredContact: String(preferredContact || "EMAIL").toUpperCase(),

        projectType,
        customProjectType: customProjectType?.trim() || null,
        closestCategory: closestCategory || null,

        purposes: Array.isArray(purposes) ? purposes : [],
        features: Array.isArray(features) ? features : [],
        specificFeatures: specificFeatures || {},

        authOption: authOption || null,
        authExtras: Array.isArray(authExtras) ? authExtras : [],
        dashboardOption: dashboardOption || null,
        dashboardFeatures: Array.isArray(dashboardFeatures) ? dashboardFeatures : [],
        databaseOption: databaseOption || null,
        databaseDataTypes: Array.isArray(databaseDataTypes) ? databaseDataTypes : [],
        integrations: Array.isArray(integrations) ? integrations : [],

        designStyles: Array.isArray(designStyles) ? designStyles : [],
        animationLevel: animationLevel || "Standard",
        pageRange: pageRange || "2–5 Pages",

        hasExistingDesign: hasExistingDesign || null,
        designLinks: designLinks?.trim() || null,
        existingProjectType: existingProjectType || null,
        existingProjectUrl: existingProjectUrl?.trim() || null,
        existingTechStack: existingTechStack?.trim() || null,

        timeline: timeline || "2–4 Weeks",
        budgetRange: budgetRange || "₹20,000–₹40,000",
        description: description.trim(),

        baseAdvance: calc.baseAdvance,
        featureAdvance: calc.featureAdvance,
        finalAdvance: calc.finalAdvance,
        currency: "INR",

        leadQuality: leadScore.quality,
        qualityScore: leadScore.score,

        status: "PAYMENT_PENDING",
        termsAccepted: true,
        termsAcceptedAt: new Date(),
      },
    });

    // Create Razorpay Order
    const orderResult = await createRazorpayOrder({
      amountInINR: calc.finalAdvance,
      receipt: referenceId,
      notes: {
        referenceId,
        applicationId: application.id,
        clientName: fullName,
        clientEmail: email,
        projectType,
      },
    });

    if (!orderResult.success || !orderResult.order) {
      return NextResponse.json(
        { success: false, error: orderResult.error || "Failed to initiate payment order." },
        { status: 500 }
      );
    }

    // Persist Payment record
    const payment = await db.projectPayment.create({
      data: {
        projectApplicationId: application.id,
        provider: "RAZORPAY",
        amount: calc.finalAdvance,
        amountPaise: Math.round(calc.finalAdvance * 100),
        currency: "INR",
        razorpayOrderId: orderResult.order.id,
        status: "ORDER_CREATED",
      },
    });

    const { keyId } = getRazorpayKeys();

    return NextResponse.json({
      success: true,
      referenceId,
      applicationId: application.id,
      paymentId: payment.id,
      orderId: orderResult.order.id,
      amount: calc.finalAdvance,
      amountPaise: Math.round(calc.finalAdvance * 100),
      currency: "INR",
      keyId,
      isMock: orderResult.isMock || false,
      breakdown: calc.breakdown,
    });
  } catch (error: any) {
    console.error("Error creating project application order:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
