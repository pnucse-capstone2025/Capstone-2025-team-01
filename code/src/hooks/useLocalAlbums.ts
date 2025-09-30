import type { UIAlbum } from '@/src/types/domain/album';
import { loadAlbums as loadCustomMetas } from '@/src/utils/customAlbum';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Params = {
  managedTitles?: string[]; // 직접 전달할 관리 앨범 제목
  managedTitlesFromFeatures?: string[]; // Feature에서 넘어온 제목
  excludedIdsStorageKey?: string; // 기본값 'managed-album-ids'
};

export function useLocalAlbums({
  managedTitles,
  managedTitlesFromFeatures,
  excludedIdsStorageKey = 'managed-album-ids',
}: Params = {}) {
  const [permission, requestPermission] = MediaLibrary.usePermissions();
  const [albums, setAlbums] = useState<UIAlbum[]>([]);
  const [loading, setLoading] = useState(false);

  const titleSet = useMemo(
    () =>
      new Set(
        [...(managedTitles ?? []), ...(managedTitlesFromFeatures ?? [])]
          .filter(Boolean)
          .map((t) => t.trim().toLowerCase())
      ),
    [managedTitles, managedTitlesFromFeatures]
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        if (!permission?.granted) {
          const res = await requestPermission();
          if (!res.granted) {
            setAlbums([]);
            return;
          }
        }

        // 모든 앨범
        const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });

        // 제외 ID
        const excludedRaw = await AsyncStorage.getItem(excludedIdsStorageKey);
        const excludedIdSet = new Set<string>(excludedRaw ? JSON.parse(excludedRaw) : []);

        // 사용자 정의 앨범(제목) 제외
        const customMetas = await loadCustomMetas();
        const customTitleSet = new Set(
          customMetas
            .filter((m) => m.isUserCreated === true)
            .map((m) => (m.title ?? '').trim().toLowerCase())
        );

        const userAlbums = all.filter((a) => {
          const t = (a.title ?? '').trim().toLowerCase();
          if (excludedIdSet.has(a.id)) return false;
          if (titleSet.has(t)) return false;
          if (customTitleSet.has(t)) return false;
          return true;
        });

        const withPhotos: UIAlbum[] = (
          await Promise.all(
            userAlbums.map(async (album) => {
              const head = await MediaLibrary.getAssetsAsync({
                album,
                mediaType: 'photo',
                first: 1,
                sortBy: MediaLibrary.SortBy.creationTime,
              });
              if (!head.assets.length) return null;

              const cover = head.assets[0];
              const info = await MediaLibrary.getAssetInfoAsync(cover);
              const imageUrl = info.localUri ?? cover.uri;
              const photosCount = head.totalCount ?? head.assets.length ?? 0;

              return {
                id: album.id,
                title: album.title,
                quantity: photosCount,
                imageUrl,
                _album: album,
              };
            })
          )
        ).filter(Boolean) as UIAlbum[];

        withPhotos.sort((a, b) => b.quantity - a.quantity);
        setAlbums(withPhotos);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [permission?.granted, requestPermission, excludedIdsStorageKey, titleSet]
  );

  useEffect(() => {
    load(false);
  }, []);

  const refresh = useCallback(() => load(false), [load]);
  const silentRefresh = useCallback(() => load(true), [load]);

  return { albums, loading, refresh, silentRefresh };
}
