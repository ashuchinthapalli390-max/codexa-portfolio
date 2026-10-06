/**
 * Model Context Protocol (MCP) Authentication & Identity Layer
 * Authenticates remote AI clients, developers, and service accounts using:
 * 1. Bearer API Key (cxa_mcp_sk_live_...)
 * 2. OAuth 2.0 Bearer Access Token (cxa_mcp_tok_...)
 * 3. Service Account Key (cxa_sa_live_...)
 * 4. Active CodeXa Web Session Cookie (internal fallback)
 */

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { getCurrentSessionResult } from "@/lib/auth";
import { McpAuthContext } from "./types";

export function hashMcpSecret(secret: string): string {
  return crypto.createHash("sha256").update(secret.trim()).digest("hex");
}

export function generateMcpApiKey(): { rawKey: string; keyHash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `cxa_mcp_sk_live_${randomPart}`;
  const keyHash = hashMcpSecret(rawKey);
  const prefix = `cxa_mcp_sk_live_${randomPart.slice(0, 6)}...`;
  return { rawKey, keyHash, prefix };
}

export function generateServiceAccountKey(): { rawKey: string; keyHash: string; prefix: string } {
  const randomPart = crypto.randomBytes(24).toString("hex");
  const rawKey = `cxa_sa_live_${randomPart}`;
  const keyHash = hashMcpSecret(rawKey);
  const prefix = `cxa_sa_live_${randomPart.slice(0, 6)}...`;
  return { rawKey, keyHash, prefix };
}

export function generateOAuthAccessToken(): { rawToken: string; tokenHash: string } {
  const randomPart = crypto.randomBytes(32).toString("hex");
  const rawToken = `cxa_mcp_tok_${randomPart}`;
  const tokenHash = hashMcpSecret(rawToken);
  return { rawToken, tokenHash };
}

export async function resolveMcpAuthContext(
  req: Request,
  options?: { allowWebSession?: boolean }
): Promise<
  | { success: true; context: McpAuthContext }
  | { success: false; status: number; error: string; code: string }
