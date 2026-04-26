import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSystemPrompt } from './prompt.ts';
import { toolDefinitions, executeToolCall } from './tools.ts';

const GEMINI_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_MODEL_RESOURCE_NAME = `models/${GEMINI_MODEL}`;
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const GEMINI_COUNT_TOKENS_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:countTokens`;

const MAX_HISTORY_MESSAGES = Number(Deno.env.get('ASK_AI_MAX_HISTORY_MESSAGES') ?? 10);
const MAX_MESSAGE_CHARS = Number(Deno.env.get('ASK_AI_MAX_MESSAGE_CHARS') ?? 500);
const MAX_INPUT_TOKENS_PER_CALL = Number(Deno.env.get('ASK_AI_MAX_INPUT_TOKENS_PER_CALL') ?? 4000);
const MAX_OUTPUT_TOKENS = Number(Deno.env.get('ASK_AI_MAX_OUTPUT_TOKENS') ?? 512);
const DAILY_TOKEN_QUOTA = Number(Deno.env.get('ASK_AI_DAILY_TOKEN_QUOTA') ?? 25000);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

/**
 * Call the Gemini API with the given contents and tools.
 */
async function callGemini(
  apiKey: string,
  contents: unknown[],
  systemInstruction: string,
  tools?: unknown[]
) {
  const body: Record<string, unknown> = {
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.3, // Low temperature for precise, factual answers
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  };

  if (tools) {
    body.tools = tools;
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API error:', response.status, errorBody);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  return await response.json();
}

type GeminiUsage = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
};

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getUsageTotalTokens(
  usage: GeminiUsage,
  fallbackInputTokens: number
): number {
  if (typeof usage.totalTokenCount === 'number') {
    return usage.totalTokenCount;
  }
  return fallbackInputTokens + safeNumber(usage.candidatesTokenCount);
}

async function getUserDailyTokenUsage(
  supabaseClient: any,
  userId: string
): Promise<number> {
  const utcDayStart = new Date();
  utcDayStart.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabaseClient
    .from('ai_usage_logs')
    .select(
      'first_call_total_tokens,second_call_total_tokens,first_call_input_tokens,second_call_input_tokens,first_call_output_tokens,second_call_output_tokens'
    )
    .eq('user_id', userId)
    .gte('created_at', utcDayStart.toISOString());

  if (error) {
    throw new Error(`Failed to read usage logs: ${error.message}`);
  }

  return (data ?? []).reduce((sum: number, row: any) => {
    const firstTotal =
      safeNumber(row.first_call_total_tokens) ||
      (safeNumber(row.first_call_input_tokens) + safeNumber(row.first_call_output_tokens));
    const secondTotal =
      safeNumber(row.second_call_total_tokens) ||
      (safeNumber(row.second_call_input_tokens) + safeNumber(row.second_call_output_tokens));
    return sum + firstTotal + secondTotal;
  }, 0);
}

/**
 * Count input tokens before sending a generation request.
 * This lets us fail early if the request gets too large.
 */
async function countGeminiTokens(
  apiKey: string,
  contents: unknown[],
  systemInstruction: string,
  tools?: unknown[]
): Promise<number> {
  // countTokens expects the generate request payload under generateContentRequest.
  // Top-level systemInstruction/tools are rejected by this endpoint.
  const generateContentRequest: Record<string, unknown> = {
    model: GEMINI_MODEL_RESOURCE_NAME,
    contents,
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  if (tools) {
    generateContentRequest.tools = tools;
  }

  const body: Record<string, unknown> = {
    generateContentRequest,
  };

  const response = await fetch(`${GEMINI_COUNT_TOKENS_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini countTokens error:', response.status, errorBody);
    throw new Error(`Gemini countTokens error: ${response.status}`);
  }

  const json = await response.json();
  return Number(json?.totalTokens ?? json?.total_tokens ?? 0);
}

function extractUsage(geminiResponse: any): GeminiUsage {
  return {
    promptTokenCount: geminiResponse?.usageMetadata?.promptTokenCount,
    candidatesTokenCount: geminiResponse?.usageMetadata?.candidatesTokenCount,
    totalTokenCount: geminiResponse?.usageMetadata?.totalTokenCount,
  };
}

