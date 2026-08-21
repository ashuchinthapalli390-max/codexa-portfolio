import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isPrivateIpOrHost(hostname: string): boolean {
  const clean = hostname.toLowerCase().trim();
  if (
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "0.0.0.0" ||
    clean === "::1" ||
    clean.endsWith(".local") ||
    clean.endsWith(".internal")
  ) {
    return true;
  }

  // Check IPv4 private ranges
  const ipParts = clean.split(".").map(Number);
  if (ipParts.length === 4 && !ipParts.some(isNaN)) {
    const [a, b] = ipParts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local)
    if (a === 127) return true; // 127.0.0.0/8
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ success: false, error: "Valid URL is required." }, { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: "Malformed URL format." }, { status: 400 });
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return NextResponse.json({ success: false, error: "Only HTTP and HTTPS URLs are supported." }, { status: 400 });
    }

    if (isPrivateIpOrHost(parsed.hostname)) {
      return NextResponse.json({ success: false, error: "Access to private or local hostnames is restricted." }, { status: 403 });
    }

    // Fetch page metadata with 3s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    let html = "";
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CodeXaBot/1.0",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return NextResponse.json({
          success: true,
          preview: {
            url,
            domain: parsed.hostname,
            title: parsed.hostname,
            description: "Shared link on CodeXa Team Core.",
          },
        });
      }

      html = await res.text();
    } catch {
      clearTimeout(timeoutId);
      return NextResponse.json({
        success: true,
        preview: {
          url,
          domain: parsed.hostname,
          title: parsed.hostname,
          description: "Shared link on CodeXa Team Core.",
        },
      });
    }

    // Extract OpenGraph tags or fallbacks
    const titleMatch =
      html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title>(.*?)<\/title>/i);
    const descMatch =
      html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i);
    const imgMatch =
      html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);
    const siteNameMatch =
      html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);

    const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;
    const description = descMatch ? descMatch[1].trim() : `External link to ${parsed.hostname}`;
    let image = imgMatch ? imgMatch[1].trim() : undefined;

    if (image && !image.startsWith("http://") && !image.startsWith("https://")) {
      try {
        image = new URL(image, url).toString();
      } catch {
        image = undefined;
      }
    }

    return NextResponse.json({
      success: true,
      preview: {
        url,
        domain: siteNameMatch ? siteNameMatch[1].trim() : parsed.hostname,
        title: title.length > 100 ? `${title.substring(0, 97)}...` : title,
        description: description.length > 200 ? `${description.substring(0, 197)}...` : description,
        image,
      },
    });
  } catch (err: any) {
    console.error("[POST /api/feed/link-preview] Error:", err);
    return NextResponse.json({ success: false, error: "Failed to generate link preview." }, { status: 500 });
  }
}
