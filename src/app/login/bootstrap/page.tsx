"use client";
/**
 * /login/bootstrap — Secure Owner Bootstrap UI
 *
 * This page is used ONCE to create the Owner account + Access Key in a fresh
 * production database. After bootstrap completes successfully, the endpoint
 * locks itself (no second key can be created via this route if an active Owner
 * key already exists).
 *
 * The generated raw access key is displayed exactly once — copy it immediately.
 * Then use it on /login to start the normal two-step login flow.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

interface BootstrapResult {
  success: boolean;
  ownerEmail?: string;
  rawKey?: string;
  message?: string;
  error?: string;
}

export default function BootstrapPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim() || status === "loading") return;

    setStatus("loading");
    setResult(null);

    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      const data: BootstrapResult = await res.json();

      if (!res.ok || !data.success) {
        setResult(data);
        setStatus("error");
        return;
      }

      setResult(data);
      setStatus("done");
    } catch {
      setResult({ success: false, error: "Network error. Check your connection." });
      setStatus("error");
    }
  };

  const handleCopy = () => {
    if (result?.rawKey) {
      navigator.clipboard.writeText(result.rawKey).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Courier New', monospace",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          backgroundColor: "#111",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "2.5rem",
          boxShadow: "0 0 40px rgba(217,4,41,0.15)",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p
            style={{
              fontSize: "0.65rem",
              letterSpacing: "0.3em",
              color: "#D90429",
              textTransform: "uppercase",
              marginBottom: "0.5rem",
            }}
          >
            CodeXa Agency
          </p>
          <h1
            style={{
              fontSize: "1.2rem",
              fontWeight: "bold",
              color: "#fff",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Owner Bootstrap
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.5rem" }}>
            One-time production database setup
          </p>
        </div>

        {/* Warning banner */}
        <div
          style={{
            backgroundColor: "rgba(217,4,41,0.08)",
            border: "1px solid rgba(217,4,41,0.3)",
            borderRadius: "4px",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ fontSize: "0.72rem", color: "#e8a0a0", lineHeight: "1.5", margin: 0 }}>
            ⚠ This page is for initial production setup only. After use, the endpoint
            locks when an active Owner access key exists. Never share your bootstrap secret.
          </p>
        </div>

        {/* Success state */}
        {status === "done" && result?.rawKey && (
          <div>
            <div
              style={{
                backgroundColor: "rgba(0, 200, 100, 0.08)",
                border: "1px solid rgba(0, 200, 100, 0.3)",
                borderRadius: "4px",
                padding: "1rem",
                marginBottom: "1.5rem",
              }}
            >
              <p style={{ fontSize: "0.75rem", color: "#6edb8f", marginBottom: "0.75rem", fontWeight: "bold" }}>
                ✅ Bootstrap complete! Save your access key NOW — it will NOT be shown again.
              </p>
              <p style={{ fontSize: "0.7rem", color: "#888", marginBottom: "0.5rem" }}>
                Owner Email: <span style={{ color: "#ccc" }}>{result.ownerEmail}</span>
              </p>
            </div>

            {/* Raw key display */}
            <div
              style={{
                backgroundColor: "#0d0d0d",
                border: "2px solid #D90429",
                borderRadius: "6px",
                padding: "1.25rem",
                marginBottom: "1rem",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: "0.65rem", color: "#D90429", letterSpacing: "0.2em", marginBottom: "0.75rem", textTransform: "uppercase" }}>
                Your Owner Access Key
              </p>
              <code
                id="bootstrap-raw-key"
                style={{
                  display: "block",
                  fontSize: "1rem",
                  color: "#fff",
                  letterSpacing: "0.05em",
                  wordBreak: "break-all",
                  marginBottom: "1rem",
                  padding: "0.5rem",
                  backgroundColor: "#1a1a1a",
                  borderRadius: "4px",
                }}
              >
                {result.rawKey}
              </code>
              <button
                onClick={handleCopy}
                style={{
                  backgroundColor: copied ? "rgba(0,200,100,0.15)" : "rgba(217,4,41,0.15)",
                  border: `1px solid ${copied ? "rgba(0,200,100,0.5)" : "#D90429"}`,
                  borderRadius: "4px",
                  color: copied ? "#6edb8f" : "#D90429",
                  fontSize: "0.72rem",
                  fontFamily: "inherit",
                  letterSpacing: "0.15em",
                  padding: "0.5rem 1.25rem",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  transition: "all 0.2s ease",
                }}
              >
                {copied ? "✓ Copied!" : "Copy Key"}
              </button>
            </div>

            <button
              onClick={() => router.push("/login")}
              style={{
                width: "100%",
                backgroundColor: "#D90429",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "0.75rem",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Go to Login →
            </button>
          </div>
        )}

        {/* Form state */}
        {status !== "done" && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="bootstrap-secret"
                style={{
                  display: "block",
                  fontSize: "0.65rem",
                  color: "#888",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  marginBottom: "0.5rem",
                }}
              >
                Bootstrap Secret
              </label>
              <input
                id="bootstrap-secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Enter your BOOTSTRAP_SECRET"
                style={{
                  width: "100%",
                  backgroundColor: "#0d0d0d",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontFamily: "inherit",
                  padding: "0.65rem 0.85rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Error message */}
            {status === "error" && result?.error && (
              <div
                style={{
                  backgroundColor: "rgba(217,4,41,0.1)",
                  border: "1px solid rgba(217,4,41,0.4)",
                  borderRadius: "4px",
                  padding: "0.65rem 0.85rem",
                  marginBottom: "1rem",
                  fontSize: "0.75rem",
                  color: "#e8a0a0",
                }}
              >
                {result.error}
              </div>
            )}

            <button
              id="bootstrap-submit"
              type="submit"
              disabled={!secret.trim() || status === "loading"}
              style={{
                width: "100%",
                backgroundColor: status === "loading" ? "#333" : "#D90429",
                color: status === "loading" ? "#666" : "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "0.75rem",
                fontSize: "0.8rem",
                fontFamily: "inherit",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: status === "loading" || !secret.trim() ? "not-allowed" : "pointer",
                fontWeight: "bold",
                transition: "background-color 0.2s ease",
              }}
            >
              {status === "loading" ? "Bootstrapping..." : "Run Bootstrap"}
            </button>
          </form>
        )}

        <p
          style={{
            textAlign: "center",
            fontSize: "0.65rem",
            color: "#444",
            marginTop: "2rem",
          }}
        >
          After bootstrap, delete or disable BOOTSTRAP_SECRET from Vercel env variables.
        </p>
      </div>
    </div>
  );
}
