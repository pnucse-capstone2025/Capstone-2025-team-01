import { ALBUM_TITLES } from '@/src/constants/albums';
import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';

type Asset = MediaLibrary.Asset;
const PAGE_SIZE = 60;

export function useAlbumAssets(path: keyof typeof ALBUM_TITLES | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const initRef = useRef(false);

  const ensurePerm = useCallback(async () => {
    const perm = await MediaLibrary.requestPermissionsAsync();
    if (!perm.granted) throw new Error('사진 접근 권한이 필요합니다.');
  }, []);

  const resolveAlbum = useCallback(async () => {
    if (!path) return null;
    const albumName = ALBUM_TITLES[path];

    const direct = await MediaLibrary.getAlbumAsync(albumName);
    if (direct) return direct;

    // 혹시 몰라 전체에서 타이틀 정규화 매칭
    const all = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    return all.find((a) => a.title === albumName) ?? null;
  }, [path]);

  const fetchFirst = useCallback(async () => {
    if (!path) {
      // ← 유효하지 않으면 빈 상태 유지
      setAssets([]);
      setEndCursor(null);
      setHasNextPage(false);
      return;
    }
    setRefreshing(true);
    try {
      await ensurePerm();
      const album = await resolveAlbum();
      if (!album) {
        setAssets([]);
        setEndCursor(null);
        setHasNextPage(false);
        return;
      }
      const page = await MediaLibrary.getAssetsAsync({
        album,
        first: PAGE_SIZE,
        mediaType: ['photo'],
        sortBy: [['creationTime', false]],
      });
      setAssets(page.assets);
      setEndCursor(page.endCursor ?? null);
      setHasNextPage(!!page.hasNextPage);
    } finally {
      setRefreshing(false);
    }
  }, [path, ensurePerm, resolveAlbum]);

  const fetchMore = useCallback(async () => {
    if (!path || loadingMore || !hasNextPage || !endCursor) return;
    setLoadingMore(true);
    try {
      const album = await resolveAlbum();
      if (!album) return;
      const page = await MediaLibrary.getAssetsAsync({
        album,
        first: PAGE_SIZE,
        after: endCursor,
        mediaType: ['photo'],
        sortBy: [['creationTime', false]],
      });
      // 중복 방지 append
      setAssets((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        const dedup = page.assets.filter((a) => !seen.has(a.id));
        return [...prev, ...dedup];
      });
      setEndCursor(page.endCursor ?? null);
      setHasNextPage(!!page.hasNextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [path, loadingMore, hasNextPage, endCursor, resolveAlbum]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    fetchFirst();
  }, [fetchFirst]);

  return { assets, refreshing, fetchFirst, fetchMore, loadingMore, hasNextPage };
}
