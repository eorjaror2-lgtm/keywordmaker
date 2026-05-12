import { NextResponse } from 'next/server';

let mockKeywords = [
  { id: 'k1', name: '맘모톰 수술', category: 'Main', grade: 'S' },
  { id: 'k2', name: '유방암 검진', category: 'Main', grade: 'S' },
  { id: 'k3', name: '자궁경부암', category: 'Main', grade: 'S' },
  { id: 'k4', name: '유방결절 수술', category: 'Main', grade: 'S' },
  { id: 'k5', name: '유방 미세석회화 원인', category: 'Long-tail', grade: 'A' },
  { id: 'k6', name: '가슴 찌릿한 통증', category: 'Long-tail', grade: 'A' },
  { id: 'k7', name: '20대 유방암 초음파', category: 'Long-tail', grade: 'A' },
  { id: 'k8', name: '생리전 겨드랑이 멍울', category: 'Long-tail', grade: 'A' },
  { id: 'k9', name: '비타민 B12 영양제', category: 'Long-tail', grade: 'B' },
  { id: 'k10', name: '찌와와가 알려주는 검진 상식', category: 'Long-tail', grade: 'B' },
  { id: 'k11', name: '치밀유방 뜻', category: 'Long-tail', grade: 'B' }
];

export async function GET() {
  return NextResponse.json({ keywords: mockKeywords });
}

export async function POST(request: Request) {
  const body = await request.json();
  const newKeyword = {
    id: `k${Date.now()}`,
    name: body.name,
    category: body.category || 'Main',
    grade: body.grade
  };
  mockKeywords.push(newKeyword);
  return NextResponse.json({ success: true, keyword: newKeyword });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  mockKeywords = mockKeywords.filter(k => k.id !== id);
  return NextResponse.json({ success: true });
}
