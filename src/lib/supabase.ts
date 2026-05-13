import { createClient } from '@supabase/supabase-js';

// 환경변수에서 Supabase URL과 Key를 가져옵니다.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase 클라이언트를 생성하고 내보냅니다.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
