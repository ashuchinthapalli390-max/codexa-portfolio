import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/cx_theme.dart';
import '../../core/widgets/cx_components.dart';
import '../../core/widgets/cx_in_app_browser.dart';
import 'account_switcher_sheet.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _isUploadingAvatar = false;

  void _openEditBioSheet(String currentBio) {
    final bioCtrl = TextEditingController(text: currentBio);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: CxSpacing.lg,
          right: CxSpacing.lg,
          top: CxSpacing.lg,
          bottom: MediaQuery.of(context).viewInsets.bottom + CxSpacing.lg,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EDIT HEADLINE / BIO',
              style: GoogleFonts.orbitron(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: CxColors.textPrimary,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: CxSpacing.sm),
            Text(
              'A brief summary of your role, current focus, or skills.',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: CxColors.textSecondary,
              ),
            ),
            const SizedBox(height: CxSpacing.md),
            CxTextField(
              hint: 'e.g. Building scalable mobile & cloud architectures',
              controller: bioCtrl,
              maxLines: 3,
            ),
            const SizedBox(height: CxSpacing.md),
            CxButton(
              label: 'SAVE BIO',
              onPressed: () async {
                final newBio = bioCtrl.text.trim();
                Navigator.pop(ctx);
                final api = CxApiClient();
                try {
                  await api.dio.put('/api/mobile/profile', data: {'bio': newBio});
                  ref.invalidate(bootstrapProvider);
                } catch (_) {}
              },
            ),
          ],
        ),
      ),
    );
  }

  void _openStatusPicker(String currentStatus) {
    final options = [
      {'status': 'Available', 'icon': '🟢', 'desc': 'Ready for tasks & chats'},
      {'status': 'Focusing', 'icon': '🎯', 'desc': 'Deep work in progress'},
      {'status': 'In Meeting', 'icon': '📅', 'desc': 'In call or sync'},
      {'status': 'Away', 'icon': '🟡', 'desc': 'Temporarily away'},
      {'status': 'On Leave', 'icon': '🌴', 'desc': 'Approved leave'},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(CxSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SET WORKSPACE STATUS',
              style: GoogleFonts.orbitron(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: CxColors.textPrimary,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: CxSpacing.md),
            ...options.map((opt) {
              final isSelected = opt['status'] == currentStatus;
              return ListTile(
                leading: Text(opt['icon']!, style: const TextStyle(fontSize: 20)),
                title: Text(
                  opt['status']!,
                  style: GoogleFonts.inter(
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? CxColors.brightRed : CxColors.textPrimary,
                  ),
                ),
                subtitle: Text(
                  opt['desc']!,
                  style: GoogleFonts.inter(fontSize: 11, color: CxColors.textMuted),
                ),
                trailing: isSelected ? const Icon(Icons.check, color: CxColors.brightRed, size: 18) : null,
                onTap: () async {
                  Navigator.pop(ctx);
                  final api = CxApiClient();
                  try {
                    await api.dio.put('/api/mobile/profile', data: {'status': opt['status']});
                    ref.invalidate(bootstrapProvider);
                  } catch (_) {}
                },
              );
            }),
          ],
        ),
      ),
    );
  }

  void _openPfpActionSheet(String? currentImageUrl) {
    showModalBottomSheet(
      context: context,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(CxSpacing.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'PROFILE PICTURE',
              style: GoogleFonts.orbitron(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: CxColors.textPrimary,
                letterSpacing: 1.0,
              ),
            ),
            const SizedBox(height: CxSpacing.md),
            if (currentImageUrl != null && currentImageUrl.isNotEmpty) ...[
              ListTile(
                leading: const Icon(Icons.fullscreen, color: CxColors.brightRed),
                title: Text('View Photo', style: GoogleFonts.inter(color: CxColors.textPrimary)),
                onTap: () {
                  Navigator.pop(ctx);
                  showDialog(
                    context: context,
                    builder: (_) => Dialog(
                      backgroundColor: Colors.transparent,
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: Image.network(currentImageUrl, fit: BoxFit.contain),
                      ),
                    ),
                  );
                },
              ),
              const Divider(color: CxColors.borderSubtle, height: 1),
            ],
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: CxColors.brightRed),
              title: Text('Take Photo', style: GoogleFonts.inter(color: CxColors.textPrimary)),
              onTap: () async {
                Navigator.pop(ctx);
                final picker = ImagePicker();
                final picked = await picker.pickImage(
                  source: ImageSource.camera,
                  maxWidth: 1024,
                  maxHeight: 1024,
                  imageQuality: 85,
                );
                if (picked != null) {
                  _uploadPickedAvatar(picked);
                }
              },
            ),
            const Divider(color: CxColors.borderSubtle, height: 1),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: CxColors.brightRed),
              title: Text('Choose from Gallery', style: GoogleFonts.inter(color: CxColors.textPrimary)),
              onTap: () async {
                Navigator.pop(ctx);
                final picker = ImagePicker();
                final picked = await picker.pickImage(
                  source: ImageSource.gallery,
                  maxWidth: 1024,
                  maxHeight: 1024,
                  imageQuality: 85,
                );
                if (picked != null) {
                  _uploadPickedAvatar(picked);
                }
              },
            ),
            if (currentImageUrl != null && currentImageUrl.isNotEmpty) ...[
              const Divider(color: CxColors.borderSubtle, height: 1),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: CxColors.error),
                title: Text('Remove Photo', style: GoogleFonts.inter(color: CxColors.error)),
                onTap: () async {
                  Navigator.pop(ctx);
                  final api = CxApiClient();
                  try {
                    await api.dio.post('/api/mobile/profile/avatar', data: {'mediaUrl': ''});
                    ref.invalidate(bootstrapProvider);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Profile picture removed'),
                          backgroundColor: CxColors.cardElevated,
                        ),
                      );
                    }
                  } catch (_) {}
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _uploadPickedAvatar(XFile file) async {
    setState(() => _isUploadingAvatar = true);
    try {
      final bytes = await file.readAsBytes();
      final base64Image = base64Encode(bytes);
      final api = CxApiClient();
      final res = await api.dio.post(
        '/api/mobile/profile/avatar',
        data: {'base64': base64Image},
      );
      if (res.data != null && res.data['ok'] == true) {
        ref.invalidate(bootstrapProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile photo updated successfully!'),
              backgroundColor: CxColors.success,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(CxApiClient.parseError(e)),
            backgroundColor: CxColors.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingAvatar = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final user = bootstrapAsync.value?.user;
    final role = bootstrapAsync.value?.role ?? 'EMPLOYEE';
    final internship = bootstrapAsync.value?.internship;

    if (user == null) {
      return const Scaffold(
        backgroundColor: CxColors.background,
        body: Center(
          child: CircularProgressIndicator(color: CxColors.brightRed),
        ),
      );
    }

    return Scaffold(
      backgroundColor: CxColors.background,
      appBar: CxAppBar(
        title: 'MY PROFILE',
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: CxColors.textMuted),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) {
                context.go('/login');
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        color: CxColors.brightRed,
        backgroundColor: CxColors.cardElevated,
        onRefresh: () async {
          ref.invalidate(bootstrapProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(CxSpacing.lg),
          children: [
            // 1. Header Profile Identity
            Center(
              child: Column(
                children: [
                  Stack(
                    children: [
                      GestureDetector(
                        onTap: () => _openPfpActionSheet(user.profileMediaUrl),
                        child: _isUploadingAvatar
                            ? const SizedBox(
                                width: 88,
                                height: 88,
                                child: Center(
                                  child: CircularProgressIndicator(color: CxColors.brightRed),
                                ),
                              )
                            : CxAvatar(
                                imageUrl: user.profileMediaUrl,
                                name: user.fullName,
                                size: 88,
                              ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: GestureDetector(
                          onTap: () => _openPfpActionSheet(user.profileMediaUrl),
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: const BoxDecoration(
                              color: CxColors.brightRed,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.camera_alt,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: CxSpacing.md),
                  Text(
                    user.fullName,
                    style: GoogleFonts.orbitron(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: CxColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '@${user.username}',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: CxColors.textMuted,
                    ),
                  ),
                  const SizedBox(height: 6),

                  // Workspace Status Badge
                  InkWell(
                    onTap: () => _openStatusPicker('Available'),
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: CxColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: CxColors.borderSubtle),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.bolt, size: 12, color: CxColors.warning),
                          const SizedBox(width: 4),
                          Text(
                            '⚡ Status: Available',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: CxColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: CxSpacing.sm),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CxStatusChip(label: role.toUpperCase()),
                      const SizedBox(width: 8),
                      CxStatusChip(
                        label: user.designation ?? user.department ?? 'Engineering',
                        color: CxColors.info,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: CxSpacing.xl),

            // 2. Bio Section
            CxCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'ABOUT & BIO',
                        style: GoogleFonts.orbitron(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: CxColors.textSecondary,
                        ),
                      ),
                      InkWell(
                        onTap: () => _openEditBioSheet(user.bio ?? ''),
                        child: const Icon(
                          Icons.edit,
                          size: 16,
                          color: CxColors.brightRed,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: CxSpacing.sm),
                  Text(
                    user.bio != null && user.bio!.isNotEmpty
                        ? user.bio!
                        : 'No bio added yet. Tap edit to write a headline.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: user.bio != null ? CxColors.textPrimary : CxColors.textMuted,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: CxSpacing.md),

            // 3. Dedicated Internship Details Section (for Interns)
            if (role == 'INTERN' || internship != null) ...[
              CxCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.school_outlined, size: 16, color: CxColors.brightRed),
                        const SizedBox(width: 8),
                        Text(
                          'INTERNSHIP DETAILS',
                          style: GoogleFonts.orbitron(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: CxColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: CxSpacing.md),
                    _buildInfoRow('Intern ID', internship?.internId ?? user.employeeId ?? 'CXA-INT-2026'),
                    const Divider(color: CxColors.borderSubtle, height: 16),
                    _buildInfoRow('Status', internship?.status ?? 'ACTIVE'),
                    const Divider(color: CxColors.borderSubtle, height: 16),
                    _buildInfoRow('Domain', internship?.domain ?? user.department ?? 'Software Engineering'),
                    const Divider(color: CxColors.borderSubtle, height: 16),
                    _buildInfoRow('Duration', internship?.duration ?? '3 Months'),
                    if (internship?.startDate != null) ...[
                      const Divider(color: CxColors.borderSubtle, height: 16),
                      _buildInfoRow('Start Date', internship!.startDate!.split('T').first),
                    ],
                    if (internship?.endDate != null) ...[
                      const Divider(color: CxColors.borderSubtle, height: 16),
                      _buildInfoRow('End Date', internship!.endDate!.split('T').first),
                    ],
                    if (internship?.daysUntilStart != null && internship!.daysUntilStart > 0) ...[
                      const Divider(color: CxColors.borderSubtle, height: 16),
                      _buildInfoRow('Days Until Start', '${internship.daysUntilStart} days'),
                    ],
                    const Divider(color: CxColors.borderSubtle, height: 16),
                    _buildInfoRow('Mentor / Lead', internship?.mentorName ?? 'Shaik Ashu (Founder)'),
                    const Divider(color: CxColors.borderSubtle, height: 16),
                    _buildInfoRow('Stipend', internship?.stipend ?? 'Not Assigned'),
                  ],
                ),
              ),
              const SizedBox(height: CxSpacing.md),
            ],

            // 4. Official Identification (Read-only)
            CxCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'OFFICIAL IDENTIFICATION',
                    style: GoogleFonts.orbitron(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: CxColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: CxSpacing.md),
                  _buildInfoRow(
                    'Employee / Intern ID',
                    internship?.internId ?? user.employeeId ?? 'Not Assigned',
                  ),
                  const Divider(color: CxColors.borderSubtle, height: 16),
                  _buildInfoRow(
                    'Department / Domain',
                    internship?.domain ?? user.department ?? 'Not Assigned',
                  ),
                  const Divider(color: CxColors.borderSubtle, height: 16),
                  _buildInfoRow(
                    'Mentor / Lead',
                    internship?.mentorName ?? 'Not Assigned',
                  ),
                ],
              ),
            ),
            const SizedBox(height: CxSpacing.md),

            // 5. Links & Profiles (Opens In-App)
            if (user.githubUrl != null || user.linkedinUrl != null || user.portfolioUrl != null) ...[
              CxCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'PORTFOLIO & LINKS',
                      style: GoogleFonts.orbitron(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: CxColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: CxSpacing.md),
                    if (user.githubUrl != null)
                      ListTile(
                        dense: true,
                        leading: const Icon(Icons.code, color: CxColors.brightRed, size: 20),
                        title: Text('GitHub', style: GoogleFonts.inter(color: CxColors.textPrimary, fontSize: 13)),
                        subtitle: Text(user.githubUrl!, style: GoogleFonts.inter(color: CxColors.textMuted, fontSize: 11)),
                        trailing: const Icon(Icons.open_in_new, size: 14, color: CxColors.textMuted),
                        onTap: () => CxInAppBrowser.openUrl(context, user.githubUrl!),
                      ),
                    if (user.linkedinUrl != null)
                      ListTile(
                        dense: true,
                        leading: const Icon(Icons.business_center_outlined, color: CxColors.brightRed, size: 20),
                        title: Text('LinkedIn', style: GoogleFonts.inter(color: CxColors.textPrimary, fontSize: 13)),
                        subtitle: Text(user.linkedinUrl!, style: GoogleFonts.inter(color: CxColors.textMuted, fontSize: 11)),
                        trailing: const Icon(Icons.open_in_new, size: 14, color: CxColors.textMuted),
                        onTap: () => CxInAppBrowser.openUrl(context, user.linkedinUrl!),
                      ),
                    if (user.portfolioUrl != null)
                      ListTile(
                        dense: true,
                        leading: const Icon(Icons.language, color: CxColors.brightRed, size: 20),
                        title: Text('Portfolio Website', style: GoogleFonts.inter(color: CxColors.textPrimary, fontSize: 13)),
                        subtitle: Text(user.portfolioUrl!, style: GoogleFonts.inter(color: CxColors.textMuted, fontSize: 11)),
                        trailing: const Icon(Icons.open_in_new, size: 14, color: CxColors.textMuted),
                        onTap: () => CxInAppBrowser.openUrl(context, user.portfolioUrl!),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: CxSpacing.md),
            ],

            // 6. Multi-Account Switcher Bar
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F0F0F),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: CxColors.crimson.withOpacity(0.25),
                  width: 1.2,
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.manage_accounts_outlined,
                    color: CxColors.brightRed,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'ACTIVE CODEXA ACCOUNT',
                          style: GoogleFonts.orbitron(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
                            color: CxColors.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Signed in as @${user.username}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: CxColors.textPrimary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: CxColors.brightRed),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    onPressed: () => AccountSwitcherSheet.show(context),
                    child: Text(
                      'SWITCH',
                      style: GoogleFonts.orbitron(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: CxColors.brightRed,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 12, color: CxColors.textSecondary),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: CxColors.textPrimary,
          ),
        ),
      ],
    );
  }
}
