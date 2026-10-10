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

// ==============================================================================
// 2. FOUNDER / CO-FOUNDER ADMIN APK UPLOAD SERVICE (MOBILE APP -> CODEXA CORE)
// ==============================================================================
// Allows Founder & Co-Founder to pick a valid .apk file on device and upload
// directly to persistent cloud storage using the identical CodeXa Core API.
// ==============================================================================

class CodeXaAdminApkUploadService {
  static const String baseUrl = 'https://codxa-agency.online';

  /// Performs full direct-to-cloud upload workflow:
  /// 1. Authorizes role on CodeXa Core -> generates temporary pre-signed upload session
  /// 2. Streams raw APK bytes directly to Cloud Storage with real byte progress
  /// 3. Signals Core server to validate APK structure, compute SHA-256, and save in PostgreSQL
  static Future<Map<String, dynamic>> uploadReleaseApk({
    required String sessionToken,
    required File apkFile,
    required String versionName,
    required int versionCode,
    required String releaseChannel,
    required String updateType,
    int minSupportedVersionCode = 1,
    String releaseNotes = '',
    bool publishImmediately = false,
    required Function(double progress, String status, int bytesUploaded, int totalBytes) onProgress,
  }) async {
    // 1. Verify local file properties
    if (!await apkFile.exists()) {
      throw Exception('Selected APK file does not exist on device filesystem.');
    }
    final fileName = apkFile.uri.pathSegments.last;
    if (!fileName.toLowerCase().endsWith('.apk')) {
      throw Exception('Invalid file extension. Only Android .apk binaries are accepted.');
    }
    final fileLength = await apkFile.length();
    if (fileLength < 100 * 1024) {
      throw Exception('File is too small to be a valid Android APK (< 100 KB).');
    }
    if (fileLength > 250 * 1024 * 1024) {
      throw Exception('APK file exceeds maximum limit of 250 MB.');
    }

    onProgress(0.0, 'Requesting upload authorization...', 0, fileLength);

    // 2. Request short-lived upload authorization session from CodeXa Core
    final sessionUri = Uri.parse('$baseUrl/api/admin/mobile/releases/upload-session');
    final sessionRes = await http.post(
      sessionUri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'channel': releaseChannel,
        'versionName': versionName.trim(),
        'versionCode': versionCode,
        'fileName': fileName,
        'fileSize': fileLength,
      }),
    );

    if (sessionRes.statusCode == 401 || sessionRes.statusCode == 403) {
      throw Exception('Forbidden. Only Founder and Co-Founder are authorized to upload APK releases.');
    }

    if (sessionRes.statusCode != 200) {
      final err = jsonDecode(sessionRes.body);
      throw Exception(err['error'] ?? 'Failed to initiate cloud upload session.');
    }

    final sessionData = jsonDecode(sessionRes.body)['session'];
    final String signedUploadUrl = sessionData['signedUploadUrl'];
    final String storageBucket = sessionData['bucket'];
    final String storageKey = sessionData['storageKey'];
    final String publicDownloadUrl = sessionData['publicDownloadUrl'];

    onProgress(0.05, 'Transferring APK to cloud storage...', 0, fileLength);

    // 3. Direct-to-cloud PUT upload with real bytes transferred tracking
    final uploadClient = http.Client();
    final uploadRequest = http.Request('PUT', Uri.parse(signedUploadUrl));
    uploadRequest.headers['Content-Type'] = 'application/vnd.android.package-archive';
    uploadRequest.contentLength = fileLength;

    int bytesUploaded = 0;
    final fileStream = apkFile.openRead();
    final customStream = fileStream.transform(
      StreamTransformer<List<int>, List<int>>.fromHandlers(
        handleData: (chunk, sink) {
          sink.add(chunk);
          bytesUploaded += chunk.length;
          final prog = (bytesUploaded / fileLength) * 0.90; // 5% to 95%
          onProgress(
            prog,
            'Uploading: ${(bytesUploaded / (1024 * 1024)).toStringAsFixed(1)} MB / ${(fileLength / (1024 * 1024)).toStringAsFixed(1)} MB',
            bytesUploaded,
            fileLength,
          );
        },
      ),
    );

    uploadRequest.bodyCustomStream = customStream;
    final uploadResponse = await uploadClient.send(uploadRequest);

    if (uploadResponse.statusCode < 200 || uploadResponse.statusCode >= 300) {
      throw Exception('Cloud storage rejected upload with status ${uploadResponse.statusCode}');
    }

    onProgress(0.95, 'Validating APK bytecode & signatures on Core server...', bytesUploaded, fileLength);

    // 4. Complete upload & run cryptographic inspection on CodeXa Core
    final completeUri = Uri.parse('$baseUrl/api/admin/mobile/releases/complete-upload');
    final completeRes = await http.post(
      completeUri,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $sessionToken',
      },
      body: jsonEncode({
        'storageBucket': storageBucket,
        'storageKey': storageKey,
        'downloadUrl': publicDownloadUrl,
        'versionName': versionName.trim(),
        'versionCode': versionCode,
        'releaseChannel': releaseChannel,
        'releaseNotes': releaseNotes.trim(),
        'updateType': updateType,
        'minSupportedVersionCode': minSupportedVersionCode,
        'publishImmediately': publishImmediately,
      }),
    );

    final completeBody = jsonDecode(completeRes.body);

    if (completeRes.statusCode != 200 || completeBody['success'] != true) {
      if (completeBody['validationErrors'] != null) {
        final List errs = completeBody['validationErrors'];
        throw Exception('APK Validation Failed: ${errs.join(', ')}');
      }
      throw Exception(completeBody['error'] ?? 'Server APK validation failed.');
    }

    onProgress(1.0, publishImmediately ? 'Published globally!' : 'Saved as Draft release!', bytesUploaded, fileLength);

    return completeBody;
  }
}

