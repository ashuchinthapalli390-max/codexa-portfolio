import fs from "fs";

const p = "G:/AntiGravity IDE/codexa app/lib/features/attendance/attendance_screen.dart";
let s = fs.readFileSync(p, "utf8");

// 1. Add imports for classes and assignments screens
if (!s.includes("class_details_screen.dart")) {
  s = `import '../classes/class_details_screen.dart';\nimport '../assignments/assignments_screen.dart';\n` + s;
}

// 2. Add classes provider
if (!s.includes("classesEndpointProvider")) {
  const providerOld = `final attendanceEndpointProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {`;
  const providerNew = `final classesEndpointProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final api = CxApiClient();
  try {
    final res = await api.dio.get('/api/mobile/classes');
    if (res.data != null && res.data['ok'] == true) {
      return Map<String, dynamic>.from(res.data);
    }
  } catch (_) {}
  return {};
});

final attendanceEndpointProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {`;
  s = s.replace(providerOld, providerNew);
}

// 3. Add Scheduled Classes and Assignments section to _buildParticipantView
const historyOld = `          // 4. Monthly History\n          Text(\n            'RECENT ATTENDANCE HISTORY',`;
const historyNew = `          // --- QUICK LINK TO ASSIGNMENTS ---
          Container(
            margin: const EdgeInsets.only(bottom: 24),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: CxColors.cardElevated,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: CxColors.borderSubtle),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: CxColors.brightRed.withAlpha(30),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.assignment_turned_in_outlined, color: CxColors.brightRed, size: 24),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'PROJECT ASSIGNMENTS',
                        style: GoogleFonts.orbitron(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                      Text(
                        'Submit text & code repo assignments',
                        style: GoogleFonts.inter(fontSize: 11, color: CxColors.textSecondary),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const AssignmentsScreen()),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: CxColors.brightRed,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  ),
                  child: Text(
                    'VIEW',
                    style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
          ),

          // --- SCHEDULED CLASSES SECTION ---
          _buildScheduledClassesSection(),

          const SizedBox(height: 24),

          // 4. Monthly History
          Text(
            'RECENT ATTENDANCE HISTORY',`;

s = s.replace(historyOld, historyNew);

// 4. Add _buildScheduledClassesSection helper method to _AttendanceScreenState
const classHelper = `
  Widget _buildScheduledClassesSection() {
    final classesAsync = ref.watch(classesEndpointProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.school_outlined, size: 16, color: CxColors.brightRed),
                const SizedBox(width: 8),
                Text(
                  'SCHEDULED CLASSES',
                  style: GoogleFonts.orbitron(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: CxColors.textPrimary,
                    letterSpacing: 1.0,
                  ),
                ),
              ],
            ),
            IconButton(
              icon: const Icon(Icons.refresh, size: 16, color: CxColors.textSecondary),
              onPressed: () => ref.invalidate(classesEndpointProvider),
            ),
          ],
        ),
        const SizedBox(height: 12),
        classesAsync.when(
          loading: () => const Center(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(color: CxColors.brightRed),
            ),
          ),
          error: (_, __) => const SizedBox.shrink(),
          data: (classesData) {
            final todayList = (classesData['today'] as List<dynamic>?) ?? [];
            final upcomingList = (classesData['upcoming'] as List<dynamic>?) ?? [];

            if (todayList.isEmpty && upcomingList.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: CxColors.card,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: CxColors.borderSubtle),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.event_available, color: CxColors.textSecondary, size: 24),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'No classes scheduled for today. Check upcoming sessions soon.',
                        style: GoogleFonts.inter(fontSize: 12, color: CxColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              );
            }

            return Column(
              children: [
                ...todayList.map((c) => _buildClassCard(Map<String, dynamic>.from(c), isToday: true)),
                if (upcomingList.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ...upcomingList.take(3).map((c) => _buildClassCard(Map<String, dynamic>.from(c), isToday: false)),
                ],
              ],
            );
          },
        ),
      ],
    );
  }

  Widget _buildClassCard(Map<String, dynamic> c, {required bool isToday}) {
    final title = c['title'] ?? 'Class Session';
    final topic = c['topic'] ?? '';
    final instructor = c['instructor_name'] ?? 'CodeXa Instructor';
    final startTime = c['start_time'] ?? '';
    final endTime = c['end_time'] ?? '';
    final status = c['status'] ?? 'UPCOMING';
    final date = c['class_date'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: CxColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isToday ? CxColors.brightRed.withAlpha(80) : CxColors.borderSubtle,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isToday ? CxColors.brightRed.withAlpha(30) : Colors.blueGrey.withAlpha(30),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isToday ? 'TODAY\\'S CLASS' : 'UPCOMING ($date)',
                  style: GoogleFonts.orbitron(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isToday ? CxColors.brightRed : Colors.blueGrey,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: status == 'LIVE' ? Colors.green.withAlpha(40) : Colors.black45,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  status,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: status == 'LIVE' ? Colors.greenAccent : Colors.white70,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            title,
            style: GoogleFonts.orbitron(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            topic,
            style: GoogleFonts.inter(fontSize: 12, color: Colors.white70),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.person_outline, size: 14, color: CxColors.textMuted),
              const SizedBox(width: 4),
              Text(
                instructor,
                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textMuted),
              ),
              const Spacer(),
              const Icon(Icons.access_time, size: 14, color: CxColors.textMuted),
              const SizedBox(width: 4),
              Text(
                '$startTime - $endTime',
                style: GoogleFonts.inter(fontSize: 11, color: CxColors.textMuted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => ClassDetailsScreen(classData: c)),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: CxColors.borderSubtle),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: Text(
                'VIEW TOPICS & JOIN',
                style: GoogleFonts.orbitron(fontSize: 11, fontWeight: FontWeight.bold, color: CxColors.brightRed),
              ),
            ),
          ),
        ],
      ),
    );
  }
`;

// Insert the helper methods before the last closing brace
const lastBrace = s.lastIndexOf("}");
s = s.substring(0, lastBrace) + classHelper + "\n}\n";

fs.writeFileSync(p, s, "utf8");
console.log("Updated attendance_screen.dart with Scheduled Classes and Assignments!");
