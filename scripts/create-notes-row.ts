import fs from "fs";

const content = `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/cx_theme.dart';
import '../../core/widgets/cx_components.dart';

// Provider to fetch active workspace notes
final workspaceNotesProvider =
    FutureProvider.autoDispose<List<NoteItemModel>>((ref) async {
      final api = CxApiClient();
      try {
        final res = await api.dio.get('/api/mobile/notes');
        if (res.data != null && res.data['ok'] == true) {
          final list = res.data['notes'] as List<dynamic>?;
          return list?.map((n) => NoteItemModel.fromJson(n)).toList() ?? [];
        }
      } catch (_) {}
      return [];
    });

class NotesRow extends ConsumerWidget {
  final void Function(String targetUserId, String targetName, String initialText)? onReplyNote;

  const NotesRow({super.key, this.onReplyNote});

  void _openCreateNoteSheet(BuildContext context, WidgetRef ref, String? currentText) {
    final textCtrl = TextEditingController(text: currentText ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'SHARE A NOTE',
                    style: GoogleFonts.orbitron(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: CxColors.textPrimary,
                      letterSpacing: 1.0,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: CxColors.textMuted, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Share a thought, current focus, or work update (visible for 24 hours).',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: CxColors.textSecondary,
                ),
              ),
              const SizedBox(height: CxSpacing.md),
              TextField(
                controller: textCtrl,
                maxLength: 60,
                autofocus: true,
                style: GoogleFonts.inter(fontSize: 14, color: CxColors.textPrimary),
                decoration: InputDecoration(
                  hintText: 'What\\'s on your mind? (e.g. Working on API 🚀)',
                  hintStyle: GoogleFonts.inter(fontSize: 13, color: CxColors.textMuted),
                  filled: true,
                  fillColor: CxColors.surface,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: CxColors.borderSubtle),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: CxColors.brightRed),
                  ),
                  counterStyle: GoogleFonts.inter(fontSize: 11, color: CxColors.textMuted),
                ),
                onChanged: (_) => setSheetState(() {}),
              ),
              const SizedBox(height: CxSpacing.md),
              CxButton(
                label: 'SHARE NOTE',
                icon: Icons.send_rounded,
                onPressed: () async {
                  final text = textCtrl.text.trim();
                  if (text.isEmpty) return;
                  Navigator.pop(ctx);
                  final api = CxApiClient();
                  try {
                    await api.dio.post('/api/mobile/notes', data: {'text': text});
                    ref.invalidate(workspaceNotesProvider);
                  } catch (_) {}
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openNoteReplySheet(BuildContext context, NoteItemModel note) {
    final replyCtrl = TextEditingController();

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
            Row(
              children: [
                CxAvatar(
                  imageUrl: note.authorAvatar,
                  name: note.authorName,
                  size: 36,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        note.authorName,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: CxColors.textPrimary,
                        ),
                      ),
                      Text(
                        'Note: "${note.text}"',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: CxColors.textSecondary,
                          fontStyle: FontStyle.italic,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: CxSpacing.md),
            TextField(
              controller: replyCtrl,
              autofocus: true,
              style: GoogleFonts.inter(fontSize: 14, color: CxColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Reply to \${note.authorName}...',
                hintStyle: GoogleFonts.inter(fontSize: 13, color: CxColors.textMuted),
                filled: true,
                fillColor: CxColors.surface,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: CxColors.borderSubtle),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: CxColors.brightRed),
                ),
              ),
            ),
            const SizedBox(height: CxSpacing.md),
            CxButton(
              label: 'SEND DIRECT MESSAGE',
              icon: Icons.send_rounded,
              onPressed: () {
                final text = replyCtrl.text.trim();
                Navigator.pop(ctx);
                if (onReplyNote != null) {
                  onReplyNote!(note.authorId, note.authorName, 'Replied to your note: "${note.text}"\\n\$text');
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notesAsync = ref.watch(workspaceNotesProvider);
    final bootstrapAsync = ref.watch(bootstrapProvider);
    final currentUser = bootstrapAsync.value?.user;

    final notes = notesAsync.value ?? [];
    final selfNote = notes.where((n) => n.isSelf || (currentUser != null && n.authorId == currentUser.id)).firstOrNull;
    final otherNotes = notes.where((n) => !(n.isSelf || (currentUser != null && n.authorId == currentUser.id))).toList();

    return Container(
      height: 124,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: CxSpacing.lg),
        children: [
          // 1. Current User Note Avatar
          GestureDetector(
            onTap: () => _openCreateNoteSheet(context, ref, selfNote?.text),
            child: SizedBox(
              width: 80,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Speech bubble if self has note, or '+' badge
                  if (selfNote != null)
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: CxColors.cardElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: CxColors.brightRed.withOpacity(0.6), width: 1),
                      ),
                      child: Text(
                        selfNote.text,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: CxColors.textPrimary,
                        ),
                      ),
                    )
                  else
                    const SizedBox(height: 22),
                  Stack(
                    alignment: Alignment.bottomRight,
                    children: [
                      CxAvatar(
                        imageUrl: currentUser?.profileMediaUrl,
                        name: currentUser?.fullName ?? 'Me',
                        size: 52,
                      ),
                      Container(
                        padding: const EdgeInsets.all(3),
                        decoration: const BoxDecoration(
                          color: CxColors.brightRed,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.add,
                          size: 12,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your Note',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: CxColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 2. Other users' notes
          ...otherNotes.map((note) {
            return GestureDetector(
              onTap: () => _openNoteReplySheet(context, note),
              child: Container(
                width: 80,
                margin: const EdgeInsets.only(left: 8),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      margin: const EdgeInsets.only(bottom: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: CxColors.cardElevated,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: CxColors.borderSubtle, width: 1),
                      ),
                      child: Text(
                        note.text,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: CxColors.textPrimary,
                        ),
                      ),
                    ),
                    CxAvatar(
                      imageUrl: note.authorAvatar,
                      name: note.authorName,
                      size: 52,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      note.authorName.split(' ').first,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: CxColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }
}
\`;

fs.writeFileSync('G:/AntiGravity IDE/codexa app/lib/features/messages/notes_row.dart', content, 'utf8');
console.log('Created notes_row.dart successfully!');
`;

fs.writeFileSync("scripts/create-notes-row.ts", content, "utf8");
console.log("Wrote scripts/create-notes-row.ts");
