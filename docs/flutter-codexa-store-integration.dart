// ==============================================================================
// CODEXA AGENCY — OFFICIAL FLUTTER ANDROID APP: IN-APP CODEXA STORE & INTEGRATION
// ==============================================================================
// Backend Domain: https://codxa-agency.online
// Authoritative Catalog API: GET /api/mobile/store/catalog
// Platform: Android (Flutter 3.x / Dart 3.x)
// ==============================================================================
// Required dependencies in pubspec.yaml:
//   http: ^1.2.0
//   package_info_plus: ^8.0.0
//   path_provider: ^2.1.0
//   crypto: ^3.0.3
//   video_player: ^2.8.2
//   cached_network_image: ^3.3.1
//   open_filex: ^4.4.0
//   firebase_messaging: ^14.7.19
// ==============================================================================

import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'package:video_player/video_player.dart';

// ==============================================================================
// 1. DATA MODELS (Shared with Website Catalog Contract)
// ==============================================================================

class CodeXaStoreCatalog {
  final bool ok;
  final CodeXaAppMeta application;
  final CodeXaReleaseMeta release;
  final List<CodeXaScreenshot> screenshots;
  final List<CodeXaDemoVideo> videos;
  final List<CodeXaFeatureItem> features;
  final CodeXaAboutMeta about;
  final List<String> installationSteps;
  final List<CodeXaFaqItem> faq;

  CodeXaStoreCatalog({
    required this.ok,
    required this.application,
    required this.release,
    required this.screenshots,
    required this.videos,
    required this.features,
    required this.about,
    required this.installationSteps,
    required this.faq,
  });

  factory CodeXaStoreCatalog.fromJson(Map<String, dynamic> json) {
    final showcase = json['showcase'] as Map<String, dynamic>? ?? {};
    final rawScreenshots = (showcase['screenshots'] as List<dynamic>? ?? []);
    final rawVideos = (showcase['videos'] as List<dynamic>? ?? []);
    final rawFeatures = (showcase['features'] as List<dynamic>? ?? []);
    final rawFaq = ((showcase['support'] as Map<String, dynamic>? ?? {})['faq'] as List<dynamic>? ?? []);
    final rawInstall = ((showcase['installation'] as Map<String, dynamic>? ?? {})['steps'] as List<dynamic>? ?? []);

    return CodeXaStoreCatalog(
      ok: json['ok'] == true,
      application: CodeXaAppMeta.fromJson(json['application'] as Map<String, dynamic>? ?? {}),
      release: CodeXaReleaseMeta.fromJson(json['release'] as Map<String, dynamic>? ?? {}),
      screenshots: rawScreenshots.map((e) => CodeXaScreenshot.fromJson(e as Map<String, dynamic>)).toList(),
      videos: rawVideos.map((e) => CodeXaDemoVideo.fromJson(e as Map<String, dynamic>)).toList(),
      features: rawFeatures.map((e) => CodeXaFeatureItem.fromJson(e as Map<String, dynamic>)).toList(),
      about: CodeXaAboutMeta.fromJson(showcase['about'] as Map<String, dynamic>? ?? {}),
      installationSteps: rawInstall.map((e) => e.toString()).toList(),
      faq: rawFaq.map((e) => CodeXaFaqItem.fromJson(e as Map<String, dynamic>)).toList(),
    );
  }
}

class CodeXaAppMeta {
  final String name;
  final String packageName;
  final String platform;
  final String developer;
  final String distributionPolicy;
  final String officialDomain;

  CodeXaAppMeta({
    required this.name,
    required this.packageName,
    required this.platform,
    required this.developer,
    required this.distributionPolicy,
    required this.officialDomain,
  });

  factory CodeXaAppMeta.fromJson(Map<String, dynamic> json) {
    return CodeXaAppMeta(
      name: json['name'] ?? 'CodeXa Mobile',
      packageName: json['packageName'] ?? 'online.codxa_agency.app',
      platform: json['platform'] ?? 'android',
      developer: json['developer'] ?? 'CodeXa Agency',
      distributionPolicy: json['distributionPolicy'] ?? 'OFFICIAL_WEBSITE_EXCLUSIVE',
      officialDomain: json['officialDomain'] ?? 'https://codxa-agency.online',
    );
  }
}

