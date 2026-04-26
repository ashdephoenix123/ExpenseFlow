import { create } from 'zustand';
import { ChatMessage } from '../types';
import { aiService } from '../services/aiService';

interface AiChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

let messageIdCounter = 0;

function createMessage(
  role: 'user' | 'assistant',
  content: string
): ChatMessage {
  messageIdCounter += 1;
  return {
    id: `msg_${Date.now()}_${messageIdCounter}`,
    role,
    content,
    timestamp: Date.now(),
  };
}

export const useAiChatStore = create<AiChatState>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,

  sendMessage: async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || get().isLoading) return;

    // Add the user message immediately
    const userMessage = createMessage('user', trimmed);
    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      // Send to Edge Function (includes conversation history for context)
      const currentMessages = get().messages;
      const reply = await aiService.askQuestion(trimmed, currentMessages);

      // Add the AI's response
      const assistantMessage = createMessage('assistant', reply);
      set((state) => ({
        messages: [...state.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error: any) {
      if (__DEV__) {
        console.warn('[AiChatStore] Error:', error?.message ?? error);
      }
      const friendlyError =
        typeof error?.message === 'string' && error.message.trim().length > 0
          ? error.message
          : 'Sorry, something went wrong. Please try again.';
      const errorMessage = createMessage(
        'assistant',
        friendlyError
      );
      set((state) => ({
        messages: [...state.messages, errorMessage],
        isLoading: false,
        error: null,
      }));
    }
  },

  clearChat: () =>
    set({
      messages: [],
      isLoading: false,
      error: null,
    }),
}));
