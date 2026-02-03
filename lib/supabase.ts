
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nsnqomnpmsscdurlixcl.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zbnFvbW5wbXNzY2R1cmxpeGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNzMzMDIsImV4cCI6MjA4NTY0OTMwMn0.MlKqrqyrizUAXKpb2DfmZcSMuvcdgdB-KwNd4t79Wnc'; 

export const isConfigured = () => {
  return SUPABASE_KEY.length > 50 && SUPABASE_URL.includes('supabase.co');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // Important pour éviter les boucles sur HashRouter
    storage: window.localStorage,
    storageKey: 'commercepro-auth-v2'
  }
});
