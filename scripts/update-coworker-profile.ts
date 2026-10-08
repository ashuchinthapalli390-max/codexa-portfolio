import fs from "fs";

const target = "G:/AntiGravity IDE/codexa app/lib/features/profile/coworker_profile_screen.dart";
let s = fs.readFileSync(target, "utf8");

if (!s.contains || !s.includes("INTERNSHIP DETAILS")) {
  const insertBefore = "// Bio / About";
  const internshipSnippet = `// Internship Details Card (for Interns)
                if (role == 'INTERN') ...[
                  CxCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(
                              Icons.school_outlined,
                              size: 16,
                              color: CxColors.brightRed,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'INTERNSHIP DETAILS',
                              style: GoogleFonts.orbitron(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: CxColors.textPrimary,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: CxSpacing.md),
                        _buildRow('Intern ID', employeeId ?? 'CXA-INT-2026'),
                        const Divider(color: CxColors.borderSubtle, height: 16),
                        _buildRow('Domain', (profile['internshipDomain'] ?? department ?? 'Software Engineering').toString()),
                        const Divider(color: CxColors.borderSubtle, height: 16),
                        _buildRow('Duration', (profile['internshipDuration'] ?? '3 Months').toString()),
                        if (profile['startDate'] != null) ...[
                          const Divider(color: CxColors.borderSubtle, height: 16),
                          _buildRow('Start Date', profile['startDate'].toString().split('T').first),
                        ],
                        if (profile['endDate'] != null) ...[
                          const Divider(color: CxColors.borderSubtle, height: 16),
                          _buildRow('End Date', profile['endDate'].toString().split('T').first),
                        ],
                        const Divider(color: CxColors.borderSubtle, height: 16),
                        _buildRow('Mentor / Lead', (profile['mentorName'] ?? 'Shaik Ashu (Founder)').toString()),
                      ],
                    ),
                  ),
                  const SizedBox(height: CxSpacing.lg),
                ],

                `;

  s = s.replace(insertBefore, internshipSnippet + insertBefore);

  // Add _buildRow helper method before last closing brace
  const lastBrace = s.lastIndexOf("}");
  const helper = `
  Widget _buildRow(String label, String value) {
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
`;
  s = s.substring(0, lastBrace) + helper + "}\n";
  fs.writeFileSync(target, s, "utf8");
  console.log("Updated coworker_profile_screen.dart with internship details!");
} else {
  console.log("Already has INTERNSHIP DETAILS");
}
