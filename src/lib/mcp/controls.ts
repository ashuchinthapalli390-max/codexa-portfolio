/**
 * Emergency Kill Switch & Platform Controls for MCP
 * Allows immediate cutoff of read/write/bulk/email/payment operations.
 */

import prisma from "@/lib/prisma";

export interface McpEmergencyControls {
  isMcpEnabled: boolean;
  isReadToolsEnabled: boolean;
  isWriteToolsEnabled: boolean;
  isBulkActionsEnabled: boolean;
  isEmailActionsEnabled: boolean;
  isPaymentActionsEnabled: boolean;
  updatedAt?: Date;
  updatedById?: string | null;
}

const DEFAULT_CONTROLS: McpEmergencyControls = {
  isMcpEnabled: true,
  isReadToolsEnabled: true,
  isWriteToolsEnabled: true,
  isBulkActionsEnabled: true,
  isEmailActionsEnabled: true,
  isPaymentActionsEnabled: true,
};

export async function getMcpControls(): Promise<McpEmergencyControls> {
  try {
    const row = await prisma.mcpControl.findUnique({
      where: { id: "mcp_emergency_control" },
    });

    if (!row) {
      // Initialize default
      const created = await prisma.mcpControl.create({
        data: {
          id: "mcp_emergency_control",
          ...DEFAULT_CONTROLS,
        },
      });
      return created;
    }

    return {
      isMcpEnabled: row.isMcpEnabled,
      isReadToolsEnabled: row.isReadToolsEnabled,
      isWriteToolsEnabled: row.isWriteToolsEnabled,
      isBulkActionsEnabled: row.isBulkActionsEnabled,
      isEmailActionsEnabled: row.isEmailActionsEnabled,
      isPaymentActionsEnabled: row.isPaymentActionsEnabled,
      updatedAt: row.updatedAt,
      updatedById: row.updatedById,
    };
  } catch (error) {
    console.error("[MCP_CONTROLS] Error reading controls, failing safely:", error);
    // In case of DB read error, default to enabled or safe fallback
    return DEFAULT_CONTROLS;
  }
}

export async function updateMcpControls(
  updates: Partial<Omit<McpEmergencyControls, "updatedAt">>,
  operatorId: string
): Promise<McpEmergencyControls> {
  const current = await getMcpControls();
  const merged = { ...current, ...updates, updatedById: operatorId };

  const updated = await prisma.mcpControl.upsert({
    where: { id: "mcp_emergency_control" },
    create: {
      id: "mcp_emergency_control",
      ...merged,
    },
    update: {
      ...merged,
      updatedAt: new Date(),
    },
  });

  return updated;
}
