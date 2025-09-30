import { useEffect, useState, useCallback, useRef } from 'react';
import * as MediaLibrary from 'expo-media-library';
import DeviceInfo from 'react-native-device-info';
import { MANAGED_ALBUM_TITLES } from '@/src/constants/albums';

type StorageStats = {
  totalBytes: number; // 기기 전체 용량
  freeBytes: number; // 기기 가용 용량
  photoBytes: number; // 사진이 차지하는 용량(앨범 기반, 중복 제거)
  loading: boolean;
  error?: string;
};

function formatError(e: unknown) {
  return (e as any)?.message ?? '알 수 없는 오류';
}

/**
 * 앨범 기반 사진 용량 집계
 * 1) 모든 로컬 앨범을 가져온 뒤,
 * 2) 관리 앨범(MANAGED_ALBUM_TITLES)은 제외,
 * 3) 사진이 1장 이상 있는 앨범만 선별,
 * 4) 각 앨범에서 photo만 순회하며 asset.id 기준으로 중복 제거,
 * 5) size/fileSize 합산
 */
async function getAllPhotosBytesByAlbums(): Promise<number> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (perm.status !== 'granted') {
    throw new Error('사진 권한이 필요합니다.');
  }

  const all = await MediaLibrary.getAlbumsAsync();

  // 관리 앨범 제외
  const candidates = all.filter((a) => a.title && !MANAGED_ALBUM_TITLES.includes(a.title));

  // 사진이 1장이라도 있는 앨범만 선별
  async function hasAnyPhoto(albumId: string) {
    const page = await MediaLibrary.getAssetsAsync({
      album: albumId,
      mediaType: ['photo'],
      first: 1,
      sortBy: [MediaLibrary.SortBy.creationTime],
    });
    return page.assets.length > 0;
  }

  const BATCH = 8;
  const targetAlbums: MediaLibrary.Album[] = [];
  for (let i = 0; i < candidates.length; i += BATCH) {
    const slice = candidates.slice(i, i + BATCH);
    const flags = await Promise.all(slice.map((a) => hasAnyPhoto(a.id)));
    slice.forEach((a, idx) => {
      if (flags[idx]) targetAlbums.push(a);
    });
  }

  const seen = new Set<string>();
  let totalBytes = 0;

  const PAGE_SIZE = 200;
  const CONCURRENCY = 8;

  for (const album of targetAlbums) {
    let endCursor: string | null | undefined = undefined;
    let hasNextPage = true;

    while (hasNextPage) {
      const page = await MediaLibrary.getAssetsAsync({
        album: album.id,
        mediaType: ['photo'],
        first: PAGE_SIZE,
        after: endCursor ?? undefined,
        sortBy: [['creationTime', false]],
      });

      // 중복 제거
      const uniqueBatch = page.assets.filter((a) => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });

      // batched info 조회
      for (let i = 0; i < uniqueBatch.length; i += CONCURRENCY) {
        const slice = uniqueBatch.slice(i, i + CONCURRENCY);
        const infos = await Promise.all(slice.map((a) => MediaLibrary.getAssetInfoAsync(a.id)));
        for (const info of infos) {
          const size = (info as any)?.size ?? (info as any)?.fileSize ?? 0;
          totalBytes += size || 0;
        }
      }

      endCursor = page.endCursor ?? null;
      hasNextPage = page.hasNextPage;
    }
  }

  return totalBytes;
}

export function useStorageStats(): StorageStats {
  const [state, setState] = useState<StorageStats>({
    totalBytes: 0,
    freeBytes: 0,
    photoBytes: 0,
    loading: true,
  });

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback(
    (updater: (prev: StorageStats) => StorageStats | StorageStats) => {
      if (!mountedRef.current) return;
      setState(updater as any);
    },
    []
  );

  const load = useCallback(async () => {
    try {
      safeSetState((s) => ({ ...s, loading: true, error: undefined }));

      // 기기 전체/가용 용량
      const [totalBytes, freeBytes] = await Promise.all([
        DeviceInfo.getTotalDiskCapacity(),
        DeviceInfo.getFreeDiskStorage(),
      ]);

      // 앨범 기반(관리 앨범 제외, 사진 존재 앨범만, 중복 제거) 사진 총 용량
      const photoBytes = await getAllPhotosBytesByAlbums();

      safeSetState({ totalBytes, freeBytes, photoBytes, loading: false });
    } catch (e) {
      safeSetState((s) => ({ ...s, loading: false, error: formatError(e) }));
    }
  }, [safeSetState]);

  useEffect(() => {
    load();
  }, [load]);

  return state;
}
