import { createAlbum, CustomAlbum, loadAlbums, loadCoverUri } from '@/src/utils/customAlbum';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

function usePermission() {
  const [granted, setGranted] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setGranted(status === 'granted');
    })();
  }, []);
  return granted;
}

const AlbumRow = memo(function AlbumRow({
  album,
  onOpen,
}: {
  album: CustomAlbum;
  onOpen: () => void;
}): React.ReactElement {
  const router = useRouter();
  const [uri, setUri] = useState<string | null>(null);

  // 로컬 앨범 장수 상태
  const [localCount, setLocalCount] = useState<number>(album.assetIds?.length ?? 0);

  // 공용 함수: 로컬 앨범 카운트 갱신
  const refreshLocalCount = useCallback(async () => {
    try {
      const title = album.title?.trim();
      if (!title) {
        setLocalCount(album.assetIds?.length ?? 0);
        return;
      }
      const libAlbum = await MediaLibrary.getAlbumAsync(title);
      if (!libAlbum) {
        // 로컬 앨범이 아직 없으면 내부 메타 fallback
        setLocalCount(album.assetIds?.length ?? 0);
        return;
      }

      // 우선 assetCount가 있으면 그걸 사용
      const anyAlbum: any = libAlbum as any;
      if (typeof anyAlbum.assetCount === 'number') {
        setLocalCount(anyAlbum.assetCount);
        return;
      }

      // 플랫폼/SDK에 따라 assetCount가 없을 수 있으므로 totalCount로 보강
      const { totalCount } = await MediaLibrary.getAssetsAsync({
        album: libAlbum, // 혹은 album: libAlbum.id
        first: 1, // 전체 내려받지 않고 카운트만 받기
      });
      setLocalCount(totalCount ?? 0);
    } catch {
      setLocalCount(album.assetIds?.length ?? 0);
    }
  }, [album.title, album.assetIds]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) 커버 로딩 (기존 코드 그대로)
        const internal = await loadCoverUri(album.id);
        if (mounted && internal) {
          let v = '';
          try {
            const info = await FileSystem.getInfoAsync(internal);
            if (info.exists && info.modificationTime) v = `?v=${Math.floor(info.modificationTime)}`;
          } catch {}
          setUri(internal + v);
        }

        if (album.coverAssetId) {
          const info = await MediaLibrary.getAssetInfoAsync(album.coverAssetId);
          if (mounted) setUri(info.localUri ?? info.uri ?? null);
        } else if (mounted && !internal) {
          setUri(null);
        }
      } catch {
        if (mounted) setUri(null);
      }

      // 로컬 앨범 카운트도 함께 갱신
      if (mounted) await refreshLocalCount();
    })();
    return () => {
      mounted = false;
    };
  }, [album.id, album.coverAssetId, refreshLocalCount]);

  // 화면에 다시 포커스되면 커버/카운트 재조회
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        try {
          const internal = await loadCoverUri(album.id);
          if (!alive) return;
          if (internal) {
            let v = '';
            try {
              const info = await FileSystem.getInfoAsync(internal);
              if (info.exists && info.modificationTime)
                v = `?v=${Math.floor(info.modificationTime)}`;
            } catch {}
            setUri(internal + v);
          } else if (album.coverAssetId) {
            const info = await MediaLibrary.getAssetInfoAsync(album.coverAssetId);
            if (!alive) return;
            setUri(info.localUri ?? info.uri ?? null);
          } else {
            setUri(null);
          }
        } catch {
          if (alive) setUri(null);
        }

        // 포커스 때마다 로컬 카운트 최신화
        if (alive) await refreshLocalCount();
      })();
      return () => {
        alive = false;
      };
    }, [album.id, album.coverAssetId, refreshLocalCount])
  );

  return (
    <Pressable className="mb-3 rounded-2xl border border-[#E8ECEF] bg-white" onPress={onOpen}>
      <View className="flex-row items-center p-3">
        <View className="h-16 w-16 overflow-hidden rounded-xl border border-[#E8ECEF] bg-[#F3F5F7]">
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-center text-[10px] leading-3 text-[#A0A6AE]">
                No{'\n'}Cover
              </Text>
            </View>
          )}
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-[#12161C]" numberOfLines={1}>
            {album.title}
          </Text>
          <Text className="mt-0.5 text-xs text-[#6F7781]">{localCount}장</Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable onPress={() => router.push(`/albums/custom/${album.id}`)}>
            <Text className="text-xs text-[#3B82F6]">수정</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
});

export default function CustomAlbumPage() {
  const router = useRouter();
  const permission = usePermission();
  const [albums, setAlbums] = useState<CustomAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAlbums(await loadAlbums());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setAlbums(await loadAlbums());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleCreateAndOpen = useCallback(async () => {
    const album = await createAlbum('새 앨범', { isDraft: true });
    router.push(`/albums/custom/${album.id}?draft=1`);
  }, [router]);

  const silentRefresh = useCallback(async () => {
    try {
      const next = await loadAlbums();
      setAlbums(next);
    } catch (e) {
      // 필요하면 콘솔만 남기기 (UI에는 스피너/토스트 안 띄움)
      console.warn('silentRefresh failed:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // 화면이 보일 때마다 조용히 데이터만 갱신
      silentRefresh();
      return () => {};
    }, [silentRefresh])
  );

  if (permission === false) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-base font-semibold">사진 접근 권한이 필요합니다</Text>
        <Text className="text-gray-500 mt-2 text-sm">설정에서 권한을 허용해 주세요.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View className="absolute inset-0 bg-white">
      <View className="flex gap-5 p-7">
        <Text className="text-2xl font-bold">사용자 정의 앨범</Text>
        <Text className="text-gray-500 text-sm">사용자 정의 앨범을 만들고 사진을 추가하세요.</Text>
        <Pressable
          onPress={handleCreateAndOpen}
          className="self-start rounded-xl bg-black px-4 py-2">
          <Text className="text-sm text-white">새 앨범 만들기</Text>
        </Pressable>
      </View>

      <FlatList
        data={albums.filter((a) => a.isUserCreated === true)}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => (
          <AlbumRow album={item} onOpen={() => router.push(`/albums/custom/${item.id}`)} />
        )}
        ListEmptyComponent={
          <View className="items-center justify-center px-6 py-20">
            <Text className="text-lg font-semibold">아직 앨범이 없어요</Text>
            <Text className="text-gray-500 mt-1 text-sm">“새 앨범 만들기”로 시작해 보세요.</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
