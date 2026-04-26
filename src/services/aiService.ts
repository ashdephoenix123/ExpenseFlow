import { supabase } from './supabase';
import { ChatMessage } from '../types';

export const aiService = {
  /**
   * Send a question to the Ask AI Edge Function and get a response.
   * The Edge Function handles all LLM orchestration and data fetching.
   * Auth is passed automatically via the Supabase client.
   */
  async askQuestion(
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    // Convert history to the format expected by the Edge Function
    const historyPayload = history.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const { data, error } = await supabase.functions.invoke('ask-ai', {
      body: { message, history: historyPayload },
    });

    if (error) {
      let errorMessage =
        error.message || 'Failed to get a response from the AI assistant.';

      // Supabase Functions errors can carry the raw response on `context`.
      // If present, prefer the server's explicit error message.
      const response = (error as any)?.context;
      if (response?.json) {
        try {
          const body = await response.clone().json();
          if (body?.error && typeof body.error === 'string') {
            errorMessage = body.error;
          }
        } catch {
          // Ignore parse failures; keep fallback message.
        }
      }

      if (__DEV__) {
        console.warn('[aiService] Edge Function error:', errorMessage, error);
      }
      throw new Error(errorMessage);
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    if (__DEV__ && data?.usage) {
      console.log('[aiService] Token usage:', data.usage);
    }

    return data?.reply || 'Sorry, I could not process your request.';
  },
};
