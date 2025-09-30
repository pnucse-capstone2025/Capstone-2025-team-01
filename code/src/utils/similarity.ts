import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'duplicate_similarity_threshold';
// 인덱스: 0=유사(0.7), 1=매우 유사(0.8), 2=일치(0.9)
export const THRESHOLD_OPTIONS = [0.7, 0.8, 0.9] as const;
const DEFAULT_THRESHOLD = 0.8;

export async function getSimilarityThreshold(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_THRESHOLD; // 스토리지 없으면 0.8
    const num = Number(raw);
    return Number.isFinite(num) ? num : DEFAULT_THRESHOLD;
  } catch {
    return DEFAULT_THRESHOLD;
  }
}

export async function setSimilarityThreshold(value: number): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, String(value));
  } catch {
    // 필요시 로깅
  }
}

/** 저장된 threshold를 인덱스(0/1/2)로 역매핑 */
export function thresholdToIndex(value: number): 0 | 1 | 2 {
  const idx = THRESHOLD_OPTIONS.indexOf(value as (typeof THRESHOLD_OPTIONS)[number]);
  return (idx === -1 ? 1 : idx) as 0 | 1 | 2; // 기본 0.8 -> 1
}
