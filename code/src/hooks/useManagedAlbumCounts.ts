// src/hooks/useManagedAlbumCounts.ts
import type { AlbumFeature } from '@/src/types/constants/AlbumFeatureType';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useState } from 'react';

export function useManagedAlbumCounts(features: AlbumFeature[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [permission, requestPermission] = MediaLibrary.usePermissions();

  const compute = useCallback(async () => {
    // 권한 보장
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        // 모든 feature id를 0으로 채워서 상태 일관성 유지
        const zero: Record<string, number> = {};
        for (const f of features) zero[f.id] = 0;
        setCounts(zero);
        return;
      }
    }

    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    const byTitle = new Map(
      albums.map((a) => [
        String(a.title ?? '')
          .trim()
          .toLowerCase(),
        a,
      ])
    );

    const next: Record<string, number> = {};
    for (const feat of features) {
      // placeholder(패딩) 무시
      if ((feat as any).__empty) continue;

      const key = feat.title.trim().toLowerCase();
      const target = byTitle.get(key);
      if (!target) {
        next[feat.id] = 0;
        continue;
      }
      const head = await MediaLibrary.getAssetsAsync({
        album: target,
        mediaType: 'photo',
        first: 1,
        sortBy: MediaLibrary.SortBy.creationTime,
      });
      next[feat.id] = head.totalCount ?? head.assets.length ?? 0;
    }
    setCounts(next);
  }, [features, permission?.granted, requestPermission]);

  // 마운트/의존성 변경 시 자동 로드
  useEffect(() => {
    compute();
  }, [compute]);

  const refresh = useCallback(() => compute(), [compute]);

  return { counts, refresh };
}
