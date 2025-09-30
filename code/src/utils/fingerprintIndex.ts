import AsyncStorage from '@react-native-async-storage/async-storage';

type FpRecord = {
  fpKey: string;
  uri: string;
  assetId?: string;
  size?: number;
  width?: number;
  height?: number;
  takenAt?: string;
};

const key = (albumId: string) => `broom.fpIndex.${albumId}.v1`;

export async function upsertFpRecords(albumId: string, records: FpRecord[]) {
  const map = await loadFpIndex(albumId);
  for (const r of records) map[r.fpKey] = r;
  await AsyncStorage.setItem(key(albumId), JSON.stringify(map));
}

export async function loadFpIndex(albumId: string): Promise<Record<string, FpRecord>> {
  const raw = await AsyncStorage.getItem(key(albumId));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, FpRecord>;
  } catch {
    return {};
  }
}

export async function findByFpKey(albumId: string, fpKey: string): Promise<FpRecord | undefined> {
  const map = await loadFpIndex(albumId);
  return map[fpKey];
}

export async function findAssetIdsInIndex(
  albumId: string,
  fpKeys: string[]
): Promise<Record<string, string>> {
  const map = await loadFpIndex(albumId);
  const out: Record<string, string> = {};
  for (const k of fpKeys) {
    const rec = map[k];
    if (rec?.assetId) out[k] = rec.assetId;
  }
  return out;
}
