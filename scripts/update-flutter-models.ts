import fs from "fs";
import path from "path";

const targetPath = "G:/AntiGravity IDE/codexa app/lib/core/models/models.dart";
let content = fs.readFileSync(targetPath, "utf8");

// 1. Update PeopleModel
const peopleModelOld = `class PeopleModel {
  final String id;
  final String username;
  final String fullName;
  final String role;
  final String? department;
  final String? designation;
  final String? employeeId;
  final String? profileMediaUrl;
  final String? bio;
  final List<String> skills;
  final bool isActive;

  PeopleModel({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    this.department,
    this.designation,
    this.employeeId,
    this.profileMediaUrl,
    this.bio,
    this.skills = const [],
    this.isActive = true,
  });

  factory PeopleModel.fromJson(Map<String, dynamic> json) {
    return PeopleModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? json['username'] ?? '',
      role: json['role'] ?? 'EMPLOYEE',
      department: json['department'],
      designation: json['designation'],
      employeeId: json['employeeId'],
      profileMediaUrl: json['profileMediaUrl'],
      bio: json['bio'],
      skills:
          (json['skills'] as List<dynamic>?)
              ?.map((s) => s.toString())
              .toList() ??
          [],
      isActive: json['isActive'] ?? true,
    );
  }
}`;

const peopleModelNew = `class PeopleModel {
  final String id;
  final String username;
  final String fullName;
  final String role;
  final String? department;
  final String? designation;
  final String? employeeId;
  final String? profileMediaUrl;
  final String? bio;
  final List<String> skills;
  final bool isActive;
  final Map<String, dynamic>? internship;

  PeopleModel({
    required this.id,
    required this.username,
    required this.fullName,
    required this.role,
    this.department,
    this.designation,
    this.employeeId,
    this.profileMediaUrl,
    this.bio,
    this.skills = const [],
    this.isActive = true,
    this.internship,
  });

  String? get internId => (internship != null && internship!['internId'] != null) ? internship!['internId'].toString() : employeeId;
  String? get internshipDomain => internship?['domain']?.toString() ?? department;
  String? get internshipDuration => internship?['duration']?.toString();
  int? get internshipMonths => internship?['months'] is int ? internship!['months'] : (internship?['months'] != null ? int.tryParse(internship!['months'].toString()) : null);
  String? get internshipStatus => internship?['status']?.toString();
  int? get internshipDaysRemaining => internship?['daysRemaining'] is int ? internship!['daysRemaining'] : (internship?['daysRemaining'] != null ? int.tryParse(internship!['daysRemaining'].toString()) : null);
  String? get internshipStartDate => internship?['startDate']?.toString();
  String? get internshipEndDate => internship?['endDate']?.toString();
  String? get mentorName => internship?['mentor']?.toString();

  factory PeopleModel.fromJson(Map<String, dynamic> json) {
    return PeopleModel(
      id: json['id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['fullName'] ?? json['username'] ?? '',
      role: json['role'] ?? 'EMPLOYEE',
      department: json['department'],
      designation: json['designation'],
      employeeId: json['employeeId'],
      profileMediaUrl: json['profileMediaUrl'],
      bio: json['bio'],
      skills:
          (json['skills'] as List<dynamic>?)
              ?.map((s) => s.toString())
              .toList() ??
          [],
      isActive: json['isActive'] ?? true,
      internship: json['internship'] is Map<String, dynamic> ? (json['internship'] as Map<String, dynamic>) : null,
    );
  }
}`;

if (content.includes("class PeopleModel {")) {
  content = content.replace(peopleModelOld, peopleModelNew);
  console.log("Updated PeopleModel");
} else {
  console.log("PeopleModel not found or already updated");
}

