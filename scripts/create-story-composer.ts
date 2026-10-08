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
import 'stories_tray.dart';

enum StoryMediaType { text, image, video }

class StoryComposerScreen extends ConsumerStatefulWidget {
  final XFile? mediaFile;
  final StoryMediaType mediaType;

  const StoryComposerScreen({
    super.key,
    this.mediaFile,
    required this.mediaType,
  });

  @override
  ConsumerState<StoryComposerScreen> createState() => _StoryComposerScreenState();
}

class _StoryComposerScreenState extends ConsumerState<StoryComposerScreen> {
  final _captionController = TextEditingController();
  String _selectedAudience = 'EVERYONE';
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  String? _uploadStatusText;

  @override
  void dispose() {
    _captionController.dispose();
    super.dispose();
  }

  Future<void> _publishStory() async {
    final caption = _captionController.text.trim();
    if (widget.mediaType == StoryMediaType.text && caption.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter story text.')),
      );
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.1;
      _uploadStatusText = 'Preparing media...';
    });

    final api = CxApiClient();

    try {
      if (widget.mediaFile != null) {
        setState(() {
          _uploadProgress = 0.3;
          _uploadStatusText = 'Uploading media...';
        });

        final file = File(widget.mediaFile!.path);
        final fileName = widget.mediaFile!.name;
        final isVideo = widget.mediaType == StoryMediaType.video;

        final formData = FormData.fromMap({
          'type': isVideo ? 'VIDEO' : 'IMAGE',
          'content': caption,
          'audience': _selectedAudience,
          'file': await MultipartFile.fromFile(file.path, filename: fileName),
        });

        final res = await api.dio.post(
          '/api/mobile/stories',
          data: formData,
          onSendProgress: (sent, total) {
            if (total > 0) {
              setState(() {
                _uploadProgress = 0.3 + 0.6 * (sent / total);
                _uploadStatusText = 'Uploading Story: \${((sent / total) * 100).toInt()}%';
              });
            }
          },
        );

        if (res.data != null && res.data['ok'] == true) {
          setState(() {
            _uploadProgress = 1.0;
            _uploadStatusText = 'Published!';
          });

          ref.invalidate(storiesFeedProvider);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Story published successfully!'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pop();
          }
        } else {
          throw Exception(res.data?['error']?['message'] ?? 'Upload failed');
        }
      } else {
        // Text-only story
        setState(() {
          _uploadProgress = 0.5;
          _uploadStatusText = 'Publishing story...';
        });

        final res = await api.dio.post(
          '/api/mobile/stories',
          data: {
            'type': 'TEXT',
            'content': caption,
            'audience': _selectedAudience,
          },
        );

        if (res.data != null && res.data['ok'] == true) {
          ref.invalidate(storiesFeedProvider);

          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Story published successfully!'),
                backgroundColor: Colors.green,
              ),
            );
            Navigator.of(context).pop();
          }
        } else {
          throw Exception(res.data?['error']?['message'] ?? 'Failed to publish');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Story upload failed: \${e.toString()}'),
            backgroundColor: CxColors.brightRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070707),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: _isUploading ? null : () => Navigator.pop(context),
        ),
        title: Text(
          widget.mediaType == StoryMediaType.video
              ? 'VIDEO STORY'
              : widget.mediaType == StoryMediaType.image
                  ? 'PHOTO STORY'
                  : 'TEXT STORY',
          style: GoogleFonts.orbitron(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: 1.0,
          ),
        ),
        actions: [
          if (!_isUploading)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: TextButton.icon(
                onPressed: _publishStory,
                icon: const Icon(Icons.send_rounded, color: CxColors.brightRed, size: 18),
                label: Text(
                  'SHARE',
                  style: GoogleFonts.orbitron(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: CxColors.brightRed,
                  ),
                ),
              ),
            ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Canvas background or preview
                  if (widget.mediaFile != null && widget.mediaType == StoryMediaType.image)
                    Positioned.fill(
                      child: Container(
                        margin: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: CxColors.borderSubtle),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.file(
                            File(widget.mediaFile!.path),
                            fit: BoxFit.cover,
                          ),
                        ),
                      ),
                    )
                  else if (widget.mediaFile != null && widget.mediaType == StoryMediaType.video)
                    Positioned.fill(
                      child: Container(
                        margin: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF111111),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: CxColors.borderSubtle),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: CxColors.brightRed.withAlpha(50),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.videocam_rounded,
                                  size: 48,
                                  color: CxColors.brightRed,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                widget.mediaFile!.name,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: CxColors.textSecondary,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: CxColors.brightRed,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'VIDEO READY',
                                  style: GoogleFonts.orbitron(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    )
                  else
                    Positioned.fill(
                      child: Container(
                        margin: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF63000F), Color(0xFF070707)],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: CxColors.borderSubtle),
                        ),
                        padding: const EdgeInsets.all(24),
                        child: Center(
                          child: TextField(
                            controller: _captionController,
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 8,
                            textAlign: TextAlign.center,
                            decoration: const InputDecoration(
                              hintText: 'Type your story update here...',
                              hintStyle: TextStyle(color: Colors.white38),
                              border: InputBorder.none,
                            ),
                          ),
                        ),
                      ),
                    ),

                  // Overlay Caption Input (for photo & video)
                  if (widget.mediaFile != null)
                    Positioned(
                      bottom: 24,
                      left: 24,
                      right: 24,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(180),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: TextField(
                          controller: _captionController,
                          style: GoogleFonts.inter(fontSize: 14, color: Colors.white),
                          decoration: const InputDecoration(
                            hintText: 'Add a caption...',
                            hintStyle: TextStyle(color: Colors.white60),
                            border: InputBorder.none,
                          ),
                        ),
                      ),
                    ),

                  // Upload Progress Overlay
                  if (_isUploading)
                    Positioned.fill(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.black.withAlpha(200),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 64,
                                height: 64,
                                child: CircularProgressIndicator(
                                  value: _uploadProgress,
                                  strokeWidth: 6,
                                  color: CxColors.brightRed,
                                  backgroundColor: Colors.white12,
                                ),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                _uploadStatusText ?? 'Uploading...',
                                style: GoogleFonts.orbitron(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Audience & Publish Controls
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: Color(0xFF0C0C0C),
                border: Border(top: BorderSide(color: CxColors.borderSubtle)),
              ),
              child: Row(
                children: [
                  Icon(Icons.public, size: 16, color: CxColors.textSecondary),
                  const SizedBox(width: 8),
                  Text(
                    'AUDIENCE:',
                    style: GoogleFonts.orbitron(fontSize: 10, color: CxColors.textSecondary),
                  ),
                  const SizedBox(width: 8),
                  DropdownButton<String>(
                    value: _selectedAudience,
                    dropdownColor: CxColors.cardElevated,
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.white),
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(value: 'EVERYONE', child: Text('Everyone in CodeXa')),
                      DropdownMenuItem(value: 'TEAM', child: Text('My Team')),
                      DropdownMenuItem(value: 'PROJECT', child: Text('Project Members')),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedAudience = val);
                    },
                  ),
                  const Spacer(),
                  CxButton(
                    label: _isUploading ? 'UPLOADING...' : 'SHARE STORY',
                    icon: Icons.send,
                    onPressed: _isUploading ? null : _publishStory,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;

fs.writeFileSync("G:/AntiGravity IDE/codexa app/lib/features/stories/story_composer_screen.dart", content, "utf8");
console.log("Created story_composer_screen.dart!");
