import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';

import '../../core/api/api_client.dart';
import '../../core/models/models.dart';
import '../../core/providers/app_providers.dart';
import '../../core/theme/cx_theme.dart';
import '../../core/widgets/cx_components.dart';
import '../../core/widgets/cx_in_app_browser.dart';
import '../assistant/ai_chat_screen.dart';
import 'notes_row.dart';

// --- CHAT CONVERSATIONS PROVIDER ---
final chatConversationsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
      final api = CxApiClient();
      try {
        final res = await api.dio.get('/api/chat/conversations');
        if (res.data != null &&
            (res.data['ok'] == true || res.data['success'] == true)) {
          return (res.data['conversations'] as List<dynamic>?)
                  ?.map((c) => Map<String, dynamic>.from(c))
                  .toList() ??
              [];
        }
      } catch (_) {}
      return [];
    });

class MessagesScreen extends ConsumerStatefulWidget {
  const MessagesScreen({super.key});

  @override
  ConsumerState<MessagesScreen> createState() => _MessagesScreenState();
}

class _MessagesScreenState extends ConsumerState<MessagesScreen> {
  final _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedTab = 'ALL';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _openChat(Map<String, dynamic> conversation) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ChatConversationScreen(conversation: conversation),
      ),
    );
  }

  Widget _buildFilterTab(String label) {
    final isSelected = _selectedTab == label;
    return InkWell(
      onTap: () => setState(() => _selectedTab = label),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? CxColors.brightRed : CxColors.cardElevated,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? CxColors.brightRed : CxColors.borderSubtle,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.orbitron(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : CxColors.textSecondary,
            letterSpacing: 0.8,
          ),
        ),
      ),
    );
  }

  void _openNewChatDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: CxColors.cardElevated,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Consumer(
        builder: (ctx, ref, _) {
          final peopleAsync = ref.watch(peopleListProvider);
          final searchCtrl = TextEditingController();
          final groupNameCtrl = TextEditingController();
          String localQuery = '';
          String activeMode = 'DIRECT'; // DIRECT or GROUP
          final selectedMembers = <String>{};

          return StatefulBuilder(
            builder: (ctx, setSheetState) => Container(
              height: MediaQuery.of(context).size.height * 0.82,
              padding: const EdgeInsets.all(CxSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        activeMode == 'DIRECT' ? 'NEW DIRECT MESSAGE' : 'CREATE NEW GROUP',
                        style: GoogleFonts.orbitron(
                          fontSize: 13,
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
                  const SizedBox(height: 8),

                  // Mode Toggle
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: activeMode == 'DIRECT' ? CxColors.brightRed.withOpacity(0.15) : Colors.transparent,
                            side: BorderSide(color: activeMode == 'DIRECT' ? CxColors.brightRed : CxColors.borderSubtle),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => setSheetState(() => activeMode = 'DIRECT'),
                          child: Text(
                            'DIRECT CHAT',
                            style: GoogleFonts.orbitron(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: activeMode == 'DIRECT' ? CxColors.brightRed : CxColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            backgroundColor: activeMode == 'GROUP' ? CxColors.brightRed.withOpacity(0.15) : Colors.transparent,
                            side: BorderSide(color: activeMode == 'GROUP' ? CxColors.brightRed : CxColors.borderSubtle),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          onPressed: () => setSheetState(() => activeMode = 'GROUP'),
                          child: Text(
                            'CREATE GROUP',
                            style: GoogleFonts.orbitron(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: activeMode == 'GROUP' ? CxColors.brightRed : CxColors.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: CxSpacing.sm),

                  if (activeMode == 'GROUP') ...[
                    CxTextField(
                      hint: 'Group Name (e.g. Frontend Core, Project Alpha)',
                      controller: groupNameCtrl,
                    ),
                    const SizedBox(height: CxSpacing.sm),
                    Text(
                      'Select Members (${selectedMembers.length} selected):',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: CxColors.textSecondary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                  ],

                  CxTextField(
                    hint: 'Search coworkers by name, role...',
                    controller: searchCtrl,
                    prefixIcon: const Icon(Icons.search, size: 18, color: CxColors.textSecondary),
                    onChanged: (val) => setSheetState(() => localQuery = val.trim().toLowerCase()),
                  ),
                  const SizedBox(height: CxSpacing.sm),

                  Expanded(
                    child: peopleAsync.when(
                      loading: () => const Center(
                        child: CircularProgressIndicator(color: CxColors.brightRed),
                      ),
                      error: (err, _) => Center(
                        child: Text(
                          'Unable to load team directory',
                          style: GoogleFonts.inter(fontSize: 12, color: CxColors.textMuted),
                        ),
                      ),
                      data: (people) {
                        final currentUser = ref.read(authProvider).user;
                        final filtered = people.where((p) {
                          if (p.id == currentUser?.id) return false;
                          if (localQuery.isEmpty) return true;
                          return p.fullName.toLowerCase().contains(localQuery) ||
                              p.username.toLowerCase().contains(localQuery) ||
                              p.role.toLowerCase().contains(localQuery) ||
                              (p.department?.toLowerCase().contains(localQuery) ?? false);
                        }).toList();

                        if (filtered.isEmpty) {
                          return const Center(
                            child: CxEmptyState(
                              icon: Icons.person_search,
                              title: 'NO MEMBERS FOUND',
                              message: 'No coworkers match your search query.',
                            ),
                          );
                        }

                        return ListView.separated(
                          itemCount: filtered.length,
                          separatorBuilder: (_, __) => const Divider(
                            color: CxColors.borderSubtle,
                            height: 1,
                            indent: 60,
                          ),
                          itemBuilder: (context, index) {
                            final coworker = filtered[index];
                            final isSelected = selectedMembers.contains(coworker.id);

                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                              leading: CxAvatar(
                                name: coworker.fullName,
                                imageUrl: coworker.profileMediaUrl,
                                size: 40,
                              ),
                              title: Text(
                                coworker.fullName,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: CxColors.textPrimary,
                                ),
                              ),
                              subtitle: Text(
                                '${coworker.role.toUpperCase()} • ${coworker.designation ?? coworker.department ?? "Engineering"}',
                                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textMuted),
                              ),
                              trailing: activeMode == 'GROUP'
                                  ? Checkbox(
                                      value: isSelected,
                                      activeColor: CxColors.brightRed,
                                      onChanged: (val) {
                                        setSheetState(() {
                                          if (val == true) {
                                            selectedMembers.add(coworker.id);
                                          } else {
                                            selectedMembers.remove(coworker.id);
                                          }
                                        });
                                      },
                                    )
                                  : const Icon(Icons.arrow_forward_ios, size: 12, color: CxColors.textMuted),
                              onTap: () {
                                if (activeMode == 'GROUP') {
                                  setSheetState(() {
                                    if (isSelected) {
                                      selectedMembers.remove(coworker.id);
                                    } else {
                                      selectedMembers.add(coworker.id);
                                    }
                                  });
                                } else {
                                  Navigator.pop(ctx);
                                  _startDirectMessageWith(coworker);
                                }
                              },
                            );
                          },
                        );
                      },
                    ),
                  ),

                  if (activeMode == 'GROUP') ...[
                    const SizedBox(height: CxSpacing.sm),
                    CxButton(
                      label: 'CREATE GROUP (${selectedMembers.length} MEMBERS)',
                      icon: Icons.group_add_outlined,
                      onPressed: () async {
                        final gName = groupNameCtrl.text.trim();
                        if (gName.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Please enter a group name'),
                              backgroundColor: CxColors.error,
                            ),
                          );
                          return;
                        }
                        Navigator.pop(ctx);
                        final api = CxApiClient();
                        try {
                          final res = await api.dio.post(
                            '/api/chat/conversations',
                            data: {
                              'type': 'GROUP',
                              'title': gName,
                              'memberIds': selectedMembers.toList(),
                            },
                          );
                          if (res.data != null && res.data['ok'] == true) {
                            ref.invalidate(chatConversationsProvider);
                            final conv = res.data['conversation'];
                            if (mounted && conv != null) {
                              _openChat(Map<String, dynamic>.from(conv));
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
                        }
                      },
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _startDirectMessageWith(PeopleModel coworker) async {
    try {
      final api = CxApiClient();
      final res = await api.dio.post(
        '/api/mobile/chat/direct',
        data: {'targetUserId': coworker.id},
      );

      if (res.data != null && res.data['ok'] == true) {
        final convId = res.data['conversationId'];
        if (mounted) {
          _openChat({
            'id': convId,
            'name': coworker.fullName,
            'title': coworker.fullName,
            'avatarUrl': coworker.profileMediaUrl,
            'peer': {
              'id': coworker.id,
              'name': coworker.fullName,
              'role': coworker.role,
            },
          });
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
    }
  }

  Future<void> _startDirectMessageById(String userId, String name, [String? initialText]) async {
    try {
      final api = CxApiClient();
      final res = await api.dio.post(
        '/api/mobile/chat/direct',
        data: {'targetUserId': userId},
      );

      if (res.data != null && res.data['ok'] == true) {
        final convId = res.data['conversationId'];
        if (mounted) {
          _openChat({
            'id': convId,
            'name': name,
            'title': name,
            'peer': {
              'id': userId,
              'name': name,
            },
            'initialText': initialText,
          });
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final conversationsAsync = ref.watch(chatConversationsProvider);

    return Scaffold(
      backgroundColor: CxColors.background,
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: CxColors.brightRed,
        icon: const Icon(
          Icons.chat_bubble_outline,
          color: Colors.white,
          size: 18,
        ),
        label: Text(
          'NEW CHAT',
          style: GoogleFonts.orbitron(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: 0.8,
          ),
        ),
        onPressed: () => _openNewChatDialog(context),
      ),
      body: Column(
        children: [
          // 1. Search Bar
          Padding(
            padding: const EdgeInsets.only(
              left: CxSpacing.lg,
              right: CxSpacing.lg,
              top: CxSpacing.lg,
            ),
            child: CxTextField(
              hint: 'Search conversations...',
              controller: _searchController,
              prefixIcon: const Icon(
                Icons.search,
                size: 20,
                color: CxColors.textSecondary,
              ),
              onChanged: (val) => setState(() => _searchQuery = val.toLowerCase()),
            ),
          ),
          const SizedBox(height: CxSpacing.xs),

          // 2. 24-Hour Notes Row
          NotesRow(
            onReplyNote: (targetUserId, targetName, initialText) {
              _startDirectMessageById(targetUserId, targetName, initialText);
            },
          ),
          const SizedBox(height: CxSpacing.xs),

          // 3. Filter Tabs
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: CxSpacing.lg),
            child: Row(
              children: [
                _buildFilterTab('ALL'),
                const SizedBox(width: 8),
                _buildFilterTab('DIRECT'),
                const SizedBox(width: 8),
                _buildFilterTab('GROUPS'),
                const SizedBox(width: 8),
                _buildFilterTab('UNREAD'),
              ],
            ),
          ),
          const SizedBox(height: CxSpacing.sm),

          // 4. Prominent CodeXa AI Card
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: CxSpacing.lg,
              vertical: 4,
            ),
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CodexaAiScreen()),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                decoration: BoxDecoration(
                  color: CxColors.cardElevated,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: CxColors.brightRed.withOpacity(0.35),
                  ),
                  boxShadow: CxShadows.subtle,
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(
                        color: CxColors.brightRed,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.auto_awesome,
                        size: 18,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'CODEXA AI',
                                style: GoogleFonts.orbitron(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: CxColors.brightRed,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 5,
                                  vertical: 1,
                                ),
                                decoration: BoxDecoration(
                                  color: CxColors.success.withOpacity(0.18),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'ASSISTANT',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                    color: CxColors.success,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Summarize tasks, draft standup updates & assistance',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: CxColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios,
                      size: 12,
                      color: CxColors.textMuted,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),

          // 5. Conversation Stream
          Expanded(
            child: conversationsAsync.when(
              loading: () => const Center(
                child: CircularProgressIndicator(color: CxColors.brightRed),
              ),
              error: (err, _) => CxEmptyState(
                icon: Icons.chat_bubble_outline,
                title: 'CONVERSATIONS',
                message: 'No active conversations found.',
                action: CxButton(
                  label: 'RELOAD',
                  width: 120,
                  onPressed: () => ref.invalidate(chatConversationsProvider),
                ),
              ),
              data: (conversations) {
                final filtered = conversations.where((c) {
                  final name =
                      (c['name'] ?? c['title'] ?? c['displayName'] ?? '')
                          .toString()
                          .toLowerCase();
                  if (_searchQuery.isNotEmpty && !name.contains(_searchQuery)) {
                    return false;
                  }
                  if (_selectedTab == 'DIRECT' && c['type'] != 'DIRECT') return false;
                  if (_selectedTab == 'GROUPS' && c['type'] == 'DIRECT') return false;
                  if (_selectedTab == 'UNREAD' && (c['unreadCount'] ?? 0) == 0) return false;
                  return true;
                }).toList();

                if (filtered.isEmpty) {
                  return const Center(
                    child: CxEmptyState(
                      icon: Icons.chat_bubble_outline,
                      title: 'NO CONVERSATIONS',
                      message: 'Start a direct chat or create a group to begin messaging.',
                    ),
                  );
                }

                return RefreshIndicator(
                  color: CxColors.brightRed,
                  backgroundColor: CxColors.cardElevated,
                  onRefresh: () async {
                    ref.invalidate(chatConversationsProvider);
                  },
                  child: ListView.separated(
                    padding: const EdgeInsets.symmetric(
                      horizontal: CxSpacing.lg,
                      vertical: CxSpacing.sm,
                    ),
                    itemCount: filtered.length,
                    separatorBuilder: (_, __) => const Divider(
                      color: CxColors.borderSubtle,
                      height: 1,
                      indent: 64,
                    ),
                    itemBuilder: (context, index) {
                      final item = filtered[index];
                      final name = item['name'] ?? item['title'] ?? 'Chat';
                      final type = item['type'] ?? 'DIRECT';
                      final lastMsg = item['lastMessage'] is Map ? item['lastMessage']['text'] : item['lastMessage'];
                      final unread = item['unreadCount'] ?? 0;
                      final avatarUrl = item['avatarUrl'] ?? item['recipientUser']?['profileMediaUrl'];

                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 4,
                          vertical: 4,
                        ),
                        leading: CxAvatar(
                          name: name,
                          imageUrl: avatarUrl,
                          size: 46,
                        ),
                        title: Row(
                          children: [
                            Expanded(
                              child: Text(
                                name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: unread > 0 ? FontWeight.w700 : FontWeight.w600,
                                  color: CxColors.textPrimary,
                                ),
                              ),
                            ),
                            if (type == 'GROUP')
                              Container(
                                margin: const EdgeInsets.only(left: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                                decoration: BoxDecoration(
                                  color: CxColors.secondaryDark,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: CxColors.borderSubtle),
                                ),
                                child: Text(
                                  'GRP',
                                  style: GoogleFonts.orbitron(fontSize: 8, color: CxColors.textMuted),
                                ),
                              ),
                          ],
                        ),
                        subtitle: Text(
                          lastMsg != null && lastMsg.toString().isNotEmpty
                              ? lastMsg.toString()
                              : 'No messages yet',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: unread > 0 ? CxColors.textPrimary : CxColors.textMuted,
                            fontWeight: unread > 0 ? FontWeight.w500 : FontWeight.normal,
                          ),
                        ),
                        trailing: unread > 0
                            ? Container(
                                padding: const EdgeInsets.all(6),
                                decoration: const BoxDecoration(
                                  color: CxColors.brightRed,
                                  shape: BoxShape.circle,
                                ),
                                child: Text(
                                  unread > 9 ? '9+' : '$unread',
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: Colors.white,
                                  ),
                                ),
                              )
                            : null,
                        onTap: () => _openChat(item),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// --- FULL REALTIME CHAT CONVERSATION SCREEN ---
class ChatConversationScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> conversation;

  const ChatConversationScreen({super.key, required this.conversation});

  @override
  ConsumerState<ChatConversationScreen> createState() => _ChatConversationScreenState();
}

class _ChatConversationScreenState extends ConsumerState<ChatConversationScreen> {
  final _messageController = TextEditingController();
  final List<Map<String, dynamic>> _messages = [];
  bool _isLoading = false;
  bool _showStickers = false;

  final List<String> _curatedStickers = [
    '🚀', '🔥', '⚡', '💻', '🎯', '💎', '🏆', '❤️', '👏', '🛠️', '✨', '☕'
  ];

  @override
  void initState() {
    super.initState();
    _loadMessages();
    if (widget.conversation['initialText'] != null) {
      _messageController.text = widget.conversation['initialText'];
    }
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages() async {
    setState(() => _isLoading = true);
    final api = CxApiClient();
    final convId = widget.conversation['id'];

    try {
      final res = await api.dio.get('/api/chat/messages?conversationId=$convId');
      if (res.data != null && (res.data['success'] == true || res.data['ok'] == true)) {
        final msgs = (res.data['messages'] as List<dynamic>?)
                ?.map((m) => Map<String, dynamic>.from(m))
                .toList() ??
            [];
        setState(() {
          _messages.clear();
          _messages.addAll(msgs);
        });
      }
    } catch (_) {}
    setState(() => _isLoading = false);
  }

  Future<void> _sendMessage([String? overrideText]) async {
    final text = (overrideText ?? _messageController.text).trim();
    if (text.isEmpty) return;

    final user = ref.read(authProvider).user;
    final convId = widget.conversation['id'];
    const uuid = Uuid();
    final clientId = uuid.v4();

    if (overrideText == null) {
      _messageController.clear();
    }

    // Optimistic local update
    final localMsg = {
      'id': clientId,
      'clientId': clientId,
      'senderId': user?.id ?? '',
      'message': text,
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'Sending',
      'reactions': <String>[],
    };

    setState(() {
      _messages.insert(0, localMsg);
      _showStickers = false;
    });

    final api = CxApiClient();
    try {
      final res = await api.dio.post(
        '/api/chat/messages',
        data: {'conversationId': convId, 'message': text, 'clientId': clientId},
      );

      if (res.data != null && (res.data['success'] == true || res.data['ok'] == true)) {
        setState(() {
          localMsg['status'] = 'Sent';
        });
      }
    } catch (_) {
      setState(() {
        localMsg['status'] = 'Failed';
      });
    }
  }

  Future<void> _pickAndSendMedia(ImageSource source) async {
    final picker = ImagePicker();
    final file = await picker.pickImage(
      source: source,
      maxWidth: 1024,
      maxHeight: 1024,
      imageQuality: 80,
    );
    if (file == null) return;

    final bytes = await file.readAsBytes();
    final base64Image = base64Encode(bytes);
    final user = ref.read(authProvider).user;
    final convId = widget.conversation['id'];
    const uuid = Uuid();
    final clientId = uuid.v4();

    final localMsg = {
      'id': clientId,
      'clientId': clientId,
      'senderId': user?.id ?? '',
      'message': '[Image Attached]',
      'mediaUrl': 'data:image/jpeg;base64,$base64Image',
      'createdAt': DateTime.now().toIso8601String(),
      'status': 'Sending',
      'reactions': <String>[],
    };

    setState(() {
      _messages.insert(0, localMsg);
    });

    final api = CxApiClient();
    try {
      final res = await api.dio.post(
        '/api/chat/messages',
        data: {
          'conversationId': convId,
          'message': '[Image Attached]',
          'clientId': clientId,
          'mediaUrl': 'data:image/jpeg;base64,$base64Image',
        },
      );
      if (res.data != null && (res.data['success'] == true || res.data['ok'] == true)) {
        setState(() {
          localMsg['status'] = 'Sent';
        });
      }
    } catch (_) {
      setState(() {
        localMsg['status'] = 'Failed';
      });
    }
  }

  void _showMessageOptions(Map<String, dynamic> msg) {
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
              'REACTIONS',
              style: GoogleFonts.orbitron(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: CxColors.textSecondary,
              ),
            ),
            const SizedBox(height: CxSpacing.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: ['❤️', '😂', '👍', '🔥', '✅', '👀'].map((emoji) {
                return InkWell(
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      final list = List<String>.from(msg['reactions'] ?? []);
                      if (!list.contains(emoji)) list.add(emoji);
                      msg['reactions'] = list;
                    });
                  },
                  child: Text(emoji, style: const TextStyle(fontSize: 26)),
                );
              }).toList(),
            ),
            const Divider(color: CxColors.borderSubtle, height: 24),
            ListTile(
              dense: true,
              leading: const Icon(Icons.reply, color: CxColors.brightRed, size: 20),
              title: Text('Reply', style: GoogleFonts.inter(color: CxColors.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                _messageController.text = 'Replying to: "${msg['message']}"\n';
              },
            ),
            ListTile(
              dense: true,
              leading: const Icon(Icons.copy, color: CxColors.textMuted, size: 20),
              title: Text('Copy Text', style: GoogleFonts.inter(color: CxColors.textPrimary)),
              onTap: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copied to clipboard'), duration: Duration(seconds: 1)),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.conversation['name'] ?? widget.conversation['title'] ?? 'Chat';
    final user = ref.watch(authProvider).user;

    return Scaffold(
      backgroundColor: CxColors.background,
      appBar: CxAppBar(
        title: title,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: CxColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: _isLoading && _messages.isEmpty
                ? const Center(
                    child: CircularProgressIndicator(color: CxColors.brightRed),
                  )
                : _messages.isEmpty
                    ? const Center(
                        child: CxEmptyState(
                          icon: Icons.chat_bubble_outline,
                          title: 'NO MESSAGES YET',
                          message: 'Send a message to begin the conversation.',
                        ),
                      )
                    : ListView.builder(
                        reverse: true,
                        padding: const EdgeInsets.all(CxSpacing.lg),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['senderId'] == user?.id;
                          final body = msg['message'] ?? '';
                          final status = msg['status'] ?? 'Sent';
                          final reactions = (msg['reactions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
                          final isUrl = body.startsWith('http://') || body.startsWith('https://');

                          return GestureDetector(
                            onLongPress: () => _showMessageOptions(msg),
                            child: Align(
                              alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                constraints: BoxConstraints(
                                  maxWidth: MediaQuery.of(context).size.width * 0.78,
                                ),
                                child: Column(
                                  crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      decoration: BoxDecoration(
                                        color: isMe ? CxColors.brightRed : CxColors.cardElevated,
                                        borderRadius: BorderRadius.circular(14),
                                        border: isMe ? null : Border.all(color: CxColors.borderSubtle),
                                      ),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          if (isUrl)
                                            InkWell(
                                              onTap: () => CxInAppBrowser.openUrl(context, body),
                                              child: Text(
                                                body,
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  color: Colors.white,
                                                  decoration: TextDecoration.underline,
                                                ),
                                              ),
                                            )
                                          else
                                            Text(
                                              body,
                                              style: GoogleFonts.inter(fontSize: 13, color: Colors.white),
                                            ),
                                          if (msg['mediaUrl'] != null) ...[
                                            const SizedBox(height: 6),
                                            ClipRRect(
                                              borderRadius: BorderRadius.circular(8),
                                              child: Image.network(
                                                msg['mediaUrl'],
                                                height: 140,
                                                width: double.infinity,
                                                fit: BoxFit.cover,
                                                errorBuilder: (_, __, ___) => const Icon(Icons.broken_image, color: Colors.white70),
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    if (reactions.isNotEmpty)
                                      Container(
                                        margin: const EdgeInsets.only(top: 2),
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: CxColors.cardElevated,
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: CxColors.borderSubtle),
                                        ),
                                        child: Text(reactions.join(' '), style: const TextStyle(fontSize: 11)),
                                      ),
                                    if (isMe && index == 0)
                                      Padding(
                                        padding: const EdgeInsets.only(top: 2, right: 4),
                                        child: Text(
                                          status == 'Sending' ? 'Sending...' : 'Seen just now',
                                          style: GoogleFonts.inter(fontSize: 10, color: CxColors.textMuted),
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

          // Sticker Panel (if toggled)
          if (_showStickers)
            Container(
              height: 120,
              padding: const EdgeInsets.all(CxSpacing.md),
              decoration: const BoxDecoration(
                color: CxColors.secondaryDark,
                border: Border(top: BorderSide(color: CxColors.borderSubtle)),
              ),
              child: GridView.count(
                crossAxisCount: 6,
                children: _curatedStickers.map((sticker) {
                  return InkWell(
                    onTap: () => _sendMessage(sticker),
                    child: Center(
                      child: Text(sticker, style: const TextStyle(fontSize: 28)),
                    ),
                  );
                }).toList(),
              ),
            ),

          // Enhanced Chat Composer
          Container(
            padding: EdgeInsets.only(
              left: CxSpacing.sm,
              right: CxSpacing.sm,
              top: CxSpacing.xs,
              bottom: MediaQuery.of(context).viewInsets.bottom + CxSpacing.sm,
            ),
            decoration: const BoxDecoration(
              color: CxColors.cardElevated,
              border: Border(top: BorderSide(color: CxColors.borderSubtle)),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.camera_alt_outlined, color: CxColors.textSecondary, size: 22),
                  onPressed: () => _pickAndSendMedia(ImageSource.camera),
                ),
                IconButton(
                  icon: const Icon(Icons.photo_library_outlined, color: CxColors.textSecondary, size: 22),
                  onPressed: () => _pickAndSendMedia(ImageSource.gallery),
                ),
                IconButton(
                  icon: Icon(
                    _showStickers ? Icons.keyboard : Icons.emoji_emotions_outlined,
                    color: _showStickers ? CxColors.brightRed : CxColors.textSecondary,
                    size: 22,
                  ),
                  onPressed: () => setState(() => _showStickers = !_showStickers),
                ),
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    style: GoogleFonts.inter(color: CxColors.textPrimary, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: GoogleFonts.inter(color: CxColors.textMuted, fontSize: 13),
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    ),
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send_rounded, color: CxColors.brightRed, size: 24),
                  onPressed: () => _sendMessage(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
