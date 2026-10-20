import {
  isLeadershipRole,
  getStickerRolePermissions,
  createManagedStickerPack,
  getManagedStickerPacks,
  updateManagedStickerPack,
  deleteManagedStickerPack,
} from "../src/lib/sticker-packs";
import { AuthenticatedUser } from "../src/lib/auth";

console.log("=== CODEXA MOBILE V10 — STICKER PACK RBAC & MANAGEMENT VERIFICATION ===");

const founderUser: AuthenticatedUser = {
  id: "user_founder_001",
  username: "founder_ashu",
  email: "founder@codxa-agency.online",
  role: "FOUNDER",
  orgRole: "FOUNDER",
  isActive: true,
  displayName: "Shaik Ashu (Founder)",
  mediaUrl: null,
};

const ctoUser: AuthenticatedUser = {
  id: "user_cto_001",
  username: "cto_lead",
  email: "cto@codxa-agency.online",
  role: "CTO",
  orgRole: "CTO",
  isActive: true,
  displayName: "CodeXa CTO",
  mediaUrl: null,
};

const internUser: AuthenticatedUser = {
  id: "user_intern_001",
  username: "intern_jane",
  email: "intern@codxa-agency.online",
  role: "INTERN",
  orgRole: "INTERN",
  isActive: true,
  displayName: "Jane Doe (Intern)",
  mediaUrl: null,
};

// 1. Role Authorization Check
if (!isLeadershipRole(founderUser.role, founderUser.orgRole)) throw new Error("Founder must be leadership role");
if (!isLeadershipRole(ctoUser.role, ctoUser.orgRole)) throw new Error("CTO must be leadership role");
if (isLeadershipRole(internUser.role, internUser.orgRole)) throw new Error("Intern must NOT be leadership role");
console.log("✅ Passed: Leadership role classification (Founder, CTO = true, Intern = false)");

// 2. Permission Evaluation
const founderPerms = getStickerRolePermissions(founderUser.role, founderUser.orgRole);
const internPerms = getStickerRolePermissions(internUser.role, internUser.orgRole);

if (!founderPerms.CAN_CREATE_STICKER_PACK || !founderPerms.CAN_PUBLISH_STICKER_PACK) {
  throw new Error("Founder must have CAN_CREATE_STICKER_PACK and CAN_PUBLISH_STICKER_PACK");
}
if (!internPerms.CAN_USE_STICKERS) throw new Error("Intern must have CAN_USE_STICKERS");
if (internPerms.CAN_CREATE_STICKER_PACK || internPerms.CAN_PUBLISH_STICKER_PACK) {
  throw new Error("Intern must NOT have create or publish sticker permissions");
}
console.log("✅ Passed: Granular permissions (Intern can USE but cannot CREATE or PUBLISH)");

// 3. Intern Creation Denial
const internAttempt = createManagedStickerPack(internUser, {
  name: "Unauthorized Intern Pack",
  stickers: [{ id: "stk_1", mimeType: "image/webp", animated: false, sha256: "abc1", byteLength: 5000 }],
});
if (internAttempt.ok) throw new Error("Intern creation must be rejected with 403 Forbidden");
console.log("✅ Passed: Intern creation denied with Forbidden error");

// 4. Founder Creation Success with zero image bytes in record
const founderCreated = createManagedStickerPack(founderUser, {
  name: "Executive Reactions V10",
  description: "Official CodeXa leadership reactions",
  status: "PUBLISHED",
  audience: "ALL",
  stickers: [
    { id: "stk_exec_1", mimeType: "image/webp", animated: false, sha256: "hash_exec_1", byteLength: 12500 },
    { id: "stk_exec_2", mimeType: "image/webp", animated: true, sha256: "hash_exec_2", byteLength: 45000 },
  ],
});
if (!founderCreated.ok || !founderCreated.pack) throw new Error("Founder creation failed: " + founderCreated.error);
const pack = founderCreated.pack;

// Verify zero image bytes / zero base64 in metadata
const packStr = JSON.stringify(pack);
if (packStr.includes("base64") || packStr.includes("data:image")) {
  throw new Error("Found base64/data image in pack record! Violation of PART 38");
}
console.log("✅ Passed: Founder created managed pack with clean metadata and zero image bytes");

// 5. Audience Visibility Check
const internView = getManagedStickerPacks(internUser);
const foundInInternView = internView.packs.some((p) => p.id === pack.id);
if (!foundInInternView) throw new Error("Published pack with audience ALL must be visible to Intern");

// Unpublish pack and verify Intern can no longer see it
updateManagedStickerPack(founderUser, pack.id, { status: "UNPUBLISHED" });
const internViewAfterUnpublish = getManagedStickerPacks(internUser);
const foundAfterUnpublish = internViewAfterUnpublish.packs.some((p) => p.id === pack.id);
if (foundAfterUnpublish) throw new Error("Unpublished pack must NOT be visible to Intern");
console.log("✅ Passed: Audience visibility (Unpublished pack hidden from Intern)");

// 6. Delete Pack Cleanup
deleteManagedStickerPack(founderUser, pack.id);
const finalPacks = getManagedStickerPacks(founderUser);
if (finalPacks.packs.some((p) => p.id === pack.id)) throw new Error("Pack was not deleted");
console.log("✅ Passed: Leadership successfully deleted pack and verified cleanup");

console.log("\n🎉 ALL STICKER PACK RBAC & MANAGEMENT UNIT TESTS PASSED!");
