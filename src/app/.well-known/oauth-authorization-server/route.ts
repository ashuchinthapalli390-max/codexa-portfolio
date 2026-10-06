/**
 * /.well-known/oauth-authorization-server
 * RFC 8414 OAuth 2.0 Authorization Server Metadata
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;

  return NextResponse.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/dashboard/integrations/mcp`,
      token_endpoint: `${origin}/api/mcp/oauth/token`,
      jwks_uri: `${origin}/api/mcp/oauth/jwks`,
      response_types_supported: ["code", "token"],
      grant_types_supported: ["client_credentials", "authorization_code"],
      token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
      scopes_supported: [
        "users:read",
        "users:create",
        "employees:read",
        "interns:read",
        "projects:read",
        "projects:create",
        "attendance:read",
        "payments:read",
        "documents:read",
        "email:send",
        "analytics:read",
      ],
      service_documentation: `${origin}/dashboard/integrations/mcp`,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
}
