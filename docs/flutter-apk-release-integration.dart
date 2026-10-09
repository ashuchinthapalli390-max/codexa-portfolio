// ==============================================================================
// CODEXA AGENCY — FLUTTER ANDROID APK RELEASE & UPDATE INTEGRATION SERVICE
// Compatible with CodeXa Core API: https://codxa-agency.online
// ==============================================================================
// Dependencies required in pubspec.yaml:
//   http: ^1.2.0
//   package_info_plus: ^8.0.0
//   path_provider: ^2.1.0
//   crypto: ^3.0.3
//   open_filex: ^4.4.0 (or url_launcher / android intent)
//   file_picker: ^8.0.0 (for Admin APK upload tool)
// ==============================================================================

import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';

class CodeXaUpdateModel {
  final bool ok;
  final String platform;
  final int currentInstalledVersionCode;
  final String latestVersion;
  final int latestVersionCode;
  final int minimumSupportedVersionCode;
  final bool updateAvailable;
  final bool forceUpdate;
  final String releaseNotes;
  final String downloadUrl;
  final String sha256;
  final int fileSizeBytes;

  CodeXaUpdateModel({
    required this.ok,
    required this.platform,
    required this.currentInstalledVersionCode,
    required this.latestVersion,
    required this.latestVersionCode,
    required this.minimumSupportedVersionCode,
    required this.updateAvailable,
    required this.forceUpdate,
    required this.releaseNotes,
    required this.downloadUrl,
    required this.sha256,
    required this.fileSizeBytes,
  });

  factory CodeXaUpdateModel.fromJson(Map<String, dynamic> json) {
    final app = json['app'] ?? {};
    return CodeXaUpdateModel(
      ok: json['ok'] == true,
      platform: app['platform'] ?? 'android',
      currentInstalledVersionCode: app['currentInstalledVersionCode'] ?? 0,
      latestVersion: app['latestVersion'] ?? '1.0.0',
      latestVersionCode: app['latestVersionCode'] ?? 1,
      minimumSupportedVersionCode: app['minimumSupportedVersionCode'] ?? 1,
      updateAvailable: app['updateAvailable'] == true,
      forceUpdate: app['forceUpdate'] == true,
      releaseNotes: app['releaseNotes'] ?? '',
      downloadUrl: app['downloadUrl'] ?? '',
      sha256: app['sha256'] ?? '',
      fileSizeBytes: app['fileSizeBytes'] ?? 0,
    );
  }
}

class CodeXaUpdateService {
  static const String baseUrl = 'https://codxa-agency.online';

