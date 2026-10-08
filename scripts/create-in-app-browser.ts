import fs from "fs";

const content = `import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Secure In-App Browser that renders web pages inside CodeXa by default
class CxInAppBrowser {
  static Future<void> openUrl(BuildContext context, String rawUrl) async {
    final clean = rawUrl.trim();
    if (clean.isEmpty) return;

    final uri = Uri.tryParse(clean.startsWith('http') ? clean : 'https://$clean');
    if (uri == null) return;

    try {
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.inAppBrowserView,
      );
      if (!launched) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {
      try {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } catch (_) {}
    }
  }
}
`;

fs.writeFileSync("G:/AntiGravity IDE/codexa app/lib/core/widgets/cx_in_app_browser.dart", content, "utf8");
console.log("Created cx_in_app_browser.dart successfully!");
