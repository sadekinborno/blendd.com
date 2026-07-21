require('dotenv').config();
if (typeof global.WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] WARNING: Missing environment variables (SUPABASE_URL / SUPABASE_ANON_KEY). Using a mock client for offline development.');
  
  const makeMockSupabase = () => {
    const handler = {
      get(target, prop) {
        if (prop === 'then') {
          return (resolve) => resolve({ data: [], count: 0, error: null });
        }
        return (...args) => new Proxy({}, handler);
      }
    };
    
    const mockClient = {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => new Proxy({}, handler)
    };
    
    return new Proxy(mockClient, handler);
  };

  supabase = makeMockSupabase();
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] Client initialized successfully.');
}

module.exports = supabase;