class CodeXaReleaseMeta {
  final String id;
  final String versionName;
  final int versionCode;
  final String channel;
  final int fileSizeBytes;
  final String fileSizeFormatted;
  final String sha256;
  final int minimumSupportedVersionCode;
  final String updatePolicy; // 'OPTIONAL' | 'MANDATORY'
  final String releaseNotes;
  final String publishedAt;
  final String downloadUrl;

  CodeXaReleaseMeta({
    required this.id,
    required this.versionName,
    required this.versionCode,
    required this.channel,
    required this.fileSizeBytes,
    required this.fileSizeFormatted,
    required this.sha256,
    required this.minimumSupportedVersionCode,
    required this.updatePolicy,
    required this.releaseNotes,
    required this.publishedAt,
    required this.downloadUrl,
  });

  factory CodeXaReleaseMeta.fromJson(Map<String, dynamic> json) {
    return CodeXaReleaseMeta(
      id: json['id'] ?? '',
      versionName: json['versionName'] ?? '1.0.0',
      versionCode: (json['versionCode'] as num?)?.toInt() ?? 1,
      channel: json['channel'] ?? 'stable',
      fileSizeBytes: (json['fileSizeBytes'] as num?)?.toInt() ?? 0,
      fileSizeFormatted: json['fileSizeFormatted'] ?? '',
      sha256: json['sha256'] ?? '',
      minimumSupportedVersionCode: (json['minimumSupportedVersionCode'] as num?)?.toInt() ?? 1,
      updatePolicy: json['updatePolicy'] ?? 'OPTIONAL',
      releaseNotes: json['releaseNotes'] ?? '',
      publishedAt: json['publishedAt'] ?? '',
      downloadUrl: json['downloadUrl'] ?? 'https://codxa-agency.online/api/mobile/releases/download',
    );
  }
}

class CodeXaScreenshot {
  final String id;
  final String title;
  final String caption;
  final String altText;
  final String url;
  final String thumbnailUrl;
  final String category;
  final int displayOrder;

  CodeXaScreenshot({
    required this.id,
    required this.title,
    required this.caption,
    required this.altText,
    required this.url,
    required this.thumbnailUrl,
    required this.category,
    required this.displayOrder,
  });

