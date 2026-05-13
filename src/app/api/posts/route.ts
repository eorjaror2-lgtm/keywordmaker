import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  try {
    // UUID 형식이 아닌 mock data(id: '1' 등) 삭제 시 에러를 방지하기 위해 정규식 체크
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
        // Mock 데이터일 경우 Supabase 삭제를 건너뛰고 성공 처리 (로컬 state에서만 삭제됨)
        return NextResponse.json({ success: true, message: 'Mock data deleted locally' });
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
