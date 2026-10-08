import { db } from "../src/lib/db";

async function main() {
  const [subRes, aiRes] = await Promise.all([
    db.$queryRawUnsafe<any[]>(`
      SELECT 
        s.id, s.user_id, s.storage_path, s.image_url, s.version, s.status,
        s.rejection_reason, s.reviewed_by_name, s.reviewed_at, s.submitted_at,
        u."fullName" as full_name, u.username, u.email, u.role,
        ep."employeeId" as intern_id, ep."employeeId" as employee_id, ep.department
      FROM id_card_photo_submissions s
      JOIN "User" u ON u.id = s.user_id
      LEFT JOIN "EmploymentProfile" ep ON ep."userId" = u.id
      ORDER BY s.submitted_at DESC
      LIMIT 10
    `),
    db.$queryRawUnsafe<any[]>(`
      SELECT 
        r.id, r.user_id, r.resource_type, r.reason, r.status,
        r.reviewer_decision, r.reviewer_notes, r.reviewed_by_name, r.reviewed_at,
        r.provisioning_status, r.provisioned_at, r.activation_instructions, r.requested_at,
        u."fullName" as full_name, u.username, u.email, u.role,
        ep."employeeId" as intern_id, ep."employeeId" as employee_id, ep.department
      FROM ai_access_requests r
      JOIN "User" u ON u.id = r.user_id
      LEFT JOIN "EmploymentProfile" ep ON ep."userId" = u.id
      ORDER BY r.requested_at DESC
      LIMIT 10
    `)
  ]);

  console.log("Submissions query SUCCESS, count:", subRes.length);
  console.log("AI Requests query SUCCESS, count:", aiRes.length);
}

main().catch(console.error).finally(() => db.$disconnect());