  factory CodeXaScreenshot.fromJson(Map<String, dynamic> json) {
    return CodeXaScreenshot(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      caption: json['caption'] ?? '',
      altText: json['altText'] ?? '',
      url: json['url'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? json['url'] ?? '',
      category: json['category'] ?? 'General',
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class CodeXaDemoVideo {
  final String id;
  final String title;
  final String description;
  final String url;
  final String thumbnailUrl;
  final String duration;
  final int displayOrder;

  CodeXaDemoVideo({
    required this.id,
    required this.title,
    required this.description,
    required this.url,
    required this.thumbnailUrl,
    required this.duration,
    required this.displayOrder,
  });

  factory CodeXaDemoVideo.fromJson(Map<String, dynamic> json) {
    return CodeXaDemoVideo(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      url: json['url'] ?? '',
      thumbnailUrl: json['thumbnailUrl'] ?? '',
      duration: json['duration'] ?? '2:18',
      displayOrder: (json['displayOrder'] as num?)?.toInt() ?? 0,
    );
  }
}

class CodeXaFeatureItem {
  final String id;
  final String key;
  final String title;
  final String description;
  final String status;
  final String category;
  final int order;

  CodeXaFeatureItem({
    required this.id,
    required this.key,
    required this.title,
    required this.description,
    required this.status,
    required this.category,
    required this.order,
  });

  factory CodeXaFeatureItem.fromJson(Map<String, dynamic> json) {
    return CodeXaFeatureItem(
      id: json['id'] ?? '',
      key: json['key'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'Available',
      category: json['category'] ?? 'General',
      order: (json['order'] as num?)?.toInt() ?? 0,
    );
  }
}

class CodeXaAboutMeta {
  final String appName;
  final String tagline;
  final String description;
  final String accountRequirement;

  CodeXaAboutMeta({
    required this.appName,
    required this.tagline,
    required this.description,
    required this.accountRequirement,
  });

  factory CodeXaAboutMeta.fromJson(Map<String, dynamic> json) {
    return CodeXaAboutMeta(
      appName: json['appName'] ?? 'CodeXa Mobile',
      tagline: json['tagline'] ?? 'Official CodeXa Agency Workspace',
      description: json['description'] ?? '',
      accountRequirement: json['accountRequirement'] ?? '',
    );
  }
}

class CodeXaFaqItem {
  final String question;
  final String answer;

  CodeXaFaqItem({required this.question, required this.answer});

  factory CodeXaFaqItem.fromJson(Map<String, dynamic> json) {
    return CodeXaFaqItem(
      question: json['q'] ?? json['question'] ?? '',
      answer: json['a'] ?? json['answer'] ?? '',
    );
  }
}

// ==============================================================================
// 2. CODEXA STORE REPOSITORY (Authoritative Sync with Core Backend)
// ==============================================================================

class CodeXaStoreRepository {
  static const String baseUrl = 'https://codxa-agency.online';
  static CodeXaStoreCatalog? _cachedCatalog;
  static DateTime? _lastFetchTime;

  /// Fetches authoritative store catalog from Core API.
  static Future<CodeXaStoreCatalog> fetchCatalog({bool forceRefresh = false}) async {
    // Return in-memory cached copy if fresh within 5 minutes
    if (!forceRefresh &&
        _cachedCatalog != null &&
        _lastFetchTime != null &&
        DateTime.now().difference(_lastFetchTime!).inMinutes < 5) {
      return _cachedCatalog!;
    }

    try {
      final uri = Uri.parse('$baseUrl/api/mobile/store/catalog');
      final res = await http.get(
        uri,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CodeXa-Flutter-Android',
        },
      ).timeout(const Duration(seconds: 12));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        _cachedCatalog = CodeXaStoreCatalog.fromJson(data);
        _lastFetchTime = DateTime.now();
        return _cachedCatalog!;
      } else {
        throw Exception('Server returned ${res.statusCode}');
      }
    } catch (e) {
      if (_cachedCatalog != null) return _cachedCatalog!;
      rethrow;
    }
  }

  /// Checks if an update is available by comparing installed build number
  /// with authoritative integer versionCode from the server.
  static Future<bool> isUpdateAvailable(int latestVersionCode) async {
    final packageInfo = await PackageInfo.fromPlatform();
    final currentCode = int.tryParse(packageInfo.buildNumber) ?? 1;
    return latestVersionCode > currentCode;
  }
}

// ==============================================================================
// 3. IN-APP CODEXA STORE SCREEN
// ==============================================================================

class CodeXaStoreScreen extends StatefulWidget {
  const CodeXaStoreScreen({Key? key}) : super(key: key);

  @override
  State<CodeXaStoreScreen> createState() => _CodeXaStoreScreenState();
}

class _CodeXaStoreScreenState extends State<CodeXaStoreScreen> {
  bool _loading = true;
  String? _errorMessage;
  CodeXaStoreCatalog? _catalog;
  int _installedVersionCode = 1;
  String _installedVersionName = '1.0.0';
  bool _updateAvailable = false;
  bool _isMandatory = false;

  @override
  void initState() {
    super.initState();
    _loadStoreData();
  }

  Future<void> _loadStoreData({bool force = false}) async {
    setState(() {
      _loading = true;
      _errorMessage = null;
    });

    try {
      final packageInfo = await PackageInfo.fromPlatform();
      _installedVersionCode = int.tryParse(packageInfo.buildNumber) ?? 1;
      _installedVersionName = packageInfo.version;

      final catalog = await CodeXaStoreRepository.fetchCatalog(forceRefresh: force);
      final hasUpdate = catalog.release.versionCode > _installedVersionCode;
      final mandatory = hasUpdate &&
          (catalog.release.updatePolicy == 'MANDATORY' ||
              _installedVersionCode < catalog.release.minimumSupportedVersionCode);

      setState(() {
        _catalog = catalog;
        _updateAvailable = hasUpdate;
        _isMandatory = mandatory;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _errorMessage = 'Unable to connect to CodeXa Store catalog. Please check your network.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const bgDark = Color(0xFF060606);
    const crimson = Color(0xFFDC2626);

    return Scaffold(
      backgroundColor: bgDark,
      appBar: AppBar(
        backgroundColor: bgDark,
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: crimson.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: crimson.withOpacity(0.3)),
              ),
              child: const Text(
                'CODEXA STORE',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: () => _loadStoreData(force: true),
            tooltip: 'Refresh Store',
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: crimson),
            )
          : _errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.cloud_off, size: 48, color: Colors.white38),
                        const SizedBox(height: 16),
                        Text(
                          _errorMessage!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white70, fontSize: 14),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: () => _loadStoreData(force: true),
                          icon: const Icon(Icons.replay),
                          label: const Text('Try Again'),
                          style: ElevatedButton.styleFrom(backgroundColor: crimson),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildStoreContent(),
    );
  }

  Widget _buildStoreContent() {
    final cat = _catalog!;
    const crimson = Color(0xFFDC2626);

    return RefreshIndicator(
      color: crimson,
      onRefresh: () => _loadStoreData(force: true),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // 1. APP HEADER CARD
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF121212),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Image.network(
                    'https://codxa-agency.online/logo.jpeg',
                    width: 64,
                    height: 64,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      width: 64,
                      height: 64,
                      color: crimson.withOpacity(0.2),
                      child: const Icon(Icons.smartphone, color: crimson),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cat.application.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        cat.application.developer,
                        style: const TextStyle(color: crimson, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          _buildBadge('v$_installedVersionName installed', Colors.white38),
                          if (_updateAvailable)
                            _buildBadge('v${cat.release.versionName} available', Colors.green),
                          _buildBadge('Official Exclusive', Colors.amber),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // 2. UPDATE AVAILABLE BANNER
          if (_updateAvailable)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    _isMandatory ? crimson.withOpacity(0.25) : Colors.green.withOpacity(0.2),
                    const Color(0xFF171717),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isMandatory ? crimson.withOpacity(0.5) : Colors.green.withOpacity(0.5),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(
                        _isMandatory ? Icons.warning_amber_rounded : Icons.system_update_rounded,
                        color: _isMandatory ? crimson : Colors.green,
                        size: 22,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _isMandatory ? 'UPDATE REQUIRED' : 'UPDATE AVAILABLE',
                        style: TextStyle(
                          color: _isMandatory ? crimson : Colors.green,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          letterSpacing: 1.1,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Version ${cat.release.versionName} (Build ${cat.release.versionCode}) is ready with verified improvements.',
                    style: const TextStyle(color: Colors.white70, fontSize: 13),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _startUpdateDownload(cat.release),
                      icon: const Icon(Icons.download, size: 18),
                      label: Text(
                        _isMandatory
                            ? 'UPDATE NOW (${cat.release.fileSizeFormatted})'
                            : 'UPDATE APPLICATION (${cat.release.fileSizeFormatted})',
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _isMandatory ? crimson : Colors.green[700],
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (_updateAvailable) const SizedBox(height: 16),

          // 3. SCREENSHOTS CAROUSEL
          _buildSectionHeader('APP SCREENSHOTS', 'Explore your mobile workspace'),
          const SizedBox(height: 10),
          SizedBox(
            height: 240,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: cat.screenshots.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (ctx, index) {
                final scr = cat.screenshots[index];
                return GestureDetector(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => FullScreenScreenshotGallery(
                          screenshots: cat.screenshots,
                          initialIndex: index,
                        ),
                      ),
                    );
                  },
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      width: 135,
                      color: const Color(0xFF141414),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          Image.network(
                            scr.url,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: Colors.black45,
                              child: const Icon(Icons.image_not_supported, color: Colors.white24),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            left: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                              color: Colors.black.withOpacity(0.7),
                              child: Text(
                                scr.title,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(color: Colors.white70, fontSize: 10),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),

          // 4. DEMO VIDEO WALKTHROUGH
          if (cat.videos.isNotEmpty) ...[
            _buildSectionHeader('WATCH CODEXA IN ACTION', '1080p full-length official application demonstration'),
            const SizedBox(height: 10),
            CodeXaVideoPlayerWidget(videoUrl: cat.videos.first.url),
            const SizedBox(height: 24),
          ],

          // 5. WHAT'S NEW
          if (cat.release.releaseNotes.isNotEmpty) ...[
            _buildSectionHeader("WHAT'S NEW", 'Published release notes'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF121212),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white10),
              ),
              child: Text(
                cat.release.releaseNotes,
                style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.5),
              ),
            ),
            const SizedBox(height: 24),
          ],

          // 6. FEATURES
          _buildSectionHeader('KEY FEATURES', 'Everything you need in one unified platform'),
          const SizedBox(height: 10),
          ...cat.features.map(
            (f) => Container(
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFF121212),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: crimson.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.check_circle_outline, color: crimson, size: 18),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          f.title,
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          f.description,
                          style: const TextStyle(color: Colors.white60, fontSize: 11, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // 7. APP SPECIFICATIONS MATRIX
          _buildSectionHeader('TECHNICAL SPECIFICATIONS', 'Authoritative cryptographic & package details'),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF121212),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white10),
            ),
            child: Column(
              children: [
                _buildSpecRow('Package Name', cat.application.packageName),
                _buildSpecRow('Installed Version', 'v$_installedVersionName (Build $_installedVersionCode)'),
                _buildSpecRow('Latest Release', 'v${cat.release.versionName} (Build ${cat.release.versionCode})'),
                _buildSpecRow('File Size', cat.release.fileSizeFormatted),
                _buildSpecRow('Distribution Policy', 'Official Website Exclusive'),
                _buildSpecRow('Target SDK', 'Android 8.0 - 15'),
                const Divider(color: Colors.white10, height: 16),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('SHA-256 Checksum: ', style: TextStyle(color: Colors.white38, fontSize: 11)),
                    Expanded(
                      child: Text(
                        cat.release.sha256,
                        style: const TextStyle(color: Colors.white70, fontSize: 10, fontFamily: 'monospace'),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: const TextStyle(color: Colors.white38, fontSize: 11),
        ),
      ],
    );
  }

  Widget _buildBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w600),
      ),
    );
  }

