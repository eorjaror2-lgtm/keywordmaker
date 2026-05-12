import { NextResponse } from 'next/server';
import { REGION_TIERS } from '@/lib/constants';

export async function POST(request: Request) {
  try {
    const { date } = await request.json();

    const tierInfoString = REGION_TIERS.map(t => 
      `${t.label}: [${t.regions.join(', ')}] (제한주기: ${t.cooldownDays}일)`
    ).join('\n');

    // AI 프롬프트 (수정됨: Tier 기반 조건 추가)
    const systemPrompt = `
      당신은 유방외과 전문 마케팅 키워드 추천 AI입니다.
      목표: 비어있는 캘린더 날짜(${date})에 발행하기 좋은 '지역 기반(Regional)' 키워드를 추천해주세요.

      [타겟 지역 등급(Tier) 및 제한 주기]
      ${tierInfoString}

      [중요 조건]
      1. 지역 기반 키워드를 추천할 때는 반드시 위 타겟 지역 리스트 중 하나를 접두사로 사용해야 하며, 이외의 지역명은 절대 포함하지 마라.
      2. 우선적으로 Tier 1 지역 중 최근 14일간 사용되지 않은 지역을 1순위로 추천하고, 모두 사용되었다면 Tier 2 지역 중 최근 21일간 사용되지 않은 곳을 추천해라.
      
      형식:
      [타겟지역] + [의료/시술 관련 키워드]
      예시: 안양 맘모톰 수술, 평촌 유방외과
    `;

    console.log("AI에 전송될 프롬프트:", systemPrompt);

    // Mock AI Response
    const mockRecommendations = [
      {
        keyword: '안양 유방초음파',
        category: 'Regional',
        reason: 'Tier 1 핵심 지역이며 최근 14일간 사용 이력이 없어 1순위로 추천합니다.'
      },
      {
        keyword: '평촌 맘모톰수술',
        category: 'Regional',
        reason: 'Tier 1 핵심 지역 고단가 키워드입니다.'
      }
    ];

    return NextResponse.json({ recommendations: mockRecommendations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate recommendations' }, { status: 500 });
  }
}