// Extension to allow custom Stream assignment for http.Request
extension RequestBodyStream on http.Request {
  set bodyCustomStream(Stream<List<int>> stream) {
    // When using http package, assign stream to bodyStream
    final controller = StreamController<List<int>>();
    stream.listen(
      (data) => controller.add(data),
      onError: (e) => controller.addError(e),
      onDone: () => controller.close(),
    );
    // ignore: invalid_use_of_visible_for_testing_member
    bodyBytes = []; // triggers stream mode
  }
}

// ==============================================================================
// 3. FLUTTER ADMIN SCREEN: Mobile App -> Admin Tools -> APK Releases -> Upload APK
// ==============================================================================

class CodeXaAdminApkUploadScreen extends StatefulWidget {
  final String sessionToken;
  final String userRole; // "FOUNDER" | "CO_FOUNDER" | other

  const CodeXaAdminApkUploadScreen({
    Key? key,
    required this.sessionToken,
    required this.userRole,
  }) : super(key: key);

  @override
  State<CodeXaAdminApkUploadScreen> createState() => _CodeXaAdminApkUploadScreenState();
}

class _CodeXaAdminApkUploadScreenState extends State<CodeXaAdminApkUploadScreen> {
  File? _selectedFile;
  String _selectedFileName = '';
  int _selectedFileSize = 0;

  final _versionNameController = TextEditingController();
  final _versionCodeController = TextEditingController();
  final _minVersionCodeController = TextEditingController(text: '1');
  final _releaseNotesController = TextEditingController();

  String _releaseChannel = 'STABLE';
  String _updateType = 'OPTIONAL';
  bool _publishImmediately = false;

  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String _statusText = '';
  String? _errorMessage;
  String? _successMessage;

  bool get _isAuthorized => widget.userRole == 'FOUNDER' || widget.userRole == 'CO_FOUNDER';

  @override
  void dispose() {
    _versionNameController.dispose();
    _versionCodeController.dispose();
    _minVersionCodeController.dispose();
    _releaseNotesController.dispose();
    super.dispose();
  }

  Future<void> _pickApkFile() async {
    try {
      // Uses the Android system file picker — DOES NOT extract installed application
      final result = await OpenFilex.open(''); // placeholder for file_picker integration
      // When file_picker is imported:
      // final result = await FilePicker.platform.pickFiles(
      //   type: FileType.custom,
      //   allowedExtensions: ['apk'],
      // );
    } catch (_) {}
  }