> {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  let rawToken: string | null = null;

  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    rawToken = authHeader.slice(7).trim();
  } else {
    // Support ?apiKey= or ?token= for SSE EventSource connections that cannot set custom headers
    try {
      const url = new URL(req.url);
      const qToken = url.searchParams.get("apiKey") || url.searchParams.get("token");
      if (qToken) {
        rawToken = qToken.trim();
      }
    } catch {}
  }

  if (rawToken !== null) {
    if (!rawToken) {
      return {
        success: false,
        status: 401,
        code: "INVALID_TOKEN",
        error: "Bearer token cannot be empty.",
      };
    }

    const tokenHash = hashMcpSecret(rawToken);

    // Case A: Service Account Token (cxa_sa_live_...)
    if (rawToken.startsWith("cxa_sa_")) {
      const sa = await prisma.serviceAccount.findFirst({
        where: { apiKeyHash: tokenHash },
      });

      if (!sa) {
        return {
          success: false,
          status: 401,
          code: "INVALID_SERVICE_ACCOUNT",
          error: "Invalid or non-existent Service Account API key.",
        };
      }

      if (sa.status !== "ACTIVE") {
        return {
          success: false,
          status: 401,
          code: "KEY_REVOKED",
          error: "Service Account API key has been revoked or deactivated.",
        };
      }

      // Update lastUsedAt asynchronously
      prisma.serviceAccount
        .update({
          where: { id: sa.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});

      const scopes = Array.isArray(sa.scopes) ? (sa.scopes as string[]) : [];

      return {
        success: true,
        context: {
          clientId: sa.serviceId,
          clientName: sa.name,
          clientType: "SERVICE_ACCOUNT",
          scopes,
          allowedTools: ["*"],
          actingUser: {
            id: sa.serviceId,
            email: `${sa.serviceId}@service.codexa`,
            username: sa.serviceId,
            fullName: sa.name,
            role: sa.orgRole,
            orgRole: sa.orgRole,
            department: "Automation",
          },
          isServiceAccount: true,
          serviceId: sa.serviceId,
        },
      };
    }

    // Case B: OAuth Access Token (cxa_mcp_tok_...)
    if (rawToken.startsWith("cxa_mcp_tok_")) {
      const session = await prisma.mcpSession.findUnique({
        where: { sessionToken: tokenHash },
        include: { client: true },
      });

      if (!session || session.revokedAt || session.expiresAt < new Date()) {
        return {
          success: false,
          status: 401,
          code: "EXPIRED_OAUTH_TOKEN",
          error: "OAuth token is invalid, expired, or revoked.",
        };
      }

      const client = session.client;
      if (client.status !== "ACTIVE") {
        return {
          success: false,
          status: 401,
          code: "CLIENT_REVOKED",
          error: `MCP Client '${client.name}' is revoked or inactive.`,
        };
      }

      // Resolve user
      const user = session.userId
        ? await prisma.user.findUnique({ where: { id: session.userId } })
        : null;

      if (!user || !user.isActive) {
        return {
          success: false,
          status: 403,
          code: "USER_INACTIVE",
          error: "Associated CodeXa user account is disabled or missing.",
        };
      }

      const scopes = Array.isArray(session.scopes) ? (session.scopes as string[]) : [];
      const allowedTools = Array.isArray(client.allowedTools) ? (client.allowedTools as string[]) : ["*"];

      return {
        success: true,
        context: {
          clientId: client.clientId,
          clientName: client.name,
          clientType: client.clientType,
          scopes,
          allowedTools,
          actingUser: {
            id: user.id,
            email: user.email,
            username: user.username,
            fullName: user.fullName || user.username,
            role: user.orgRole || user.role,
            orgRole: user.orgRole || user.role,
            department: user.department,
          },
        },
      };
    }

    // Case C: Standard Client API Key (cxa_mcp_sk_live_...)
    const client = await prisma.mcpClient.findFirst({
      where: { clientSecretHash: tokenHash },
      include: { owner: true },
    });

    if (!client) {
      return {
        success: false,
        status: 401,
        code: "INVALID_MCP_KEY",
        error: "Invalid or non-existent CodeXa MCP API key.",
      };
    }

    if (client.status !== "ACTIVE") {
      return {
        success: false,
        status: 401,
        code: "KEY_REVOKED",
        error: "This MCP Client API key has been revoked or deactivated.",
      };
    }

    if (client.expiresAt && client.expiresAt < new Date()) {
      return {
        success: false,
        status: 401,
        code: "KEY_EXPIRED",
        error: "MCP Client API key has expired.",
      };
    }

    // Touch lastConnectedAt asynchronously
    prisma.mcpClient
      .update({
        where: { id: client.id },
        data: { lastConnectedAt: new Date() },
      })
      .catch(() => {});

    const scopes = Array.isArray(client.scopes) ? (client.scopes as string[]) : [];
    const allowedTools = Array.isArray(client.allowedTools) ? (client.allowedTools as string[]) : ["*"];

    const owner = client.owner;
    if (!owner || !owner.isActive) {
      return {
        success: false,
        status: 403,
        code: "OWNER_INACTIVE",
        error: "The owner account associated with this MCP Client is inactive or missing.",
      };
    }

    return {
      success: true,
      context: {
        clientId: client.clientId,
        clientName: client.name,
        clientType: client.clientType,
        scopes,
        allowedTools,
        actingUser: {
          id: owner.id,
          email: owner.email,
          username: owner.username,
          fullName: owner.fullName || owner.username,
          role: owner.orgRole || owner.role,
          orgRole: owner.orgRole || owner.role,
          department: owner.department,
        },
      },
    };
  }

  // Case D: Optional Fallback to active CodeXa Web Session (only if explicitly enabled)
  if (options?.allowWebSession) {
    const sessionResult = await getCurrentSessionResult();
    if (sessionResult.status === "authenticated" && sessionResult.user && sessionResult.user.isActive) {
      const u = sessionResult.user;
      return {
        success: true,
        context: {
          clientId: "codexa_web_portal",
          clientName: "CodeXa Web Portal",
          clientType: "INTERNAL_WEB",
          scopes: ["*"],
          allowedTools: ["*"],
          actingUser: {
            id: u.id,
            email: u.email || "",
            username: u.username || "",
            fullName: u.displayName || u.username,
            role: u.orgRole || u.role,
            orgRole: u.orgRole || u.role,
            department: (u as any).department || null,
          },
        },
      };
    }
  }

  return {
    success: false,
    status: 401,
    code: "AUTH_REQUIRED",
    error: "Authentication required. Provide 'Authorization: Bearer <key>'.",
  };
}
