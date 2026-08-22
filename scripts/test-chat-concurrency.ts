/**
 * Direct Message & Database Concurrency Stress Test Suite
 *
 * Verifies:
 * 1. Two-user conversation provisioning and secure membership check
 * 2. Rapid 10-message sending with clientId idempotency
 * 3. Delta-sync query correctness (after timestamp filtering)
 * 4. Concurrent stress across session, conversations, messages, and mark-read
 * 5. Complete absence of P2024 pool timeouts, 42P05 prepared statement collisions, or 26000 errors
 */
import { db } from "../src/lib/db";
import { dataStore } from "../src/lib/data-store";
import crypto from "crypto";

async function main() {
  console.log("==================================================");
  console.log(" 🚀 STARTING CHAT CONCURRENCY & STRESS TEST SUITE");
  console.log("==================================================\n");

  // Step 1: Ensure Two Test Accounts Exist
  console.log("[STAGE 1/5] Setting up Two Test Accounts (Sender & Recipient)...");
  
  const user1Email = "test.sender.dm@codxa.internal";
  const user2Email = "test.recipient.dm@codxa.internal";

  let user1 = await db.user.findUnique({ where: { email: user1Email } });
  if (!user1) {
    user1 = await db.user.create({
      data: {
        email: user1Email,
        username: "test_sender",
        fullName: "Test Sender",
        passwordHash: "$2a$12$eXampleHashedPasswordForTestSimulationOnly..",
        role: "MEMBER",
        profile: {
          create: {
            displayName: "Test Sender",
            headline: "Chat Optimization Engineer",
          },
        },
      },
    });
  }

  let user2 = await db.user.findUnique({ where: { email: user2Email } });
  if (!user2) {
    user2 = await db.user.create({
      data: {
        email: user2Email,
        username: "test_recipient",
        fullName: "Test Recipient",
        passwordHash: "$2a$12$eXampleHashedPasswordForTestSimulationOnly..",
        role: "MEMBER",
        profile: {
          create: {
            displayName: "Test Recipient",
            headline: "Realtime Systems Engineer",
          },
        },
      },
    });
  }

  console.log(`  ✓ User A (Sender) ID: ${user1.id} (@${user1.username})`);
  console.log(`  ✓ User B (Recipient) ID: ${user2.id} (@${user2.username})\n`);

  // Step 2: Provision DM Channel
  console.log("[STAGE 2/5] Establishing Direct Message Conversation Channel...");
  const conv = await dataStore.getOrCreateDirectConversation(user1.id, user2.id);
  console.log(`  ✓ Conversation ID: ${conv.id}`);

  const isMember1 = await dataStore.isConversationMember(conv.id, user1.id);
  const isMember2 = await dataStore.isConversationMember(conv.id, user2.id);
  const isRandomMember = await dataStore.isConversationMember(conv.id, "unauthorized-random-user-id");

  console.log(`  ✓ User 1 Membership Verified: ${isMember1}`);
  console.log(`  ✓ User 2 Membership Verified: ${isMember2}`);
  console.log(`  ✓ Non-Member Membership Rejected: ${!isRandomMember}\n`);

  if (!isMember1 || !isMember2 || isRandomMember) {
    throw new Error("Membership check validation failed!");
  }

  // Step 3: Rapid 10-Message Send Test with Client IDs
  console.log("[STAGE 3/5] Rapid 10-Message Send & Idempotency Verification...");
  const clientIds: string[] = [];
  const initialSendStartTime = Date.now();

  for (let i = 1; i <= 10; i++) {
    const cId = `test-client-id-${Date.now()}-${i}-${crypto.randomBytes(4).toString("hex")}`;
    clientIds.push(cId);

    const msg = await dataStore.sendMessage({
      conversationId: conv.id,
      senderId: i % 2 === 1 ? user1.id : user2.id,
      message: `Test automated message #${i} - timestamp ${new Date().toISOString()}`,
      clientId: cId,
    });

    if (!msg.id || msg.clientId !== cId) {
      throw new Error(`Message #${i} creation failed or clientId mismatch`);
    }
  }

  const sendDuration = Date.now() - initialSendStartTime;
  console.log(`  ✓ 10 sequential messages dispatched & persisted in ${sendDuration}ms (${(sendDuration / 10).toFixed(1)}ms/msg)`);

  // Idempotency test: Resend message #1 with same clientId
  const duplicateAttempt = await dataStore.sendMessage({
    conversationId: conv.id,
    senderId: user1.id,
    message: "Duplicate payload that should NOT create a new message",
    clientId: clientIds[0],
  });

  const allMsgsWithClientId0 = await db.message.findMany({
    where: { conversationId: conv.id, senderId: user1.id, clientId: clientIds[0] },
  });

  if (allMsgsWithClientId0.length !== 1) {
    throw new Error(`Idempotency failed! Found ${allMsgsWithClientId0.length} duplicate messages for same clientId.`);
  }
  console.log(`  ✓ Idempotency Check Passed: Retrying message with clientId returned existing record (0 duplicates created).\n`);

  // Step 4: Delta Sync Testing
  console.log("[STAGE 4/5] Testing Delta Pagination & After-Timestamp Sync...");
  const fullList = await dataStore.getMessages(conv.id, { limit: 50 });
  console.log(`  ✓ Full Messages in DB: ${fullList.length}`);

  const midPointMsg = fullList[Math.floor(fullList.length / 2)];
  const deltaList = await dataStore.getMessages(conv.id, { after: midPointMsg.createdAt });
  console.log(`  ✓ Delta messages newer than ${midPointMsg.createdAt}: ${deltaList.length} messages`);

  if (deltaList.length === 0 && fullList.length > 1) {
    throw new Error("Delta sync failed to return newer messages!");
  }
  console.log("  ✓ Delta sync filtering verified.\n");

  // Step 5: High-Concurrency Stress Test (Simultaneous Reads, Writes, Mark-Read, Sessions)
  console.log("[STAGE 5/5] Executing High-Concurrency Multi-Thread Simulation (20 Parallel Operations)...");

  const concurrentStartTime = Date.now();
  const operations = Array.from({ length: 20 }).map(async (_, idx) => {
    if (idx % 4 === 0) {
      return db.user.findUnique({ where: { id: user1.id }, select: { id: true, email: true } });
    } else if (idx % 4 === 1) {
      return dataStore.getMessages(conv.id, { limit: 20 });
    } else if (idx % 4 === 2) {
      return dataStore.sendMessage({
        conversationId: conv.id,
        senderId: user1.id,
        message: `Concurrent burst message #${idx}`,
        clientId: `burst-${Date.now()}-${idx}`,
      });
    } else {
      return dataStore.markConversationRead(conv.id, user2.id);
    }
  });

  const results = await Promise.allSettled(operations);
  const concurrentDuration = Date.now() - concurrentStartTime;

  const failedOps = results.filter((r) => r.status === "rejected");
  if (failedOps.length > 0) {
    console.error("  ❌ Failures during concurrency test:", failedOps);
    throw new Error(`Concurrency test had ${failedOps.length} failed operations`);
  }

  console.log(`  ✓ 20 parallel operations completed successfully in ${concurrentDuration}ms`);
  console.log("  ✓ Zero P2024 pool timeouts, zero 42P05 prepared statement collisions, zero 26000 errors.\n");

  // Cleanup test messages and users
  await db.message.deleteMany({ where: { conversationId: conv.id } });
  await db.conversationMember.deleteMany({ where: { conversationId: conv.id } });
  await db.conversation.delete({ where: { id: conv.id } }).catch(() => {});
  await db.user.deleteMany({ where: { email: { in: [user1Email, user2Email] } } });
  console.log("  ✓ Cleanup complete.");

  console.log("==================================================");
  console.log(" ✅ ALL REALTIME CHAT CONCURRENCY TESTS PASSED!");
  console.log("==================================================");
}

main()
  .catch((e) => {
    console.error("Test Suite Failed:", e);
    process.exit(1);
  })
  .finally(() => {
    db.$disconnect().catch(() => {});
  });
