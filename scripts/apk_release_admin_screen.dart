// ==============================================================================
// CODEXA AGENCY — FLUTTER ADMIN APK RELEASE UPLOAD SCREEN
// Location in App: Mobile App → Admin Tools → APK Releases → Upload APK
// ==============================================================================
// Security Architecture:
// - Access restricted to FOUNDER and CO_FOUNDER roles only (enforced server-side)
// - Uses device file picker to select APK (never auto-extracts installed app)
// - Directly uploads to persistent cloud storage via authorized pre-signed URL
// - CodeXa Core validates binary, Dalvik bytecode, and signatures before saving
// ==============================================================================

import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:file_picker/file_picker.dart';

class CodeXaAdminApkUploadScreen extends StatefulWidget {
  final String sessionToken;
  final String userRole; // "FOUNDER" | "CO_FOUNDER" | other
  final String baseUrl;

  const CodeXaAdminApkUploadScreen({
    Key? key,
    required this.sessionToken,
    required this.userRole,
    this.baseUrl = 'https://codxa-agency.online',
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
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['apk'],
      );

      if (result != null && result.files.single.path != null) {
        final file = File(result.files.single.path!);
        final size = await file.length();
        setState(() {
          _selectedFile = file;
          _selectedFileName = result.files.single.name;
          _selectedFileSize = size;
          _errorMessage = null;
          _successMessage = null;
        });

        // Auto-detect version name from filename (e.g., codexa-1.0.5.apk)
        final match = RegExp(r'(\d+\.\d+(?:\.\d+)?)').firstMatch(_selectedFileName);
        if (match != null && _versionNameController.text.isEmpty) {
          _versionNameController.text = match.group(1)!;
        }
      }
    } catch (e) {
      setState(() => _errorMessage = 'Failed to pick file: $e');
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
      _statusText = 'Requesting upload authorization...';
      _errorMessage = null;
      _successMessage = null;
    });

    try {
      // 1. Authorize on CodeXa Core
      final sessionUri = Uri.parse('${widget.baseUrl}/api/admin/mobile/releases/upload-session');
      final sessionRes = await http.post(
        sessionUri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.sessionToken}',
        },
        body: jsonEncode({
          'channel': _releaseChannel,
          'versionName': vName,
          'versionCode': vCode,
          'fileName': _selectedFileName,
          'fileSize': _selectedFileSize,
        }),
      );

      if (sessionRes.statusCode == 401 || sessionRes.statusCode == 403) {
        throw Exception('Forbidden. Only Founder and Co-Founder can upload APK releases.');
      }

      if (sessionRes.statusCode != 200) {
        final err = jsonDecode(sessionRes.body);
        throw Exception(err['error'] ?? 'Upload session request failed.');
      }

      final sessionData = jsonDecode(sessionRes.body)['session'];
      final String signedUploadUrl = sessionData['signedUploadUrl'];
      final String storageBucket = sessionData['bucket'];
      final String storageKey = sessionData['storageKey'];
      final String publicDownloadUrl = sessionData['publicDownloadUrl'];

      setState(() {
        _statusText = 'Transferring APK to cloud storage...';
        _uploadProgress = 0.1;
      });

      // 2. Direct PUT to Cloud Storage
      final fileLength = _selectedFileSize;
      final fileBytes = await _selectedFile!.readAsBytes();

      final putRes = await http.put(
        Uri.parse(signedUploadUrl),
        headers: {
          'Content-Type': 'application/vnd.android.package-archive',
        },
        body: fileBytes,
      );

      if (putRes.statusCode < 200 || putRes.statusCode >= 300) {
        throw Exception('Cloud storage rejected upload: ${putRes.statusCode}');
      }

      setState(() {
        _statusText = 'Validating APK structure & cryptographic signatures...';
        _uploadProgress = 0.95;
      });

      // 3. Complete and Validate on CodeXa Core
      final completeUri = Uri.parse('${widget.baseUrl}/api/admin/mobile/releases/complete-upload');
      final completeRes = await http.post(
        completeUri,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${widget.sessionToken}',
        },
        body: jsonEncode({
          'storageBucket': storageBucket,
          'storageKey': storageKey,
          'downloadUrl': publicDownloadUrl,
          'versionName': vName,
          'versionCode': vCode,
          'releaseChannel': _releaseChannel,
          'releaseNotes': _releaseNotesController.text.trim(),
          'updateType': _updateType,
          'minSupportedVersionCode': minCode,
          'publishImmediately': _publishImmediately,
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

            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              activeColor: const Color(0xFFE50914),
              title: const Text('Publish Immediately', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
              subtitle: const Text('If off, release will be uploaded and saved as DRAFT', style: TextStyle(color: Color(0xFFA3A3A3), fontSize: 11)),
              value: _publishImmediately,
              onChanged: _isUploading ? null : (v) => setState(() => _publishImmediately = v),
            ),

            const SizedBox(height: 16),

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
