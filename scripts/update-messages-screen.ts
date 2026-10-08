import fs from "fs";

const target = "G:/AntiGravity IDE/codexa app/lib/features/messages/messages_screen.dart";
let s = fs.readFileSync(target, "utf8");

// 1. Add import for CoworkerProfileScreen if not present
if (!s.includes("coworker_profile_screen.dart")) {
  s = `import '../profile/coworker_profile_screen.dart';\n` + s;
}

// 2. Add mark conversation read in _loadMessages
const loadMessagesOld = `        if (res.data != null && (res.data['success'] == true || res.data['ok'] == true)) {
          final list = (res.data['messages'] as List<dynamic>?)
                  ?.map((m) => Map<String, dynamic>.from(m))
                  .toList() ??
              [];
          setState(() {
            _messages.clear();
            _messages.addAll(list);
          });
        }`;

const loadMessagesNew = `        if (res.data != null && (res.data['success'] == true || res.data['ok'] == true)) {
          final list = (res.data['messages'] as List<dynamic>?)
                  ?.map((m) => Map<String, dynamic>.from(m))
                  .toList() ??
              [];
          setState(() {
            _messages.clear();
            _messages.addAll(list);
          });

          // Monotonic read marker update for recipient
          if (list.isNotEmpty) {
            _markConversationRead(convId, list.first['id']);
          }
        }`;

s = s.replace(loadMessagesOld, loadMessagesNew);

// 3. Add _markConversationRead helper and group icon edit helper
const helperInsertPoint = "  void _showMessageOptions(Map<String, dynamic> msg) {";
const helpers = `
  Future<void> _markConversationRead(String convId, String? lastReadId) async {
    try {
      final api = CxApiClient();
      await api.dio.post('/api/chat/read', data: {
        'conversationId': convId,
        'lastReadMessageId': lastReadId,
      });
    } catch (_) {}
  }

  void _showGroupInfoModal(Map<String, dynamic> conv) {
    final title = conv['name'] ?? conv['title'] ?? 'Group Chat';
    final avatarUrl = conv['icon_url'] ?? conv['avatar_url'] ?? conv['metadata']?['iconUrl'];

    showModalBottomSheet(
      context: context,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Stack(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: CxColors.card,
                        shape: BoxShape.circle,
                        border: Border.all(color: CxColors.brightRed, width: 2),
                      ),
                      child: ClipOval(
                        child: avatarUrl != null && avatarUrl.toString().isNotEmpty
                            ? Image.network(avatarUrl.toString(), fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Icon(Icons.group, size: 36, color: Colors.white70))
                            : const Icon(Icons.group, size: 36, color: Colors.white70),
                      ),
                    ),
                    Positioned(
                      bottom: 0,
                      right: 0,
                      child: GestureDetector(
                        onTap: () => _pickAndUploadGroupIcon(conv),
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(
                            color: CxColors.brightRed,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: GoogleFonts.orbitron(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Tap camera icon to update group profile picture',
                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: Colors.white70),
                title: Text('Change Group Icon', style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickAndUploadGroupIcon(conv);
                },
              ),
              ListTile(
                leading: const Icon(Icons.close, color: Colors.white70),
                title: Text('Close', style: GoogleFonts.inter(color: Colors.white, fontSize: 14)),
                onTap: () => Navigator.pop(ctx),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadGroupIcon(Map<String, dynamic> conv) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(source: ImageSource.gallery, maxWidth: 800, maxHeight: 800, imageQuality: 80);
    if (file == null) return;

    final bytes = await file.readAsBytes();
    final base64Image = base64Encode(bytes);
    final convId = conv['id'];

    try {
      final api = CxApiClient();
      final res = await api.dio.patch('/api/chat/conversations/$convId', data: {
        'base64': base64Image,
      });

      if (res.data != null && res.data['ok'] == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Group icon updated successfully!'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update group icon: \${e.toString()}'), backgroundColor: CxColors.brightRed),
        );
      }
    }
  }

  Widget _buildStatusIndicator(Map<String, dynamic> msg, bool isMe, int index) {
    if (!isMe || index != 0) return const SizedBox.shrink();

    final status = msg['status'] ?? 'Sent';
    if (status == 'Sending') {
      return Padding(
        padding: const EdgeInsets.only(top: 2, right: 4),
        child: Text(
          'Sending...',
          style: GoogleFonts.inter(fontSize: 10, color: CxColors.textMuted),
        ),
      );
    }
    if (status == 'Failed') {
      return Padding(
        padding: const EdgeInsets.only(top: 2, right: 4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 10, color: CxColors.brightRed),
            const SizedBox(width: 4),
            Text(
              'Failed • Tap to retry',
              style: GoogleFonts.inter(fontSize: 10, color: CxColors.brightRed),
            ),
          ],
        ),
      );
    }

    // Check if recipient has actually read the message
    final readList = (msg['message_reads'] as List<dynamic>?) ?? [];
    final recipientReads = readList.where((r) => r['core_user_id'] != msg['senderId'] && r['read_at'] != null).toList();
    final String? readAtStr = recipientReads.isNotEmpty
        ? recipientReads.first['read_at']?.toString()
        : (msg['readAt'] != null && msg['readAt'] != msg['createdAt'] ? msg['readAt']?.toString() : null);

    if (readAtStr != null) {
      final readAt = DateTime.tryParse(readAtStr);
      if (readAt != null) {
        final diff = DateTime.now().difference(readAt);
        final seenText = diff.inSeconds < 60
            ? 'Seen just now'
            : diff.inMinutes < 60
                ? 'Seen \${diff.inMinutes}m ago'
                : 'Seen';
        return Padding(
          padding: const EdgeInsets.only(top: 2, right: 4),
          child: Text(
            seenText,
            style: GoogleFonts.inter(fontSize: 10, color: CxColors.textMuted),
          ),
        );
      }
    }

    // Default to true Sent timestamp
    final createdAt = DateTime.tryParse(msg['createdAt']?.toString() ?? '') ?? DateTime.now();
    final diff = DateTime.now().difference(createdAt);
    final sentText = diff.inSeconds < 60
        ? 'Sent just now'
        : diff.inMinutes < 60
            ? 'Sent \${diff.inMinutes}m ago'
            : 'Sent';

    return Padding(
      padding: const EdgeInsets.only(top: 2, right: 4),
      child: Text(
        sentText,
        style: GoogleFonts.inter(fontSize: 10, color: CxColors.textMuted),
      ),
    );
  }
`;

