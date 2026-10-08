import fs from "fs";

const content = `import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/theme/cx_theme.dart';
import '../../core/widgets/cx_components.dart';

final benefitsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = CxApiClient();
  try {
    final res = await api.dio.get('/api/mobile/benefits');
    if (res.data != null && res.data['ok'] == true) {
      return Map<String, dynamic>.from(res.data);
    }
  } catch (_) {}
  return {};
});

class PostPaymentBenefitsView extends ConsumerStatefulWidget {
  const PostPaymentBenefitsView({super.key});

  @override
  ConsumerState<PostPaymentBenefitsView> createState() => _PostPaymentBenefitsViewState();
}

class _PostPaymentBenefitsViewState extends ConsumerState<PostPaymentBenefitsView> {
  bool _isUploadingPhoto = false;
  bool _isSendingAiRequest = false;

  void _openPhotoPickerSheet(BuildContext context, String? profilePhotoUrl) {
    showModalBottomSheet(
      context: context,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'UPLOAD ID CARD PORTRAIT',
                style: GoogleFonts.orbitron(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Clear face photo with neutral background for your CodeXa ID card.',
                style: GoogleFonts.inter(fontSize: 12, color: CxColors.textSecondary),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.amber.withAlpha(30), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.camera_alt_rounded, color: Colors.amber),
                ),
                title: Text('Take Photo', style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('Capture with phone camera', style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadPhoto(ImageSource.camera);
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: Colors.blue.withAlpha(30), borderRadius: BorderRadius.circular(8)),
                  child: const Icon(Icons.photo_library_rounded, color: Colors.blue),
                ),
                title: Text('Choose from Gallery', style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('Select image from device storage', style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadPhoto(ImageSource.gallery);
                },
              ),
              if (profilePhotoUrl != null && profilePhotoUrl.isNotEmpty)
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Colors.green.withAlpha(30), borderRadius: BorderRadius.circular(8)),
                    child: const Icon(Icons.account_circle_outlined, color: Colors.green),
                  ),
                  title: Text('Use Current Profile Photo', style: GoogleFonts.inter(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text('Use your existing uploaded picture', style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary)),
                  onTap: () {
                    Navigator.pop(ctx);
                    _submitProfilePhoto();
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadPhoto(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: source,
      maxWidth: 1200,
      maxHeight: 1600,
      imageQuality: 85,
    );
    if (file == null) return;

    setState(() => _isUploadingPhoto = true);
    final api = CxApiClient();

    try {
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: file.name),
      });

      final res = await api.dio.post('/api/mobile/benefits/id-card/photo', data: formData);

      if (res.data != null && res.data['ok'] == true) {
        ref.invalidate(benefitsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('ID Card photo submitted successfully! Awaiting review.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      } else {
        throw Exception(res.data?['error']?['message'] ?? 'Upload failed');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Photo submission failed: \${e.toString()}'),
            backgroundColor: CxColors.brightRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  Future<void> _submitProfilePhoto() async {
    setState(() => _isUploadingPhoto = true);
    final api = CxApiClient();

    try {
      final res = await api.dio.post('/api/mobile/benefits/id-card/photo', data: {
        'useProfilePhoto': true,
      });

      if (res.data != null && res.data['ok'] == true) {
        ref.invalidate(benefitsProvider);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile photo submitted for ID Card! Awaiting review.'),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submission failed: \${e.toString()}'),
            backgroundColor: CxColors.brightRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingPhoto = false);
    }
  }

  void _openAiRequestDialog(BuildContext context) {
    final reasonController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'REQUEST GEMINI PRO ACCESS',
                    style: GoogleFonts.orbitron(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                'Your request will be sent directly to CodeXa Founder and Co-Founder for review and provisioning.',
                style: GoogleFonts.inter(fontSize: 12, color: CxColors.textSecondary),
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withAlpha(20),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.green.withAlpha(60)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.verified, color: Colors.greenAccent, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Verified Benefit: ₹300 AI Dev Tools component verified.',
                        style: GoogleFonts.inter(fontSize: 12, color: Colors.greenAccent),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CxTextField(
                label: 'PURPOSE / LEARNING GOALS (OPTIONAL)',
                hint: 'e.g. Building full-stack project, exploring LLM prompt engineering...',
                controller: reasonController,
                maxLines: 3,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: CxButton(
                  label: _isSendingAiRequest ? 'SENDING REQUEST...' : 'SEND REQUEST TO LEADERSHIP',
                  icon: Icons.send_rounded,
                  onPressed: _isSendingAiRequest
                      ? null
                      : () async {
                          setModalState(() => _isSendingAiRequest = true);
                          final api = CxApiClient();

                          try {
                            final res = await api.dio.post(
                              '/api/mobile/benefits/ai-access-requests',
                              data: {
                                'reason': reasonController.text.trim(),
                              },
                            );

                            if (res.data != null && res.data['ok'] == true) {
                              ref.invalidate(benefitsProvider);
                              if (context.mounted) {
                                Navigator.pop(ctx);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Request sent to Founder & Co-Founder! Awaiting review.'),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            } else {
                              throw Exception(res.data?['error']?['message'] ?? 'Failed');
                            }
                          } catch (e) {
                            setModalState(() => _isSendingAiRequest = false);
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text('Request failed: \${e.toString()}'),
                                  backgroundColor: CxColors.brightRed,
                                ),
                              );
                            }
                          }
                        },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final benefitsAsync = ref.watch(benefitsProvider);

    return benefitsAsync.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(24.0),
        child: Center(child: CircularProgressIndicator(color: CxColors.brightRed)),
      ),
      error: (_, __) => const SizedBox.shrink(),
      data: (data) {
        if (data['isPaid'] != true) return const SizedBox.shrink();

        final idCard = data['idCard'] as Map<String, dynamic>? ?? {};
        final idCardStatus = idCard['status'] ?? 'PHOTO_REQUIRED';
        final latestSub = idCard['latestSubmission'] as Map<String, dynamic>?;

        final aiDevTools = data['aiDevTools'] as Map<String, dynamic>? ?? {};
        final geminiReq = aiDevTools['geminiProRequest'] as Map<String, dynamic>? ?? {};
        final geminiStatus = geminiReq['status'] ?? 'NOT_REQUESTED';
        final reqDetails = geminiReq['request'] as Map<String, dynamic>?;
        final profilePhotoUrl = data['profilePhotoUrl'] as String?;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Title
            Row(
              children: [
                const Icon(Icons.card_giftcard, size: 18, color: CxColors.brightRed),
                const SizedBox(width: 8),
                Text(
                  'POST-PAYMENT UNLOCKED BENEFITS',
                  style: GoogleFonts.orbitron(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // BENEFIT 1: CODEXA ID CARD (₹150)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: CxColors.cardElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: idCardStatus == 'APPROVED' || idCardStatus == 'ID_CARD_READY'
                      ? Colors.green.withAlpha(80)
                      : CxColors.borderSubtle,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: CxColors.brightRed.withAlpha(30),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.badge_outlined, color: CxColors.brightRed, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'CODEXA ID CARD',
                                style: GoogleFonts.orbitron(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'Mandatory ID Card — ₹150 Component',
                                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                      _buildIdCardStatusChip(idCardStatus),
                    ],
                  ),
                  const SizedBox(height: 14),

                  if (latestSub != null && latestSub['imageUrl'] != null) ...[
                    Row(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            latestSub['imageUrl'],
                            width: 54,
                            height: 72,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 54,
                              height: 72,
                              color: Colors.white12,
                              child: const Icon(Icons.person, color: Colors.white38),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Submitted Portrait (Revision \${latestSub["version"] ?? 1})',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Submitted: \${latestSub["submittedAt"]?.toString().split('T').first ?? ''}',
                                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                              ),
                              if (latestSub['rejectionReason'] != null) ...[
                                const SizedBox(height: 4),
                                Text(
                                  'Reason: \${latestSub["rejectionReason"]}',
                                  style: GoogleFonts.inter(fontSize: 11, color: Colors.orangeAccent),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                  ],

                  if (idCardStatus == 'PHOTO_REQUIRED' || idCardStatus == 'REJECTED')
                    SizedBox(
                      width: double.infinity,
                      child: CxButton(
                        label: _isUploadingPhoto
                            ? 'UPLOADING...'
                            : (idCardStatus == 'REJECTED' ? 'UPLOAD NEW PHOTO' : 'UPLOAD IMAGE FOR ID CARD'),
                        icon: Icons.add_a_photo_outlined,
                        onPressed: _isUploadingPhoto ? null : () => _openPhotoPickerSheet(context, profilePhotoUrl),
                      ),
                    )
                  else if (idCardStatus == 'SUBMITTED' || idCardStatus == 'UNDER_REVIEW')
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.amber.withAlpha(20),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.amber.withAlpha(50)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.hourglass_top, color: Colors.amber, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Photo submitted. Awaiting review by CodeXa administration.',
                              style: GoogleFonts.inter(fontSize: 11, color: Colors.amberAccent),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.green.withAlpha(20),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.green.withAlpha(50)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 16),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              idCardStatus == 'ID_CARD_ISSUED'
                                  ? 'ID Card successfully issued.'
                                  : 'Photo approved! Card is in preparation pipeline.',
                              style: GoogleFonts.inter(fontSize: 11, color: Colors.greenAccent),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),

            // BENEFIT 2: AI DEV TOOLS PACK (₹300)
            Container(
              margin: const EdgeInsets.only(bottom: 24),
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: CxColors.cardElevated,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: CxColors.borderSubtle),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: Colors.purple.withAlpha(30),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.auto_awesome, color: Colors.purpleAccent, size: 20),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AI DEV TOOLS PACK',
                                style: GoogleFonts.orbitron(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                              Text(
                                'AI Dev Tools — ₹300 Component',
                                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: CxColors.brightRed.withAlpha(30),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'COMING UP',
                          style: GoogleFonts.orbitron(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: CxColors.brightRed,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  Text(
                    'Explore upcoming internal CodeXa AI tools in active engineering:',
                    style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                  ),
                  const SizedBox(height: 8),

                  _buildUpcomingFeatureItem('AI Coding Assistant', 'Interactive syntax refinement & code completions'),
                  _buildUpcomingFeatureItem('Dev Workflow Automation', 'Test generation & PR code review pipelines'),
                  _buildUpcomingFeatureItem('Project Architecture Engine', 'Database schema planning & architecture analysis'),

                  const SizedBox(height: 16),
                  const Divider(color: CxColors.borderSubtle),
                  const SizedBox(height: 12),

                  // GEMINI PRO REQUEST CARD
                  Text(
                    'GEMINI PRO ACCOUNT ACCESS',
                    style: GoogleFonts.orbitron(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Request access to an available CodeXa-managed Pro AI account or eligible licensed AI service.',
                    style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                  ),
                  const SizedBox(height: 12),

                  _buildGeminiRequestStatusSection(context, geminiStatus, reqDetails),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildUpcomingFeatureItem(String title, String desc) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('• ', style: TextStyle(color: Colors.purpleAccent, fontSize: 14)),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: GoogleFonts.inter(fontSize: 11, color: Colors.white70),
                children: [
                  TextSpan(text: '$title: ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  TextSpan(text: desc),
                ],
              ),
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: Colors.white12, borderRadius: BorderRadius.circular(6)),
            child: Text('SOON', style: GoogleFonts.orbitron(fontSize: 8, color: Colors.white70)),
          ),
        ],
      ),
    );
  }

  Widget _buildIdCardStatusChip(String status) {
    Color color = Colors.orange;
    String label = status;

    if (status == 'PHOTO_REQUIRED') {
      color = Colors.orange;
      label = 'Photo Required';
    } else if (status == 'SUBMITTED' || status == 'UNDER_REVIEW') {
      color = Colors.amber;
      label = 'Under Review';
    } else if (status == 'APPROVED') {
      color = Colors.green;
      label = 'Approved';
    } else if (status == 'REJECTED') {
      color = CxColors.brightRed;
      label = 'Rejected';
    } else if (status == 'ID_CARD_PREPARING') {
      color = Colors.blue;
      label = 'Preparing';
    } else if (status == 'ID_CARD_READY' || status == 'ID_CARD_ISSUED') {
      color = Colors.green;
      label = 'Ready / Issued';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withAlpha(30),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  Widget _buildGeminiRequestStatusSection(
    BuildContext context,
    String status,
    Map<String, dynamic>? reqDetails,
  ) {
    if (status == 'NOT_REQUESTED') {
      return SizedBox(
        width: double.infinity,
        child: CxButton(
          label: 'REQUEST GEMINI PRO ACCESS',
          icon: Icons.vpn_key_outlined,
          onPressed: () => _openAiRequestDialog(context),
        ),
      );
    } else if (status == 'PENDING_APPROVAL') {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.amber.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.amber.withAlpha(50)),
        ),
        child: Row(
          children: [
            const Icon(Icons.mark_email_read_outlined, color: Colors.amber, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'REQUEST SENT • PENDING REVIEW',
                    style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amberAccent),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Founder and Co-Founder have received your email request and will approve on website.',
                    style: GoogleFonts.inter(fontSize: 10, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else if (status == 'APPROVED_PENDING_PROVISIONING') {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.blue.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.blue.withAlpha(50)),
        ),
        child: Row(
          children: [
            const Icon(Icons.thumb_up_alt_outlined, color: Colors.blueAccent, size: 20),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'REQUEST APPROVED',
                    style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Approved by leadership! Account setup & provisioning is currently in progress.',
                    style: GoogleFonts.inter(fontSize: 10, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    } else if (status == 'ACCESS_GRANTED') {
      final instructions = reqDetails?['activationInstructions'] ?? 'Access configured by CodeXa Admin.';
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.green.withAlpha(20),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: Colors.green.withAlpha(50)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.greenAccent, size: 18),
                const SizedBox(width: 8),
                Text(
                  'ACCESS GRANTED',
                  style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.greenAccent),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              instructions,
              style: GoogleFonts.inter(fontSize: 11, color: Colors.white70),
            ),
          ],
        ),
      );
    } else if (status == 'REJECTED') {
      final reason = reqDetails?['reviewerNotes'] ?? 'Capacity limit reached';
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: CxColors.brightRed.withAlpha(20),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: CxColors.brightRed.withAlpha(50)),
            ),
            child: Row(
              children: [
                const Icon(Icons.cancel_outlined, color: CxColors.brightRed, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Request not approved: $reason',
                    style: GoogleFonts.inter(fontSize: 11, color: Colors.white70),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => _openAiRequestDialog(context),
              child: const Text('REQUEST AGAIN'),
            ),
          ),
        ],
      );
    }

    return const SizedBox.shrink();
  }
}
`;

fs.writeFileSync("G:/AntiGravity IDE/codexa app/lib/features/payments/post_payment_benefits_view.dart", content, "utf8");
console.log("Created post_payment_benefits_view.dart!");
