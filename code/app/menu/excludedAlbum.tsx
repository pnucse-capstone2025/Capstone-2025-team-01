import SwitchM3 from '@/src/components/common/SwitchM3';
import { MANAGED_ALBUM_TITLES } from '@/src/constants/albums';
import { font } from '@/src/constants/fonts';
import { saveUserExcludedAlbumIds } from '@/src/utils/albums';
import { loadAlbums as loadCustomMetas } from '@/src/utils/customAlbum';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from 'react-native';

type AlbumRow = {
  id: string;
  title: string;
  assetCount?: number | null; // 주의: Android에선 사진+영상 전체 개수일 수 있음
};

const STORAGE_KEY = 'broom.excludedAlbumIds.v1';

// ---------- AsyncStorage ----------
async function loadExcludedIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: string[] = JSON.parse(raw);
    return new Set(arr);
  } catch (e) {
    console.warn('저장된 제외 앨범 로드 실패:', e);
    return new Set();
  }
}
async function saveExcludedIds(ids: Set<string>) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('제외 앨범 저장 실패:', e);
  }
}

// ---------- 썸네일 카드 ----------
const AlbumCard = memo(function AlbumCard({
  item,
  excluded,
  onToggle,
}: {
  item: AlbumRow;
  excluded: boolean;
  onToggle: (value: boolean) => void;
}) {
  const [thumbUri, setThumbUri] = useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await MediaLibrary.getAssetsAsync({
          album: item.id,
          mediaType: ['photo'],
          sortBy: [MediaLibrary.SortBy.creationTime],
          first: 1, // 커버 한 장만
        });
        if (mounted) setThumbUri(res.assets?.[0]?.uri ?? null);
      } catch {
      } finally {
        if (mounted) setLoadingThumb(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [item.id]);

  return (
    <View
      className="mb-3 rounded-2xl border border-[#E8ECEF] bg-white"
      style={{ overflow: 'hidden' }}>
      <View className="flex-row items-center p-3">
        <Pressable
          className="flex-1 flex-row items-center"
          onPress={() => onToggle(!excluded)}
          android_ripple={{ color: '#EDEFF2', borderless: false }}>
          <View className="h-16 w-16 overflow-hidden rounded-xl border border-[#E8ECEF] bg-[#F3F5F7]">
            {thumbUri ? (
              <Image
                source={{ uri: thumbUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Text className="text-center text-[10px] leading-3 text-[#A0A6AE]">
                  No{'\n'}Cover
                </Text>
              </View>
            )}
            {loadingThumb && <View className="absolute inset-0 animate-pulse bg-[#EEF1F5]" />}
          </View>

          <View className="ml-3 flex-1">
            <Text className="text-base font-semibold text-[#12161C]" numberOfLines={1}>
              {item.title || '제목 없음'}
            </Text>
            <Text className="mt-0.5 text-xs text-[#6F7781]">{item.assetCount ?? 0}장</Text>
          </View>
        </Pressable>

        <View pointerEvents="box-none">
          <SwitchM3 value={excluded} onToggle={onToggle} />
        </View>
      </View>
    </View>
  );
});

// ---------- 메인 페이지 ----------
export default function ExcludedAlbumPage() {
  const [albums, setAlbums] = useState<AlbumRow[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAlbums = useCallback(async (): Promise<AlbumRow[]> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      console.warn('사진 접근 권한이 필요합니다.');
      return [];
    }

    const all = await MediaLibrary.getAlbumsAsync();

    // 사용자 정의 앨범들 불러오기
    const customMetas = await loadCustomMetas();
    const customTitles = new Set(
      customMetas.filter((m) => m.isUserCreated === true).map((m) => (m.title ?? '').trim())
    );

    // 관리 앨범(유사/흐릿/채팅/고대비/문서/무객체) 및 사용자 정의 앨범은 목록에서 제외
    const candidates = all.filter(
      (a) =>
        a.title &&
        !MANAGED_ALBUM_TITLES.includes(a.title) &&
        !customTitles.has((a.title ?? '').trim())
    );

    // 사진이 1장 이상 있는 앨범만 남기기 (음성/알림 등 미디어 전용 폴더 제거)
    const BATCH = 8;
    const rows: AlbumRow[] = [];

    async function hasAnyPhoto(albumId: string) {
      const page = await MediaLibrary.getAssetsAsync({
        album: albumId,
        mediaType: ['photo'],
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 1,
      });
      return page.assets.length > 0;
    }

    for (let i = 0; i < candidates.length; i += BATCH) {
      const slice = candidates.slice(i, i + BATCH);
      const flags = await Promise.all(slice.map((a) => hasAnyPhoto(a.id)));
      slice.forEach((a, idx) => {
        if (flags[idx]) {
          rows.push({
            id: a.id,
            title: a.title ?? '',
            assetCount: a.assetCount ?? null, // 참고: 사진 개수와 정확히 일치하지 않을 수 있음
          });
        }
      });
    }

    rows.sort(
      (a, b) => (b.assetCount ?? 0) - (a.assetCount ?? 0) || a.title.localeCompare(b.title)
    );
    return rows;
  }, []);

  // 최초 로드
  useEffect(() => {
    (async () => {
      try {
        const rows = await fetchAlbums();
        setAlbums(rows);

        // 저장된 제외 목록 로드 후, 현 목록에 없는 id는 정리
        const saved = await loadExcludedIds();
        const validIds = new Set(rows.map((r) => r.id));
        const cleaned = new Set(Array.from(saved).filter((id) => validIds.has(id)));
        if (cleaned.size !== saved.size) await saveExcludedIds(cleaned);
        setExcluded(cleaned);
      } catch (err) {
        console.warn('앨범 조회 실패:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchAlbums]);

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const rows = await fetchAlbums();
      setAlbums(rows);

      const saved = await loadExcludedIds();
      const validIds = new Set(rows.map((r) => r.id));
      const cleaned = new Set(Array.from(saved).filter((id) => validIds.has(id)));
      if (cleaned.size !== saved.size) await saveExcludedIds(cleaned);
      setExcluded(cleaned);
    } finally {
      setRefreshing(false);
    }
  }, [fetchAlbums]);

  const onToggle = useCallback((albumId: string, value: boolean) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (value) next.add(albumId);
      else next.delete(albumId);
      // 저장 + 이벤트 emit (utils/albums.ts에서)
      saveUserExcludedAlbumIds(next);
      return next;
    });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: AlbumRow }) => (
      <AlbumCard
        item={item}
        excluded={excluded.has(item.id)}
        onToggle={(v) => onToggle(item.id, v)}
      />
    ),
    [excluded, onToggle]
  );

  const keyExtractor = useCallback((a: AlbumRow) => a.id, []);

  const empty = useMemo(
    () => (
      <View className="flex-1 items-center justify-center px-6 py-20">
        <Text className="text-lg font-semibold">앨범이 없어요</Text>
        <Text className="text-gray-500 text-sm">
          갤러리에 사진을 추가하거나 권한 설정을 확인해 주세요.
        </Text>
      </View>
    ),
    []
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="absolute inset-0 bg-white">
      <View className="flex flex-col gap-5 p-7">
        <Text style={font.bold} className="text-2xl">
          제외 앨범 관리
        </Text>
        <Text className="text-gray-500 text-sm">
          토글을 켜면 해당 앨범은 분류 대상에서 제외됩니다.
        </Text>
      </View>

      <FlatList
        data={albums}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={empty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </View>
  );
}
