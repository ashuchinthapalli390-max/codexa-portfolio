/**
 * CodeXa Cyber Dark Branded Email Templates
 */

export function renderEmailLayout({
  badge,
  title,
  subtitle,
  contentHtml,
  warningText,
}: {
  badge?: string;
  title: string;
  subtitle?: string;
  contentHtml: string;
  warningText?: string;
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070707; color: #FFFFFF; margin: 0; padding: 24px; }
          .container { max-width: 560px; margin: 0 auto; background: #0C0C0C; border: 1px solid rgba(217, 4, 41, 0.3); border-radius: 18px; padding: 36px; box-shadow: 0 0 35px rgba(217, 4, 41, 0.15); }
          .logo { font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #FFFFFF; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
          .logo span { color: #D90429; font-size: 13px; font-weight: normal; }
          .badge { display: inline-block; background: rgba(217, 4, 41, 0.15); border: 1px solid rgba(217, 4, 41, 0.4); color: #EF233C; font-size: 10px; font-weight: bold; letter-spacing: 0.2em; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; margin-bottom: 18px; }
          .title { font-size: 24px; font-weight: 800; color: #FFFFFF; margin: 0 0 8px 0; text-align: center; letter-spacing: -0.02em; }
          .subtitle { font-size: 13px; color: #A5A5A5; line-height: 1.5; margin-bottom: 28px; text-align: center; }
          .card-box { background: #111111; border: 1px solid #222222; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .btn { display: inline-block; background: #D90429; color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 700; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; margin: 20px 0; }
          .warning { font-size: 11px; color: #777777; line-height: 1.5; text-align: center; margin-top: 28px; border-top: 1px solid #1C1C1C; padding-top: 18px; }
          .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #555555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">CODEXA <span>AGENCY</span></div>
          ${badge ? `<div style="text-align: center;"><div class="badge">${badge}</div></div>` : ""}
          <h1 class="title">${title}</h1>
          ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ""}
          
          ${contentHtml}

          ${
            warningText
              ? `<div class="warning">${warningText}</div>`
              : `<div class="warning">This is an automated security transmission from CodeXa Agency. If you did not initiate this action, please secure your account immediately.</div>`
          }
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} CodeXa Agency. All rights reserved. &bull; Enterprise Developer Platform
        </div>
      </body>
    </html>
  `;
}