// 2. Append NoteItemModel and MobileRemoteConfigModel if not present
if (!content.includes("class NoteItemModel")) {
  const additionalModels = `

/// Instagram-style 24-Hour Note Model
class NoteItemModel {
  final String id;
  final String text;
  final String authorId;
  final String authorName;
  final String authorRole;
  final String? authorAvatar;
  final DateTime createdAt;
  final DateTime expiresAt;
  final bool isSelf;

  NoteItemModel({
    required this.id,
    required this.text,
    required this.authorId,
    required this.authorName,
    required this.authorRole,
    this.authorAvatar,
    required this.createdAt,
    required this.expiresAt,
    this.isSelf = false,
  });

  factory NoteItemModel.fromJson(Map<String, dynamic> json) {
    return NoteItemModel(
      id: json['id'] ?? '',
      text: json['text'] ?? '',
      authorId: json['authorId'] ?? '',
      authorName: json['authorName'] ?? 'CodeXa Member',
      authorRole: (json['authorRole'] ?? 'MEMBER').toString().toUpperCase(),
      authorAvatar: json['authorAvatar'],
      createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
      expiresAt: DateTime.tryParse(json['expiresAt'] ?? '') ?? DateTime.now().add(const Duration(hours: 24)),
      isSelf: json['isSelf'] == true,
    );
  }
}

/// Remote Application Configuration & AppGate Model
class MobileRemoteConfigModel {
  final int configVersion;
  final bool maintenanceEnabled;
  final String maintenanceTitle;
  final String maintenanceMessage;
  final DateTime? maintenanceExpectedEndAt;
  final String minimumSupportedVersion;
  final String latestVersion;
  final bool forceUpdate;
  final bool optionalUpdate;
  final String updateUrl;
  final String? releaseNotes;
  final Map<String, dynamic> featureFlags;

  MobileRemoteConfigModel({
    required this.configVersion,
    required this.maintenanceEnabled,
    required this.maintenanceTitle,
    required this.maintenanceMessage,
    this.maintenanceExpectedEndAt,
    required this.minimumSupportedVersion,
    required this.latestVersion,
    required this.forceUpdate,
    required this.optionalUpdate,
    required this.updateUrl,
    this.releaseNotes,
    this.featureFlags = const {},
  });

  factory MobileRemoteConfigModel.fromJson(Map<String, dynamic> json) {
    final maintenanceObj = json['maintenance'];
    final bool maintenanceEnabled;
    final String maintenanceTitle;
    final String maintenanceMessage;
    DateTime? expectedEndAt;

    if (maintenanceObj is Map<String, dynamic>) {
      maintenanceEnabled = maintenanceObj['enabled'] == true;
      maintenanceTitle = maintenanceObj['title'] ?? 'CODEXA MAINTENANCE';
      maintenanceMessage = maintenanceObj['message'] ?? 'CodeXa is temporarily unavailable while we make improvements.';
      if (maintenanceObj['expectedEndAt'] != null) {
        expectedEndAt = DateTime.tryParse(maintenanceObj['expectedEndAt'].toString());
      }
    } else {
      final appObj = json['app'] is Map<String, dynamic> ? json['app'] : null;
      maintenanceEnabled = (appObj != null && appObj['maintenance'] == true) || json['maintenance'] == true;
      maintenanceTitle = 'CODEXA MAINTENANCE';
      maintenanceMessage = (appObj != null ? appObj['maintenanceMessage'] : null) ?? json['message'] ?? 'CodeXa is temporarily unavailable while we make improvements.';
    }

    final versionObj = json['version'];
    final appObj = json['app'] is Map<String, dynamic> ? json['app'] : null;

    final String minVer = versionObj is Map ? (versionObj['minimumSupported'] ?? '1.0.0') : (appObj?['minimumVersion'] ?? '1.0.0');
    final String latestVer = versionObj is Map ? (versionObj['latest'] ?? '1.0.0') : (appObj?['version'] ?? '1.0.0');
    final bool forceUp = versionObj is Map ? (versionObj['forceUpdate'] == true) : (appObj?['forceUpdate'] == true);
    final bool optUp = versionObj is Map ? (versionObj['optionalUpdate'] == true) : (appObj?['softUpdate'] == true);
    final String updUrl = (versionObj is Map ? versionObj['updateUrl'] : null) ??
        (json['downloads'] is Map ? json['downloads']['apkUrl'] : null) ??
        'https://codxa-agency.online/downloads/CodeXa.apk';
    final String? relNotes = versionObj is Map ? versionObj['releaseNotes'] : null;

    Map<String, dynamic> flags = {};
    if (json['featureFlags'] is Map) {
      flags = Map<String, dynamic>.from(json['featureFlags']);
    } else if (json['features'] is Map) {
      flags = Map<String, dynamic>.from(json['features']);
    }

    return MobileRemoteConfigModel(
      configVersion: json['configVersion'] ?? 100,
      maintenanceEnabled: maintenanceEnabled,
      maintenanceTitle: maintenanceTitle,
      maintenanceMessage: maintenanceMessage,
      maintenanceExpectedEndAt: expectedEndAt,
      minimumSupportedVersion: minVer,
      latestVersion: latestVer,
      forceUpdate: forceUp,
      optionalUpdate: optUp,
      updateUrl: updUrl,
      releaseNotes: relNotes,
      featureFlags: flags,
    );
  }
}
`;
  content += additionalModels;
  console.log("Appended NoteItemModel & MobileRemoteConfigModel");
}

fs.writeFileSync(targetPath, content, "utf8");
console.log("Updated models.dart successfully!");
