import { useAlbumAssets } from '@/src/hooks/useAlbumAssets';
import { useLocalAlbumData } from '@/src/utils/albumData';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useState } from 'react';
import { AlbumKey } from '../constants/albums';
import { Asset } from '../types/domain/asset';

type Params = {
  isAll: boolean;
  isLocal: boolean;
  path?: string;
  albumId?: string;
};

export function useAlbumViewerData({ isAll, isLocal, path, albumId }: Params) {
  const album = !isAll && !isLocal ? useAlbumAssets(path as AlbumKey | null) : null;
  const localAlbum = isLocal && albumId ? useLocalAlbumData(albumId) : null;

  const [allAssets, setAllAssets] = useState<Asset[] | null>(isAll ? [] : null);
  const [allLoading, setAllLoading] = useState<boolean>(isAll);

  useEffect(() => {
    if (!isAll) return;
    let cancelled = false;

    (async () => {
      try {
        const perm = await MediaLibrary.requestPermissionsAsync();
        if (perm.status !== 'granted') {
          if (!cancelled) {
            setAllAssets([]);
            setAllLoading(false);
          }
          return;
        }
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          sortBy: [['creationTime', false]],
          first: 500,
        });
        if (!cancelled) setAllAssets(page.assets as unknown as Asset[]);
      } catch {
        if (!cancelled) setAllAssets([]);
      } finally {
        if (!cancelled) setAllLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAll]);

  const assets: Asset[] = useMemo(() => {
    if (isLocal) return (localAlbum?.assets as unknown as Asset[]) ?? [];
    if (isAll) return allAssets ?? [];
    return (album?.assets as unknown as Asset[]) ?? [];
  }, [isLocal, isAll, localAlbum?.assets, allAssets, album?.assets]);

  const loading = useMemo(() => {
    if (isLocal) return (localAlbum?.refreshing ?? true) && (assets?.length ?? 0) === 0;
    if (isAll) return allLoading;
    return (album?.refreshing ?? true) && (assets?.length ?? 0) === 0;
  }, [isLocal, isAll, localAlbum?.refreshing, assets?.length, allLoading, album?.refreshing]);

  return { assets, loading };
}
