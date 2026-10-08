// Supabase Edge Function: /functions/v1/hint
// Verifies the signed-in user, enforces the free daily limit, and calls Ollama Cloud
// with YOUR one API key (users never need their own). Falls back to Groq if Ollama fails
// and GROQ_API_KEY is set.
// Deploy:  supabase functions deploy hint
// Secrets: supabase secrets set OLLAMA_API_KEY=your_ollama_key
//          supabase secrets set OLLAMA_MODEL=gpt-oss:20b          (optional)
//          supabase secrets set GROQ_API_KEY=gsk_...              (optional fallback)

import { createClient } from "npm:@supabase/supabase-js@2";

const FREE_DAILY_HINTS = 5;
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "gpt-oss:20b";
const GROQ_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
const MAX_MESSAGES = 40;
const MAX_CHARS = 60_000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // 1. Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in." }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Session expired. Please sign in again." }, 401);
  const userId = userData.user.id;

  // 2. Validate the request
  let body: { messages?: { role: string; content: string }[]; model?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const messages = (body.messages ?? []).slice(-MAX_MESSAGES)
    .filter((m) => ["system", "user", "assistant"].includes(m.role) && typeof m.content === "string");
  if (!messages.length) return json({ error: "No messages" }, 400);
  if (JSON.stringify(messages).length > MAX_CHARS) return json({ error: "Conversation too long. Start a new chat." }, 413);

  // 3. Check and use one hint
  const { data: quota, error: quotaErr } = await admin
    .rpc("consume_hint", { p_user: userId, p_free_limit: FREE_DAILY_HINTS })
    .single();
  if (quotaErr) return json({ error: "Could not check your plan. Try again." }, 500);
  if (!quota.allowed) {
    return json({
      error: `You've used your ${FREE_DAILY_HINTS} free hints for today. Upgrade to Pro for unlimited hints.`,
      code: "LIMIT_REACHED",
    }, 402);
  }

  // 4. Call Ollama Cloud with the server-side key
  let lastError = "AI request failed";
  const ollamaKey = Deno.env.get("OLLAMA_API_KEY");
  if (ollamaKey) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch("https://ollama.com/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ollamaKey}` },
        body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false, options: { temperature: 0.7 } }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.message?.content;
        if (text) return json({ text, model: OLLAMA_MODEL, plan: quota.plan, hints_left: quota.hints_left });
        lastError = "Empty response from AI";
        break;
      }
      lastError = (await res.text()).slice(0, 300);
      if (res.status !== 429 && res.status < 500) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 5. Optional fallback: Groq
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    for (const m of GROQ_MODELS) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({ model: m, messages, temperature: 0.7, max_tokens: 4096, stream: false }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return json({ text, model: m, plan: quota.plan, hints_left: quota.hints_left });
      } else {
        lastError = (await res.text()).slice(0, 300);
      }
    }
  }

  if (!ollamaKey && !groqKey) lastError = "Server is missing OLLAMA_API_KEY";
  return json({ error: lastError }, 502);
});