  Widget _buildSpecRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.white38, fontSize: 11)),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  void _startUpdateDownload(CodeXaReleaseMeta release) {
    showDialog(
      context: context,
      barrierDismissible: !_isMandatory,
      builder: (_) => CodeXaUpdateDownloadDialog(release: release, isMandatory: _isMandatory),
    );
  }
}

// ==============================================================================
// 4. FULLSCREEN SCREENSHOT GALLERY
// ==============================================================================

class FullScreenScreenshotGallery extends StatefulWidget {
  final List<CodeXaScreenshot> screenshots;
  final int initialIndex;

  const FullScreenScreenshotGallery({
    Key? key,
    required this.screenshots,
    this.initialIndex = 0,
  }) : super(key: key);

  @override
  State<FullScreenScreenshotGallery> createState() => _FullScreenScreenshotGalleryState();
}

class _FullScreenScreenshotGalleryState extends State<FullScreenScreenshotGallery> {
  late PageController _pageController;
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _pageController = PageController(initialPage: widget.initialIndex);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = widget.screenshots[_currentIndex];

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black.withOpacity(0.6),
        elevation: 0,
        title: Text(
          '${_currentIndex + 1} / ${widget.screenshots.length}',
          style: const TextStyle(color: Colors.white, fontSize: 14),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: widget.screenshots.length,
            onPageChanged: (idx) => setState(() => _currentIndex = idx),
            itemBuilder: (ctx, idx) {
              final item = widget.screenshots[idx];
              return InteractiveViewer(
                minScale: 0.8,
                maxScale: 3.5,
                child: Center(
                  child: Image.network(
                    item.url,
                    fit: BoxFit.contain,
                    errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white24, size: 64),
                  ),
                ),
              );
            },
          ),
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.75),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    current.title,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  if (current.caption.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      current.caption,
                      style: const TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ==============================================================================
// 5. VIDEO PLAYER WIDGET (Lifecycle-Safe 1080p Streamer)
// ==============================================================================

class CodeXaVideoPlayerWidget extends StatefulWidget {
  final String videoUrl;

  const CodeXaVideoPlayerWidget({Key? key, required this.videoUrl}) : super(key: key);

  @override
  State<CodeXaVideoPlayerWidget> createState() => _CodeXaVideoPlayerWidgetState();
}

class _CodeXaVideoPlayerWidgetState extends State<CodeXaVideoPlayerWidget> {
  late VideoPlayerController _controller;
  bool _initialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  Future<void> _initVideo() async {
    try {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
      await _controller.initialize();
      _controller.setLooping(false);
      setState(() {
        _initialized = true;
      });
    } catch (e) {
      setState(() {
        _hasError = true;
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: const Color(0xFF141414),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white10),
        ),
        child: const Center(
          child: Text('Video temporarily unavailable', style: TextStyle(color: Colors.white38, fontSize: 12)),
        ),
      );
    }

    if (!_initialized) {
      return Container(
        height: 200,
        decoration: BoxDecoration(
          color: const Color(0xFF141414),
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFFDC2626)),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(14),
      child: Container(
        color: Colors.black,
        child: AspectRatio(
          aspectRatio: _controller.value.aspectRatio,
          child: Stack(
            alignment: Alignment.bottomCenter,
            children: [
              VideoPlayer(_controller),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _controller.value.isPlaying ? _controller.pause() : _controller.play();
                  });
                },
                child: Container(
                  color: Colors.transparent,
                  child: Center(
                    child: !_controller.value.isPlaying
                        ? Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                              border: Border.all(color: Colors.white30),
                            ),
                            child: const Icon(Icons.play_arrow, color: Colors.white, size: 36),
                          )
                        : const SizedBox.shrink(),
                  ),
                ),
              ),
              VideoProgressIndicator(
                _controller,
                allowScrubbing: true,
                colors: const VideoProgressColors(
                  playedColor: Color(0xFFDC2626),
                  bufferedColor: Colors.white24,
                  backgroundColor: Colors.white10,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==============================================================================
// 6. APK UPDATE DOWNLOAD DIALOG & INTEGRITY INSTALLER
// ==============================================================================

class CodeXaUpdateDownloadDialog extends StatefulWidget {
  final CodeXaReleaseMeta release;
  final bool isMandatory;

  const CodeXaUpdateDownloadDialog({
    Key? key,
    required this.release,
    required this.isMandatory,
  }) : super(key: key);

  @override
  State<CodeXaUpdateDownloadDialog> createState() => _CodeXaUpdateDownloadDialogState();
}

class _CodeXaUpdateDownloadDialogState extends State<CodeXaUpdateDownloadDialog> {
  double _progress = 0.0;
  String _status = 'Connecting to CodeXa Release Server...';
  bool _downloading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _downloadAndInstall();
  }

  Future<void> _downloadAndInstall() async {
    final client = http.Client();
    try {
      final req = http.Request('GET', Uri.parse(widget.release.downloadUrl));
      final resp = await client.send(req);

      final totalBytes = resp.contentLength ?? widget.release.fileSizeBytes;
      var receivedBytes = 0;
      final bytesList = <int>[];

      setState(() {
        _status = 'Downloading official update...';
      });

      await for (final chunk in resp.stream) {
        bytesList.addAll(chunk);
        receivedBytes += chunk.length;
        if (totalBytes > 0) {
          setState(() {
            _progress = receivedBytes / totalBytes;
          });
        }
      }

      setState(() {
        _status = 'Verifying SHA-256 cryptographic checksum...';
      });

      final digest = sha256.convert(bytesList).toString().toLowerCase();
      if (widget.release.sha256.isNotEmpty &&
          digest != widget.release.sha256.toLowerCase()) {
        throw Exception('SHA-256 integrity check failed. Expected: ${widget.release.sha256}, got: $digest');
      }

      setState(() {
        _status = 'Saving APK file...';
      });

      final dir = await getTemporaryDirectory();
      final apkFile = File('${dir.path}/CodeXa-v${widget.release.versionName}.apk');
      await apkFile.writeAsBytes(bytesList, flush: true);

      setState(() {
        _status = 'Opening Android Package Installer...';
        _downloading = false;
      });

      final result = await OpenFilex.open(apkFile.path);
      if (result.type != ResultType.done) {
        throw Exception('Failed to invoke Android installer: ${result.message}');
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
        _downloading = false;
      });
    } finally {
      client.close();
    }
  }

  @override
  Widget build(BuildContext context) {
    const crimson = Color(0xFFDC2626);

    return AlertDialog(
      backgroundColor: const Color(0xFF141414),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Row(
        children: [
          const Icon(Icons.downloading, color: crimson),
          const SizedBox(width: 8),
          Text(
            widget.isMandatory ? 'Required Update' : 'Downloading Update',
            style: const TextStyle(color: Colors.white, fontSize: 16),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_error != null) ...[
            Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12)),
            const SizedBox(height: 12),
          ] else ...[
            LinearProgressIndicator(
              value: _progress > 0 ? _progress : null,
              backgroundColor: Colors.white10,
              color: crimson,
            ),
            const SizedBox(height: 12),
            Text(
              '${(_progress * 100).toStringAsFixed(1)}% complete',
              style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(_status, style: const TextStyle(color: Colors.white38, fontSize: 11)),
          ],
        ],
      ),
      actions: [
        if (!widget.isMandatory || !_downloading)
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close', style: TextStyle(color: Colors.white60)),
          ),
      ],
    );
  }
}