async function persistUsageLog(
  supabaseClient: any,
  userId: string,
  payload: {
    message: string;
    usedToolCall: boolean;
    firstCallInputTokens: number;
    secondCallInputTokens: number | null;
    firstCallUsage: GeminiUsage;
    secondCallUsage: GeminiUsage | null;
  }
) {
  const { error } = await supabaseClient.from('ai_usage_logs').insert({
    user_id: userId,
    model: GEMINI_MODEL,
    question_preview: payload.message.slice(0, 140),
    used_tool_call: payload.usedToolCall,
    first_call_input_tokens: payload.firstCallInputTokens,
    second_call_input_tokens: payload.secondCallInputTokens,
    first_call_prompt_tokens: payload.firstCallUsage.promptTokenCount ?? null,
    first_call_output_tokens: payload.firstCallUsage.candidatesTokenCount ?? null,
    first_call_total_tokens: payload.firstCallUsage.totalTokenCount ?? null,
    second_call_prompt_tokens: payload.secondCallUsage?.promptTokenCount ?? null,
    second_call_output_tokens: payload.secondCallUsage?.candidatesTokenCount ?? null,
    second_call_total_tokens: payload.secondCallUsage?.totalTokenCount ?? null,
  });

  if (error) {
    console.warn('[ask-ai] Failed to persist usage log:', error.message);
  }
}

/**
 * Extract function call from Gemini response, if present.
 */
function extractFunctionCall(
  geminiResponse: any
): { name: string; args: Record<string, unknown> } | null {
  const candidate = geminiResponse?.candidates?.[0];
  if (!candidate?.content?.parts) return null;

  for (const part of candidate.content.parts) {
    if (part.functionCall) {
      return {
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      };
    }
  }

  return null;
}

/**
 * Extract text from Gemini response.
 */
function extractText(geminiResponse: any): string {
  const candidate = geminiResponse?.candidates?.[0];
  if (!candidate?.content?.parts) return 'Sorry, I could not process your request.';

  const textParts = candidate.content.parts
    .filter((p: any) => p.text)
    .map((p: any) => p.text);

  return textParts.join('\n') || 'Sorry, I could not generate a response.';
}

