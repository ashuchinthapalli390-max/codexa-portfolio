import fs from "fs";

const content = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/api/api_client.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/cx_theme.dart';
import 'story_composer_screen.dart';
import 'story_viewer_screen.dart';

// Provider for Stories
final storiesFeedProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final api = CxApiClient();
  try {
    final res = await api.dio.get('/api/mobile/stories');
    if (res.data != null && res.data['ok'] == true) {
      return (res.data['stories'] as List<dynamic>?)
              ?.map((s) => Map<String, dynamic>.from(s))
              .toList() ??
          [];
    }
  } catch (_) {}
  return [];
});

class StoriesTray extends ConsumerWidget {
  const StoriesTray({super.key});

  void _openCreateStory(BuildContext context, WidgetRef ref) {
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
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: CxColors.brightRed.withAlpha(40),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.add_photo_alternate_rounded, color: CxColors.brightRed, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CREATE WORKSPACE STORY',
                        style: GoogleFonts.orbitron(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: CxColors.textPrimary,
                          letterSpacing: 1.0,
                        ),
                      ),
                      Text(
                        'Visible across CodeXa team for 24 hours',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: CxColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _buildStoryActionTile(
                ctx,
                icon: Icons.camera_alt_rounded,
                color: Colors.amberAccent,
                title: 'Take Photo',
                subtitle: 'Capture with phone camera',
                onTap: () async {
                  Navigator.pop(ctx);
                  final picker = ImagePicker();
                  final file = await picker.pickImage(
                    source: ImageSource.camera,
                    maxWidth: 1920,
                    maxHeight: 1920,
                    imageQuality: 85,
                  );
                  if (file != null && context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoryComposerScreen(
                          mediaFile: file,
                          mediaType: StoryMediaType.image,
                        ),
                      ),
                    );
                  }
                },
              ),
              _buildStoryActionTile(
                ctx,
                icon: Icons.photo_library_rounded,
                color: Colors.blueAccent,
                title: 'Choose Photo',
                subtitle: 'Select image from device gallery',
                onTap: () async {
                  Navigator.pop(ctx);
                  final picker = ImagePicker();
                  final file = await picker.pickImage(
                    source: ImageSource.gallery,
                    maxWidth: 1920,
                    maxHeight: 1920,
                    imageQuality: 85,
                  );
                  if (file != null && context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoryComposerScreen(
                          mediaFile: file,
                          mediaType: StoryMediaType.image,
                        ),
                      ),
                    );
                  }
                },
              ),
              _buildStoryActionTile(
                ctx,
                icon: Icons.videocam_rounded,
                color: CxColors.brightRed,
                title: 'Record Video',
                subtitle: 'Record camera video clip',
                onTap: () async {
                  Navigator.pop(ctx);
                  final picker = ImagePicker();
                  final file = await picker.pickVideo(
                    source: ImageSource.camera,
                    maxDuration: const Duration(seconds: 60),
                  );
                  if (file != null && context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoryComposerScreen(
                          mediaFile: file,
                          mediaType: StoryMediaType.video,
                        ),
                      ),
                    );
                  }
                },
              ),
              _buildStoryActionTile(
                ctx,
                icon: Icons.video_library_rounded,
                color: Colors.purpleAccent,
                title: 'Choose Video',
                subtitle: 'Select video from device gallery',
                onTap: () async {
                  Navigator.pop(ctx);
                  final picker = ImagePicker();
                  final file = await picker.pickVideo(
                    source: ImageSource.gallery,
                    maxDuration: const Duration(seconds: 120),
                  );
                  if (file != null && context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => StoryComposerScreen(
                          mediaFile: file,
                          mediaType: StoryMediaType.video,
                        ),
                      ),
                    );
                  }
                },
              ),
              _buildStoryActionTile(
                ctx,
                icon: Icons.text_fields_rounded,
                color: Colors.tealAccent,
                title: 'Text Story',
                subtitle: 'Share a note, project update or milestone',
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const StoryComposerScreen(
                        mediaType: StoryMediaType.text,
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStoryActionTile(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withAlpha(35),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: CxColors.textPrimary,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: CxColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: CxColors.textMuted),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(storiesFeedProvider);
    final user = ref.watch(authProvider).user;

    return Container(
      height: 104,
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: CxSpacing.md),
        children: [
          // "Your Story +"
          GestureDetector(
            onTap: () => _openCreateStory(context, ref),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Column(
                children: [
                  Stack(
                    children: [
                      Container(
                        width: 62,
                        height: 62,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: CxColors.borderSubtle,
                            width: 1.5,
                          ),
                        ),
                        child: ClipOval(
                          child: user?.mediaUrl != null && user!.mediaUrl!.isNotEmpty
                              ? Image.network(
                                  user.mediaUrl!,
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, __, ___) => _buildAvatarFallback(user.displayName),
                                )
                              : _buildAvatarFallback(user?.displayName ?? 'You'),
                        ),
                      ),
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 22,
                          height: 22,
                          decoration: BoxDecoration(
                            color: CxColors.brightRed,
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: const Color(0xFF070707),
                              width: 2,
                            ),
                          ),
                          child: const Icon(
                            Icons.add,
                            color: Colors.white,
                            size: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Your Story',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: CxColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),

          // Team Stories
          storiesAsync.when(
            data: (stories) {
              final teamStories = stories.where((s) => s['isOwnStory'] != true).toList();
              if (teamStories.isEmpty) return const SizedBox.shrink();

              return Row(
                children: teamStories.map((story) {
                  final authorName = story['authorName'] ?? 'Member';
                  final avatarUrl = story['avatarUrl'];
                  final hasUnseen = story['hasUnseen'] ?? true;

                  return GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => StoryViewerScreen(storyGroup: story),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Column(
                        children: [
                          Container(
                            width: 62,
                            height: 62,
                            padding: const EdgeInsets.all(2.5),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: hasUnseen
                                  ? const LinearGradient(
                                      colors: [
                                        CxColors.brightRed,
                                        Color(0xFFFF5964),
                                        Color(0xFF63000F),
                                      ],
                                      begin: Alignment.topLeft,
                                      end: Alignment.bottomRight,
                                    )
                                  : null,
                              border: hasUnseen
                                  ? null
                                  : Border.all(
                                      color: CxColors.borderSubtle,
                                      width: 1.5,
                                    ),
                            ),
                            child: Container(
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF070707),
                              ),
                              padding: const EdgeInsets.all(2),
                              child: ClipOval(
                                child: avatarUrl != null && avatarUrl.isNotEmpty
                                    ? Image.network(
                                        avatarUrl,
                                        fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) => _buildAvatarFallback(authorName),
                                      )
                                    : _buildAvatarFallback(authorName),
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            width: 64,
                            child: Text(
                              authorName,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: hasUnseen
                                    ? CxColors.textPrimary
                                    : CxColors.textSecondary,
                              ),
                              textAlign: TextAlign.center,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatarFallback(String name) {
    return Container(
      color: const Color(0xFF191919),
      child: Center(
        child: Text(
          name.isNotEmpty ? name[0].toUpperCase() : 'C',
          style: GoogleFonts.orbitron(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: CxColors.brightRed,
          ),
        ),
      ),
    );
  }
}
`;

fs.writeFileSync("G:/AntiGravity IDE/codexa app/lib/features/stories/stories_tray.dart", content, "utf8");
console.log("Updated stories_tray.dart!");
