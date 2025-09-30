// 공통 타입
export type GridAsset = { id: string; uri: string };

export type GridDataSource = {
  assets: GridAsset[];
  refreshing: boolean;
  fetchFirst: () => Promise<void> | void;
  fetchMore: () => Promise<void> | void;
  loadingMore: boolean;
  hasNextPage: boolean;
  totalCount?: number;
};

// 정리 앨범 어댑터 (이미 있으니 리턴 타입만 맞추면 OK)
export function useSmartAlbumData(path?: string | null): GridDataSource {
  const { assets, refreshing, fetchFirst, fetchMore, loadingMore, hasNextPage } = useAlbumAssets(
    path as any
  );
  return {
    assets: (assets ?? []) as unknown as GridAsset[],
    refreshing,
    fetchFirst,
    fetchMore,
    loadingMore,
    hasNextPage,
  };
}

// 로컬 앨범 어댑터
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAlbumAssets } from '../hooks/useAlbumAssets';
const PAGE_SIZE = 60;

export function useLocalAlbumData(albumId?: string): GridDataSource {
  const [assets, setAssets] = useState<GridAsset[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);

  const albumRef = useRef(albumId);
  useEffect(() => {
    albumRef.current = albumId;
  }, [albumId]);

  const fetchFirst = useCallback(async () => {
    if (!albumRef.current) return;
    setRefreshing(true);
    try {
      const res = await MediaLibrary.getAssetsAsync({
        album: albumRef.current,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: PAGE_SIZE,
      });

      setTotalCount(res.totalCount ?? res.assets.length ?? 0);
      setAssets(res.assets.map((a) => ({ id: a.id, uri: a.uri })));
      setHasNextPage(res.hasNextPage ?? false);
      setCursor(res.endCursor);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (!albumRef.current || !hasNextPage || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await MediaLibrary.getAssetsAsync({
        album: albumRef.current,
        mediaType: 'photo',
        sortBy: [['creationTime', false]],
        first: PAGE_SIZE,
        after: cursor,
      });

      // totalCount는 변하지 않지만, 혹시 처음에 못채웠다면 보정
      if (totalCount == null) {
        setTotalCount(res.totalCount ?? assets.length + res.assets.length);
      }

      setAssets((prev) => [...prev, ...res.assets.map((a) => ({ id: a.id, uri: a.uri }))]);
      setHasNextPage(res.hasNextPage ?? false);
      setCursor(res.endCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasNextPage, loadingMore, totalCount]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  return {
    assets,
    refreshing,
    fetchFirst,
    fetchMore,
    loadingMore,
    hasNextPage,
    totalCount,
  };
}