// ─────────────────────────────────────────────────────────────
// Main Edge Function Handler
// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate environment
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 2. Authenticate — create a Supabase client scoped to the user's JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired auth token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const { message, history } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'A message is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > MAX_MESSAGE_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Message too long. Please keep it under ${MAX_MESSAGE_CHARS} characters.`,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const dailyUsageBeforeRequest = await getUserDailyTokenUsage(supabaseClient, user.id);
    if (dailyUsageBeforeRequest >= DAILY_TOKEN_QUOTA) {
      return new Response(
        JSON.stringify({
          error: 'Daily AI quota reached. Please try again tomorrow.',
          usage: {
            dailyUsageTokens: dailyUsageBeforeRequest,
            dailyQuotaTokens: DAILY_TOKEN_QUOTA,
          },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Build conversation contents for Gemini
    const contents: unknown[] = [];

    // Add conversation history (if any) for context
    if (history && Array.isArray(history)) {
      for (const msg of history.slice(-MAX_HISTORY_MESSAGES)) {
        // Keep a limited history for cost control
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add the current user message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const systemPrompt = getSystemPrompt();

    // 5. First LLM call — may return a tool call or a direct answer
    console.log(`[ask-ai] User ${user.id}: "${message}"`);
    console.log(
      `[ask-ai] Limits: input<=${MAX_INPUT_TOKENS_PER_CALL}, output<=${MAX_OUTPUT_TOKENS}, history<=${MAX_HISTORY_MESSAGES}`
    );

    const firstCallInputTokens = await countGeminiTokens(
      geminiApiKey,
      contents,
      systemPrompt,
      toolDefinitions
    );

    if (firstCallInputTokens > MAX_INPUT_TOKENS_PER_CALL) {
      return new Response(
        JSON.stringify({
          error: 'Request is too large. Please ask a shorter question or clear chat history.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (dailyUsageBeforeRequest + firstCallInputTokens + MAX_OUTPUT_TOKENS > DAILY_TOKEN_QUOTA) {
      return new Response(
        JSON.stringify({
          error: 'Not enough daily AI quota remaining for this request. Try a shorter prompt tomorrow.',
          usage: {
            dailyUsageTokens: dailyUsageBeforeRequest,
            dailyQuotaTokens: DAILY_TOKEN_QUOTA,
          },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ask-ai] first_call.input_tokens=${firstCallInputTokens}`);

    const firstResponse = await callGemini(
      geminiApiKey,
      contents,
      systemPrompt,
      toolDefinitions
    );
    const firstUsage = extractUsage(firstResponse);
    const firstCallTotalTokens = getUsageTotalTokens(firstUsage, firstCallInputTokens);
    console.log(
      `[ask-ai] first_call.usage prompt=${firstUsage.promptTokenCount ?? 'n/a'} output=${firstUsage.candidatesTokenCount ?? 'n/a'} total=${firstUsage.totalTokenCount ?? 'n/a'}`
    );

    const functionCall = extractFunctionCall(firstResponse);

    // 6. If no tool call, return the direct text response
    if (!functionCall) {
      const reply = extractText(firstResponse);
      console.log('[ask-ai] Direct response (no tool call)');
      await persistUsageLog(supabaseClient, user.id, {
        message,
        usedToolCall: false,
        firstCallInputTokens,
        secondCallInputTokens: null,
        firstCallUsage: firstUsage,
        secondCallUsage: null,
      });
      return new Response(
        JSON.stringify({
          reply,
          usage: {
            firstCallInputTokens,
            firstCallTotalTokens,
            firstCall: firstUsage,
            secondCall: null,
            dailyUsageTokens: dailyUsageBeforeRequest + firstCallTotalTokens,
            dailyQuotaTokens: DAILY_TOKEN_QUOTA,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Execute the tool call against the database (RLS-scoped)
    console.log(`[ask-ai] Tool call: ${functionCall.name}(${JSON.stringify(functionCall.args)})`);

    let toolResult: unknown;
    try {
      toolResult = await executeToolCall(
        supabaseClient,
        functionCall.name,
        functionCall.args as any
      );
    } catch (toolError: any) {
      console.error('[ask-ai] Tool execution error:', toolError.message);
      toolResult = { error: toolError.message };
    }

    console.log('[ask-ai] Tool result:', JSON.stringify(toolResult).substring(0, 500));

    // 8. Second LLM call — feed the tool result back for a natural language answer
    const contentsWithToolResult = [
      ...contents,
      // The model's tool call
      {
        role: 'model',
        parts: [
          {
            functionCall: {
              name: functionCall.name,
              args: functionCall.args,
            },
          },
        ],
      },
      // The tool's response
      {
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: functionCall.name,
              response: { result: toolResult },
            },
          },
        ],
      },
    ];

    const secondCallInputTokens = await countGeminiTokens(
      geminiApiKey,
      contentsWithToolResult,
      systemPrompt
    );

    if (secondCallInputTokens > MAX_INPUT_TOKENS_PER_CALL) {
      return new Response(
        JSON.stringify({
          error: 'Request grew too large after tool execution. Please ask a narrower question.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (
      dailyUsageBeforeRequest +
      firstCallTotalTokens +
      secondCallInputTokens +
      MAX_OUTPUT_TOKENS >
      DAILY_TOKEN_QUOTA
    ) {
      await persistUsageLog(supabaseClient, user.id, {
        message,
        usedToolCall: false,
        firstCallInputTokens,
        secondCallInputTokens: null,
        firstCallUsage: firstUsage,
        secondCallUsage: null,
      });
      return new Response(
        JSON.stringify({
          error:
            'Daily AI quota reached before final answer generation. Please try again tomorrow.',
          usage: {
            dailyUsageTokens: dailyUsageBeforeRequest + firstCallTotalTokens,
            dailyQuotaTokens: DAILY_TOKEN_QUOTA,
          },
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ask-ai] second_call.input_tokens=${secondCallInputTokens}`);

    const secondResponse = await callGemini(
      geminiApiKey,
      contentsWithToolResult,
      systemPrompt
      // No tools on the second call — force a text response
    );

    const secondUsage = extractUsage(secondResponse);
    const reply = extractText(secondResponse);
    console.log('[ask-ai] Final response generated');
    console.log(
      `[ask-ai] second_call.usage prompt=${secondUsage.promptTokenCount ?? 'n/a'} output=${secondUsage.candidatesTokenCount ?? 'n/a'} total=${secondUsage.totalTokenCount ?? 'n/a'}`
    );
    await persistUsageLog(supabaseClient, user.id, {
      message,
      usedToolCall: true,
      firstCallInputTokens,
      secondCallInputTokens,
      firstCallUsage: firstUsage,
      secondCallUsage: secondUsage,
    });

    return new Response(
      JSON.stringify({
        reply,
        usage: {
          firstCallInputTokens,
          secondCallInputTokens,
          firstCallTotalTokens,
          secondCallTotalTokens: getUsageTotalTokens(secondUsage, secondCallInputTokens),
          firstCall: firstUsage,
          secondCall: secondUsage,
          dailyUsageTokens:
            dailyUsageBeforeRequest +
            firstCallTotalTokens +
            getUsageTotalTokens(secondUsage, secondCallInputTokens),
          dailyQuotaTokens: DAILY_TOKEN_QUOTA,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[ask-ai] Error:', error.message);
    return new Response(
      JSON.stringify({
        error: 'Something went wrong while processing your question. Please try again.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
