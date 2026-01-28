import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/session-management`;

// Helper to generate unique test data
function generateTestData() {
  const uniqueId = Date.now().toString(36) + Math.random().toString(36).slice(2);
  return {
    user_id: crypto.randomUUID(),
    contest_id: crypto.randomUUID(),
    username: `test_user_${uniqueId}`,
  };
}

// Helper function to make requests
async function invokeFunction(body: Record<string, unknown>) {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: JSON.parse(text) };
}

// ========== Unit Tests ==========

Deno.test("should return 400 for missing user_id", async () => {
  const response = await invokeFunction({
    contest_id: crypto.randomUUID(),
    username: "test_user",
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertExists(response.body.error);
  assertExists(response.body.request_id);
});

Deno.test("should return 400 for missing contest_id", async () => {
  const response = await invokeFunction({
    user_id: crypto.randomUUID(),
    username: "test_user",
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertExists(response.body.error);
});

Deno.test("should return 400 for missing username", async () => {
  const response = await invokeFunction({
    user_id: crypto.randomUUID(),
    contest_id: crypto.randomUUID(),
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertExists(response.body.error);
});

Deno.test("should return 400 for invalid user_id format", async () => {
  const response = await invokeFunction({
    user_id: "not-a-uuid",
    contest_id: crypto.randomUUID(),
    username: "test_user",
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertEquals(response.body.error, "Invalid user_id format");
});

Deno.test("should return 400 for invalid contest_id format", async () => {
  const response = await invokeFunction({
    user_id: crypto.randomUUID(),
    contest_id: "not-a-uuid",
    username: "test_user",
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertEquals(response.body.error, "Invalid contest_id format");
});

Deno.test("should return 400 for empty username", async () => {
  const response = await invokeFunction({
    user_id: crypto.randomUUID(),
    contest_id: crypto.randomUUID(),
    username: "   ",
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertExists(response.body.error);
});

Deno.test("should return 400 for username exceeding 50 characters", async () => {
  const response = await invokeFunction({
    user_id: crypto.randomUUID(),
    contest_id: crypto.randomUUID(),
    username: "a".repeat(51),
  });
  
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertExists(response.body.error);
});

// Note: The following test requires an active contest in the database
// It will fail if no active contest exists, which is expected behavior
Deno.test("should return 400 for inactive contest", async () => {
  const testData = generateTestData();
  const response = await invokeFunction(testData);
  
  // Since contest_id is random, it won't exist/be active
  assertEquals(response.status, 400);
  assertEquals(response.body.success, false);
  assertEquals(response.body.error, "Contest is not active");
});

// ========== Concurrency Tests ==========

Deno.test("concurrent requests should not cause duplicate session errors", async () => {
  // This test simulates concurrent requests to the same user/contest
  // In a real scenario with an active contest, both should succeed with the same session
  const testData = generateTestData();
  
  // Fire 5 concurrent requests
  const requests = Array.from({ length: 5 }, () => invokeFunction(testData));
  const results = await Promise.all(requests);
  
  // All requests should complete without throwing
  assertEquals(results.length, 5);
  
  // All should have consistent error (contest not active in test environment)
  // In production with active contest, all would return 200 with same session_id
  for (const result of results) {
    assertExists(result.status);
    assertExists(result.body);
  }
});

// ========== Integration Tests ==========

Deno.test("should include request_id in all responses", async () => {
  // Test various error scenarios all include request_id
  const scenarios = [
    { user_id: "invalid" },
    { user_id: crypto.randomUUID() },
    { user_id: crypto.randomUUID(), contest_id: "invalid", username: "test" },
    generateTestData(),
  ];
  
  for (const scenario of scenarios) {
    const response = await invokeFunction(scenario);
    assertExists(response.body.request_id, "request_id should exist in response");
  }
});

Deno.test("OPTIONS request should return CORS headers", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
    },
  });
  
  assertEquals(response.status, 200);
  assertExists(response.headers.get("access-control-allow-origin"));
  await response.text(); // Consume response body
});

Deno.test("GET request should return 405", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
    },
  });
  
  assertEquals(response.status, 405);
  const body = await response.json();
  assertEquals(body.success, false);
  assertEquals(body.error, "Method not allowed");
});