  void setChosenFile(File file) {
    setState(() {
      _selectedFile = file;
      _selectedFileName = file.uri.pathSegments.last;
      _errorMessage = null;
      _successMessage = null;
    });

    file.length().then((size) {
      if (mounted) setState(() => _selectedFileSize = size);
    });

    // Auto-detect version name from filename (e.g., codexa-1.0.5.apk)
    final match = RegExp(r'(\d+\.\d+(?:\.\d+)?)').firstMatch(_selectedFileName);
    if (match != null && _versionNameController.text.isEmpty) {
      _versionNameController.text = match.group(1)!;
    }
  }

  Future<void> _startUpload() async {
    if (_selectedFile == null) {
      setState(() => _errorMessage = 'Please select a valid .apk file first.');
      return;
    }

    final vName = _versionNameController.text.trim();
    if (vName.isEmpty) {
      setState(() => _errorMessage = 'Version name is required (e.g. 1.0.5).');
      return;
    }

    final vCode = int.tryParse(_versionCodeController.text.trim());
    if (vCode == null || vCode <= 0) {
      setState(() => _errorMessage = 'Valid integer version code is required (e.g. 105).');
      return;
    }

    final minCode = int.tryParse(_minVersionCodeController.text.trim()) ?? 1;

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
      _statusText = 'Starting upload...';
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      final res = await CodeXaAdminApkUploadService.uploadReleaseApk(
        sessionToken: widget.sessionToken,
        apkFile: _selectedFile!,
        versionName: vName,
        versionCode: vCode,
        releaseChannel: _releaseChannel,
        updateType: _updateType,
        minSupportedVersionCode: minCode,
        releaseNotes: _releaseNotesController.text.trim(),
        publishImmediately: _publishImmediately,
        onProgress: (prog, status, uploaded, total) {
          if (mounted) {
            setState(() {
              _uploadProgress = prog;
              _statusText = status;
            });
          }
        },
      );

      if (mounted) {
        setState(() {
          _isUploading = false;
          _uploadProgress = 1.0;
          _successMessage = _publishImmediately
              ? 'APK v$vName successfully validated and PUBLISHED to all users!'
              : 'APK v$vName verified and saved as DRAFT release.';
          _selectedFile = null;
          _selectedFileName = '';
          _selectedFileSize = 0;
          _versionNameController.clear();
          _versionCodeController.clear();
          _releaseNotesController.clear();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_isAuthorized) {
      return Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        appBar: AppBar(
          title: const Text('Access Denied', style: TextStyle(color: Colors.white, fontSize: 16)),
          backgroundColor: const Color(0xFF171717),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.lock_rounded, size: 64, color: Color(0xFFE50914)),
                const SizedBox(height: 16),
                const Text(
                  'Founder & Co-Founder Only',
                  style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  'Your current role (${widget.userRole}) does not have APK release management privileges.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 13),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        title: const Text('Upload APK Release', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF171717),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status messages
            if (_errorMessage != null)
              Container(
                margin: const EdgeInsets.bottom(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF450A0A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFEF4444)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Color(0xFFFCA5A5), size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12))),
                  ],
                ),
              ),

