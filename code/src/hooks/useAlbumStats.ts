import { useCallback, useEffect, useMemo, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALBUM_TITLES } from '@/src/constants/albums';
import { loadAlbums as loadCustomAlbums } from '@/src/utils/customAlbum';

type AlbumItem = { id: string; title: string; assetCount: number };
type Grouped = { auto: number; custom: number; uncategorized: number; total: number };

const SNAP_PREFIX = 'album_counts_week_';

function getWeekKey(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const day = (date.getDay() || 7) as number;
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  const week = Math.ceil(((+date - +yearStart) / 86400000 + 1) / 7);
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
}
const getPrevWeekKey = () => getWeekKey(new Date(Date.now() - 7 * 24 * 3600 * 1000));

async function ensureMediaPermissions() {
  const p = await MediaLibrary.getPermissionsAsync();
  if (p.status !== 'granted') {
    const r = await MediaLibrary.requestPermissionsAsync();
    if (r.status !== 'granted') throw new Error('사진 권한이 필요합니다.');
  }
}

async function readSnapshot(key: string): Promise<Grouped | null> {
  const raw = await AsyncStorage.getItem(SNAP_PREFIX + key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // 이전 버전 호환 (grouped 래핑되어 저장된 경우 해제)
    return (parsed?.grouped ?? parsed) as Grouped;
  } catch {
    return null;
  }
}

async function writeSnapshotIfMissing(key: string, grouped: Grouped) {
  const existing = await AsyncStorage.getItem(SNAP_PREFIX + key);
  if (existing == null) {
    await AsyncStorage.setItem(SNAP_PREFIX + key, JSON.stringify(grouped));
  }
}

export function useAlbumStats() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [customCount, setCustomCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadSystemAlbums = useCallback(async () => {
    await ensureMediaPermissions();
    const list = await MediaLibrary.getAlbumsAsync();
    setAlbums(
      list.map((a) => ({
        id: a.id,
        title: a.title ?? '(제목 없음)',
        assetCount: typeof a.assetCount === 'number' ? a.assetCount : 0,
      }))
    );
  }, []);

  const loadCustomTotal = useCallback(async () => {
    try {
      const custom = await loadCustomAlbums();
      const userAlbums = custom.filter((a) => a.isUserCreated === true);
      const sum = userAlbums.reduce((acc, a) => acc + (a.assetIds?.length ?? 0), 0);
      setCustomCount(sum);
    } catch {
      setCustomCount(0);
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(undefined);
      try {
        await Promise.all([loadSystemAlbums(), loadCustomTotal()]);
      } catch (e: any) {
        setError(e?.message ?? '앨범을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, [loadSystemAlbums, loadCustomTotal]);

  // 현재 그룹 값 계산
  const groupedBase = useMemo(() => {
    const managed = new Set(Object.values(ALBUM_TITLES));
    let auto = 0;
    let others = 0;
    for (const a of albums) {
      if (managed.has(a.title)) auto += a.assetCount;
      else others += a.assetCount;
    }
    return { auto, uncategorized: others };
  }, [albums]);

  const current: Grouped = useMemo(
    () => ({
      auto: groupedBase.auto,
      custom: customCount,
      uncategorized: groupedBase.uncategorized,
      total: groupedBase.auto + groupedBase.uncategorized + customCount,
    }),
    [groupedBase, customCount]
  );

  // 델타(지난주 대비) + 이번 주 스냅샷(없을 때만 저장)
  const [delta, setDelta] = useState({ auto: 0, custom: 0, uncategorized: 0 });

  useEffect(() => {
    if (loading) return;

    (async () => {
      const thisKey = getWeekKey();
      const prevKey = getPrevWeekKey();

      // 지난 주 스냅샷(없으면 0으로 간주)
      const prev = (await readSnapshot(prevKey)) ?? {
        auto: 0,
        custom: 0,
        uncategorized: 0,
        total: 0,
      };

      // 델타: 이번 주 현재값 - 지난 주 스냅샷 (주중엔 prev가 고정되므로 흔들리지 않음)
      setDelta({
        auto: current.auto - prev.auto,
        custom: current.custom - prev.custom,
        uncategorized: current.uncategorized - prev.uncategorized,
      });

      // 이번 주 스냅샷은 “없을 때만” 기록(주당 1회 고정)
      await writeSnapshotIfMissing(thisKey, current);
    })();
  }, [loading, current]);

  return {
    loading,
    error,
    albums,
    grouped: current,
    delta,
    refresh: async () => {
      setLoading(true);
      try {
        await Promise.all([loadSystemAlbums(), loadCustomTotal()]);
      } finally {
        setLoading(false);
      }
    },
  };
}
