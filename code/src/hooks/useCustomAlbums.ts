import type { UICustomAlbum } from '@/src/types/domain/album';
import { loadCoverUri, loadAlbums as loadCustomMetas } from '@/src/utils/customAlbum';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';

export function useCustomAlbums() {
  const [albums, setAlbums] = useState<UICustomAlbum[]>([]);

  const refresh = useCallback(async () => {
    const metas = await loadCustomMetas();
    const published = metas.filter((a) => a.isUserCreated === true);

    const items: UICustomAlbum[] = await Promise.all(
      published.map(async (m) => {
        let quantity = 0;
        let libraryAlbumId: string | undefined;

        try {
          const libAlbum = await MediaLibrary.getAlbumAsync(m.title?.trim() || '');
          if (libAlbum) {
            libraryAlbumId = libAlbum.id;
            const head = await MediaLibrary.getAssetsAsync({
              album: libAlbum,
              mediaType: 'photo',
              first: 1,
              sortBy: MediaLibrary.SortBy.creationTime,
            });
            quantity = head.totalCount ?? head.assets.length ?? 0;
          }
        } catch {
          // 무시
        }

        let imageUrl: string | null | undefined = null;
        try {
          const internal = await loadCoverUri(m.id);
          if (internal) {
            let v = '';
            try {
              const info = await FileSystem.getInfoAsync(internal);
              if (info.exists && info.modificationTime)
                v = `?v=${Math.floor(info.modificationTime)}`;
            } catch {
              // 무시
            }
            imageUrl = internal + v;
          } else if (m.coverAssetId) {
            const info = await MediaLibrary.getAssetInfoAsync(m.coverAssetId);
            imageUrl = info.localUri ?? info.uri ?? null;
          }
        } catch {}

        return { id: m.id, title: m.title || '앨범', quantity, imageUrl, libraryAlbumId };
      })
    );

    items.sort((a, b) => b.quantity - a.quantity);
    setAlbums(items);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { albums, refresh };
}
