import fs from "fs";

const p = "G:/AntiGravity IDE/codexa app/lib/features/payments/payments_screen.dart";
let s = fs.readFileSync(p, "utf8");

if (!s.includes("import 'post_payment_benefits_view.dart';")) {
  s = "import 'post_payment_benefits_view.dart';\n" + s;
}

const target = `                      Text(
                        'Official CodeXa Service receipt generated.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: CxColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ] else if (isCashPending) ...[`;

const replacement = `                      Text(
                        'Official CodeXa Service receipt generated.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: CxColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: CxSpacing.xl),
          const PostPaymentBenefitsView(),
        ] else if (isCashPending) ...[`;

s = s.replace(target, replacement);
fs.writeFileSync(p, s, "utf8");
console.log("Wired PostPaymentBenefitsView into payments_screen.dart!");
