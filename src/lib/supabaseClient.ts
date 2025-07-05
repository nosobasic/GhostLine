// MOCKED Supabase client for frontend development without real credentials

// Dummy user with user_metadata
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_metadata: {
    name: 'Test User',
    avatar_url: '',
  },
};

// Dummy conversations
const mockConversations = [
  {
    id: 'conv-1',
    user_id: mockUser.id,
    title: 'Sample Conversation',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Dummy messages
const mockMessages = [
  {
    id: 'msg-1',
    conversation_id: 'conv-1',
    user_id: mockUser.id,
    content: 'Hello! This is a mock message.',
    is_voice: false,
    duration: 0,
    created_at: new Date().toISOString(),
  },
];

export const supabase = null; // Not used in mock

type MockError = { message: string } | null;

type MockUser = typeof mockUser;
type MockConversation = typeof mockConversations[0];
type MockMessage = typeof mockMessages[0];

// Helper to return error object or null
const mockError = (msg?: string) => (msg ? { message: msg } : null);

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          avatar_url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          content: string;
          is_voice: boolean;
          duration?: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          content: string;
          is_voice?: boolean;
          duration?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          content?: string;
          is_voice?: boolean;
          duration?: number;
          created_at?: string;
        };
      };
    };
  };
}

export const auth = {
  signUp: async (_email: string, _password: string, _name: string): Promise<{ data: { user: MockUser }; error: MockError }> => ({ data: { user: mockUser }, error: null }),
  signIn: async (_email: string, _password: string): Promise<{ data: { user: MockUser }; error: MockError }> => ({ data: { user: mockUser }, error: null }),
  signOut: async (): Promise<{ error: MockError }> => ({ error: null }),
  getCurrentUser: async (): Promise<{ user: MockUser; error: MockError }> => ({ user: mockUser, error: null }),
};

export const conversations = {
  getAll: async (_userId: string): Promise<{ data: MockConversation[]; error: MockError }> => ({ data: mockConversations, error: null }),
  create: async (_userId: string, title: string): Promise<{ data: MockConversation; error: MockError }> => ({
    data: { ...mockConversations[0], id: 'conv-2', title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    error: null,
  }),
  update: async (id: string, updates: Partial<MockConversation>): Promise<{ data: MockConversation; error: MockError }> => ({
    data: { ...mockConversations[0], ...updates, id },
    error: null,
  }),
  delete: async (_id: string): Promise<{ error: MockError }> => ({ error: null }),
};

export const messages = {
  getAll: async (conversationId: string): Promise<{ data: MockMessage[]; error: MockError }> => ({ data: mockMessages.filter(m => m.conversation_id === conversationId), error: null }),
  create: async (
    conversationId: string,
    userId: string,
    content: string,
    isVoice: boolean = false,
    duration?: number
  ): Promise<{ data: MockMessage; error: MockError }> => ({
    data: {
      ...mockMessages[0],
      id: 'msg-' + Math.random().toString(36).substr(2, 5),
      conversation_id: conversationId,
      user_id: userId,
      content,
      is_voice: isVoice,
      duration: duration ?? 0,
      created_at: new Date().toISOString(),
    },
    error: null,
  }),
}; 