import { createClient } from '@supabase/supabase-js';

// replace with your own Supabase project values
const SUPABASE_URL = 'https://ddkkbtijqrgpitncxylx.supabase.co/'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRka2tidGlqcXJncGl0bmN4eWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTE1ODYsImV4cCI6MjA3MDA2NzU4Nn0.FYkXHukbDsewcBY7rzMTWC7EuSwWQi6Ay4CcPCbutpA'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
