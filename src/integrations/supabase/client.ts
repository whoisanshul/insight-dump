import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = "https://quchpmkxhfftjdlmkhkd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1Y2hwbWt4aGZmdGpkbG1raGtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDIwOTAsImV4cCI6MjA2OTg3ODA5MH0.YTVECNG9qkJnDZUXsJg8tLUkZTLovyM_NSKKR-x0NAE";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);