  /// Checks CodeXa Core for available updates by comparing installed build number
  /// with authoritative published release in PostgreSQL database.
  static Future<CodeXaUpdateModel?> checkForUpdates({
    String? sessionToken,
    String? deviceId,
  }) async {
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      final currentCode = int.tryParse(packageInfo.buildNumber) ?? 1;
      final currentName = packageInfo.version;

      final uri = Uri.parse(
        '$baseUrl/api/mobile/app-update?platform=android&versionCode=$currentCode&versionName=$currentName',
      );

      final headers = {
        'Accept': 'application/json',
        'x-platform': 'ANDROID',
        'x-app-version-code': currentCode.toString(),
        'x-app-version': currentName,
        if (deviceId != null) 'x-device-id': deviceId,
        if (sessionToken != null) 'Authorization': 'Bearer $sessionToken',
      };

      final response = await http.get(uri, headers: headers);
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['ok'] == true) {
          return CodeXaUpdateModel.fromJson(data);
        }
      }
    } catch (e) {
      debugPrint('[CodeXaUpdateService] Check failed: $e');
    }
    return null;
  }

  /// Downloads APK with real bytes transferred progress, verifies SHA-256 hash,
  /// and initiates standard Android Package Installer with user permission.
  static Future<void> downloadAndInstallApk({
    required BuildContext context,
    required CodeXaUpdateModel update,
    String? deviceId,
    required Function(double progress, String status) onProgress,
  }) async {
    try {
      onProgress(0.0, 'Initiating download...');

      // 1. Report download start telemetry
      _reportTelemetry(
        eventType: 'DOWNLOAD_START',
        versionCode: update.latestVersionCode,
        deviceId: deviceId,
      );

      final client = http.Client();
      final request = http.Request('GET', Uri.parse(update.downloadUrl));
      final response = await client.send(request);

      if (response.statusCode != 200 && response.statusCode != 302) {
        throw Exception('Download failed with status: ${response.statusCode}');
      }

      final totalBytes = response.contentLength ?? update.fileSizeBytes;
      int receivedBytes = 0;

      final tempDir = await getTemporaryDirectory();
      final apkFile = File('${tempDir.path}/codexa_update_${update.latestVersionCode}.apk');
      if (await apkFile.exists()) {
        await apkFile.delete();
      }

      final sink = apkFile.openWrite();

      await response.stream.listen((chunk) {
        sink.add(chunk);
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          final progress = receivedBytes / totalBytes;
          onProgress(progress, '${(receivedBytes / (1024 * 1024)).toStringAsFixed(1)} MB / ${(totalBytes / (1024 * 1024)).toStringAsFixed(1)} MB');
        }
      }).asFuture();

      await sink.flush();
      await sink.close();

      onProgress(0.98, 'Verifying cryptographic integrity...');

      // 2. Cryptographic SHA-256 verification
      if (update.sha256.isNotEmpty) {
        final bytes = await apkFile.readAsBytes();
        final computedDigest = sha256.convert(bytes).toString();

        if (computedDigest.toLowerCase() != update.sha256.toLowerCase()) {
          await apkFile.delete();
          _reportTelemetry(
            eventType: 'DOWNLOAD_FAILED',
            versionCode: update.latestVersionCode,
            deviceId: deviceId,
            metadata: {'error': 'SHA-256 mismatch'},
          );
          throw Exception('APK file integrity check failed. SHA-256 does not match server release.');
        }
      }

      onProgress(1.0, 'Ready to install!');

      // 3. Report download complete
      _reportTelemetry(
        eventType: 'DOWNLOAD_COMPLETE',
        versionCode: update.latestVersionCode,
        deviceId: deviceId,
      );

      // 4. Prompt standard Android installation intent with user approval
      final openResult = await OpenFilex.open(
        apkFile.path,
        type: 'application/vnd.android.package-archive',
      );

      if (openResult.type != ResultType.done) {
        debugPrint('[CodeXaUpdateService] OpenFilex error: ${openResult.message}');
      }
    } catch (e) {
      onProgress(0.0, 'Error: $e');
      rethrow;
    }
  }

  /// Displays the official CodeXa Update Dialog (Optional or Mandatory)
  static void showUpdateDialog({
    required BuildContext context,
    required CodeXaUpdateModel update,
    String? deviceId,
  }) {
    showDialog(
      context: context,
      barrierDismissible: !update.forceUpdate, // Mandatory update cannot be dismissed
      builder: (BuildContext ctx) {
        double downloadProgress = 0.0;
        String downloadStatus = '';
        bool isDownloading = false;

        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: const Color(0xFF171717),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
                side: BorderSide(
                  color: update.forceUpdate ? const Color(0xFFE50914) : const Color(0xFF262626),
                  width: 1.5,
                ),
              ),
              title: Row(
                children: [
                  Icon(
                    update.forceUpdate ? Icons.warning_amber_rounded : Icons.system_update_rounded,
                    color: update.forceUpdate ? const Color(0xFFE50914) : const Color(0xFF10B981),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    update.forceUpdate ? 'Update Required' : 'New Update Available',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'CodeXa v${update.latestVersion} (Build ${update.latestVersionCode}) is now available.',
                    style: const TextStyle(color: Color(0xFFD4D4D4), fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  if (update.releaseNotes.isNotEmpty) ...[
                    const Text(
                      "What's New:",
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0A0A),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.Border.all(color: const Color(0xFF262626)),
                      ),
                      child: Text(
                        update.releaseNotes,
                        style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 11),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                  if (isDownloading) ...[
                    LinearProgressIndicator(
                      value: downloadProgress > 0 ? downloadProgress : null,
                      backgroundColor: const Color(0xFF262626),
                      valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFE50914)),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      downloadStatus,
                      style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 11, fontFamily: 'monospace'),
                    ),
                  ],
                ],
              ),
              actions: isDownloading
                  ? []
                  : [
                      if (!update.forceUpdate)
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          child: const Text('Later', style: TextStyle(color: Color(0xFFA3A3A3))),
                        ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE50914),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () async {
                          setState(() {
                            isDownloading = true;
                          });
                          try {
                            await downloadAndInstallApk(
                              context: context,
                              update: update,
                              deviceId: deviceId,
                              onProgress: (prog, status) {
                                setState(() {
                                  downloadProgress = prog;
                                  downloadStatus = status;
                                });
                              },
                            );
                          } catch (err) {
                            setState(() {
                              isDownloading = false;
                              downloadStatus = 'Failed: $err';
                            });
                          }
                        },
                        child: const Text('UPDATE NOW', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
            );
          },
        );
      },
    );
  }

  static void _reportTelemetry({
    required String eventType,
    required int versionCode,
    String? deviceId,
    Map<String, dynamic>? metadata,
  }) {
    try {
      final uri = Uri.parse('$baseUrl/api/mobile/app-update/events');
      http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'eventType': eventType,
          'versionCode': versionCode,
          'deviceId': deviceId,
          'metadata': metadata,
        }),
      ).catchError((_) {});
    } catch (_) {}
  }
}
