export const REGION_TIERS = [
  { tier: 1, label: 'Tier 1 (핵심)', cooldownDays: 14, regions: ['안양', '평촌'] },
  { tier: 2, label: 'Tier 2 (인접)', cooldownDays: 21, regions: ['범계', '인덕원'] },
  { tier: 3, label: 'Tier 3 (확장)', cooldownDays: 45, regions: ['군포', '의왕'] },
] as const;

export const ALL_REGIONS = REGION_TIERS.flatMap(t => t.regions);

export function getRegionTierInfo(regionName: string) {
  return REGION_TIERS.find(t => t.regions.includes(regionName as any));
}
