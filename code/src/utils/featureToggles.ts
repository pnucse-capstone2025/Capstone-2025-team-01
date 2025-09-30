import { ALBUM_FEATURES } from '@/src/constants/albumFeatures';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FEATURE_TOGGLE_KEY = 'album-toggles';

export type FeatureToggles = Record<string, boolean>; // id -> on/off

// 저장된 토글 객체 로드 (저장 안 된 항목은 기본 on = true)
export async function loadFeatureToggles(): Promise<FeatureToggles> {
  try {
    const raw = await AsyncStorage.getItem(FEATURE_TOGGLE_KEY);
    const parsed = raw ? (JSON.parse(raw) as FeatureToggles) : {};
    return parsed;
  } catch {
    return {};
  }
}

// 켜져 있는 기능 id 배열로 리턴
export async function loadEnabledFeatureIds(): Promise<string[]> {
  const toggles = await loadFeatureToggles();
  return ALBUM_FEATURES.map((f) => f.id).filter((id) => toggles[id] ?? true); // 저장 없으면 기본 on
}

// 편의: 특정 기능이 켜져있는지
export async function isFeatureEnabled(id: string): Promise<boolean> {
  const toggles = await loadFeatureToggles();
  return toggles[id] ?? true;
}
