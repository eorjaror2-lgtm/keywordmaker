import { NextResponse } from 'next/server';

export interface Region {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
}

// In-memory store for demonstration purposes
// In a real application, this would be fetched from Supabase:
// const { data } = await supabase.from('regions').select('*')
let regions: Region[] = [
  { id: '1', name: '안양', tier: 1 },
  { id: '2', name: '평촌', tier: 1 },
  { id: '3', name: '범계', tier: 2 },
  { id: '4', name: '인덕원', tier: 2 },
  { id: '5', name: '군포', tier: 3 },
  { id: '6', name: '의왕', tier: 3 },
];

export async function GET() {
  return NextResponse.json({ regions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tier } = body;
    
    if (!name || ![1, 2, 3].includes(Number(tier))) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (regions.find(r => r.name === name)) {
      return NextResponse.json({ error: 'Region already exists' }, { status: 400 });
    }

    const newRegion: Region = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      tier: Number(tier) as 1 | 2 | 3
    };

    regions.push(newRegion);
    
    return NextResponse.json({ region: newRegion });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add region' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    regions = regions.filter(r => r.id !== id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete region' }, { status: 500 });
  }
}