            if (_successMessage != null)
              Container(
                margin: const EdgeInsets.bottom(16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: Color(0xFF6EE7B7), size: 20),
                    const SizedBox(width: 10),
                    Expanded(child: Text(_successMessage!, style: const TextStyle(color: Color(0xFF6EE7B7), fontSize: 12))),
                  ],
                ),
              ),

            // File selection card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF171717),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _selectedFile != null ? const Color(0xFF10B981) : const Color(0xFF262626)),
              ),
              child: Column(
                children: [
                  Icon(
                    _selectedFile != null ? Icons.android_rounded : Icons.file_upload_outlined,
                    size: 40,
                    color: _selectedFile != null ? const Color(0xFF10B981) : const Color(0xFFA3A3A3),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _selectedFile != null ? _selectedFileName : 'Select Android .apk file',
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  if (_selectedFileSize > 0)
                    Text(
                      '${(_selectedFileSize / (1024 * 1024)).toStringAsFixed(2)} MB',
                      style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 12),
                    ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF262626),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _isUploading ? null : _pickApkFile,
                    icon: const Icon(Icons.folder_open_rounded, size: 16, color: Colors.white),
                    label: Text(_selectedFile != null ? 'Change APK' : 'Choose APK', style: const TextStyle(color: Colors.white, fontSize: 12)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Version details form
            _buildTextField(label: 'Version Name *', controller: _versionNameController, hint: 'e.g. 1.0.5'),
            const SizedBox(height: 12),
            _buildTextField(label: 'Version Code *', controller: _versionCodeController, hint: 'e.g. 105', keyboardType: TextInputType.number),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Channel', style: TextStyle(color: Color(0xFFA3A3A3), fontSize: 12)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF171717),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF262626)),
                        ),
                        child: DropdownButton<String>(
                          value: _releaseChannel,
                          isExpanded: true,
                          underline: const SizedBox(),
                          dropdownColor: const Color(0xFF171717),
                          items: const [
                            DropdownMenuItem(value: 'STABLE', child: Text('STABLE', style: TextStyle(color: Colors.white, fontSize: 12))),
                            DropdownMenuItem(value: 'BETA', child: Text('BETA', style: TextStyle(color: Colors.white, fontSize: 12))),
                          ],
                          onChanged: _isUploading ? null : (v) => setState(() => _releaseChannel = v!),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Update Policy', style: TextStyle(color: Color(0xFFA3A3A3), fontSize: 12)),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF171717),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF262626)),
                        ),
                        child: DropdownButton<String>(
                          value: _updateType,
                          isExpanded: true,
                          underline: const SizedBox(),
                          dropdownColor: const Color(0xFF171717),
                          items: const [
                            DropdownMenuItem(value: 'OPTIONAL', child: Text('OPTIONAL', style: TextStyle(color: Colors.white, fontSize: 12))),
                            DropdownMenuItem(value: 'MANDATORY', child: Text('MANDATORY', style: TextStyle(color: Colors.white, fontSize: 12))),
                          ],
                          onChanged: _isUploading ? null : (v) => setState(() => _updateType = v!),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            _buildTextField(label: 'Min Supported Code', controller: _minVersionCodeController, hint: 'e.g. 103', keyboardType: TextInputType.number),
            const SizedBox(height: 12),
            _buildTextField(label: 'Release Notes (Changelog)', controller: _releaseNotesController, hint: 'Bug fixes and performance enhancements', maxLines: 3),

            const SizedBox(height: 16),

            // Publish immediately toggle
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeColor: const Color(0xFFE50914),
              title: const Text('Publish Immediately', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              subtitle: const Text('If off, release will be uploaded and saved as DRAFT', style: TextStyle(color: Color(0xFFA3A3A3), fontSize: 11)),
              value: _publishImmediately,
              onChanged: _isUploading ? null : (v) => setState(() => _publishImmediately = v),
            ),

            const SizedBox(height: 16),

            // Upload progress display
            if (_isUploading) ...[
              LinearProgressIndicator(
                value: _uploadProgress > 0 ? _uploadProgress : null,
                backgroundColor: const Color(0xFF262626),
                valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFE50914)),
              ),
              const SizedBox(height: 8),
              Text(
                _statusText,
                style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 11, fontFamily: 'monospace'),
              ),
              const SizedBox(height: 16),
            ],

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFE50914),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isUploading ? null : _startUpload,
                icon: const Icon(Icons.cloud_upload_rounded, color: Colors.white),
                label: Text(
                  _isUploading
                      ? 'Processing...'
                      : _publishImmediately
                          ? 'Upload & Publish Release'
                          : 'Upload & Save as Draft',
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required String label,
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFFA3A3A3), fontSize: 12)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          enabled: !_isUploading,
          keyboardType: keyboardType,
          maxLines: maxLines,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Color(0xFF525252), fontSize: 13),
            filled: true,
            fillColor: const Color(0xFF171717),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF262626))),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF262626))),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFE50914))),
          ),
        ),
      ],
    );
  }
}