s = s.replace(helperInsertPoint, helpers + "\n" + helperInsertPoint);

// 4. Replace the old status == 'Sending' ? 'Sending...' : 'Seen just now'
const oldStatusSnippet = `                                    if (isMe && index == 0)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2, right: 4),
                                        child: Text(
                                          status == 'Sending' ? 'Sending...' : 'Seen just now',
                                          style: GoogleFonts.inter(fontSize: 10, color: CxColors.textMuted),
                                        ),
                                      ),`;

const newStatusSnippet = `                                    _buildStatusIndicator(msg, isMe, index),`;

s = s.replace(oldStatusSnippet, newStatusSnippet);

// 5. Enhance AppBar with Coworker Profile Quick-view and Group Info
const oldAppBar = `      appBar: CxAppBar(
        title: title,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: CxColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),`;

const newAppBar = `      appBar: AppBar(
        backgroundColor: CxColors.background,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: CxColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        title: InkWell(
          onTap: () {
            final isDirect = widget.conversation['type'] == 'DIRECT' || widget.conversation['recipientUser'] != null;
            if (isDirect) {
              final recipient = widget.conversation['recipientUser'];
              if (recipient != null) {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CoworkerProfileScreen(coworker: Map<String, dynamic>.from(recipient)),
                  ),
                );
              }
            } else {
              _showGroupInfoModal(widget.conversation);
            }
          },
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: CxColors.cardElevated),
                child: ClipOval(
                  child: widget.conversation['recipientUser']?['profileMediaUrl'] != null
                      ? Image.network(
                          widget.conversation['recipientUser']['profileMediaUrl'],
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.person, size: 20, color: Colors.white70),
                        )
                      : (widget.conversation['type'] == 'GROUP'
                          ? const Icon(Icons.group, size: 20, color: Colors.white70)
                          : const Icon(Icons.person, size: 20, color: Colors.white70)),
                ),
              ),
              const SizedBox(width: 10),
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
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      widget.conversation['recipientUser']?['role'] ??
                          (widget.conversation['type'] == 'GROUP' ? 'Group Info' : 'Active'),
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        color: CxColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),`;

s = s.replace(oldAppBar, newAppBar);

fs.writeFileSync(target, s, "utf8");
console.log("Successfully updated messages_screen.dart with accurate read receipts, coworker profile navigation, and group icon management!");
