import { SIMILAR_ALBUM_TITLE } from '@/src/constants/albums';
import { addAssetsToAlbum } from '@/src/utils/albums';
import { runSimilarGrouping, SimilarOptions, SimilarResult } from '@/src/utils/inferSimilar';
import type * as MediaLibrary from 'expo-media-library';
import { useEffect, useMemo, useRef, useState } from 'react';

type Asset = MediaLibrary.Asset;

export function useSimilarBatchInfer(
  assets: Asset[],
  options: Omit<SimilarOptions, 'onProgress'> = {}
) {
  const { concurrency = 4, threshold = 0.7, minClusterSize = 2, ...rest } = options;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, SimilarResult | { error: string }>>({});
  const [groups, setGroups] = useState<SimilarResult['groups']>([]);
  const abortRef = useRef({ aborted: false });

  useEffect(() => {
    abortRef.current.aborted = true;
    return () => {
      abortRef.current.aborted = true;
    };
  }, []);

  // 전체 분류 및 이동
  const runAll = useMemo(() => {
    return async () => {
      if (!assets.length) {
        setResults({});
        setProgress(1);
        setGroups([]);
        return;
      }
      abortRef.current = { aborted: false };
      setRunning(true);
      setProgress(0);
      setResults({});
      setGroups([]);

      try {
        const uriToAssetMap = new Map(assets.map((a) => [a.uri, a]));
        const uris = assets.map((a) => a.uri);

        const similarResults = await runSimilarGrouping(uris, {
          concurrency,
          threshold,
          minClusterSize,
          onProgress: (done, total) => {
            if (!abortRef.current.aborted) {
              setProgress(done / total);
            }
          },
          ...rest,
        });

        if (abortRef.current.aborted) return;

        setResults({ all: similarResults });
        setGroups(similarResults.groups);
        setProgress(1);

        // 클러스터링 후 '유사한 사진' 앨범으로 이동
        if (similarResults.groups.length > 0) {
          const assetsToMove: Asset[] = [];
          const movedUris = new Set<string>();
          const allMemberUris = similarResults.groups.flatMap((g) => g.memberUris);

          for (const uri of allMemberUris) {
            if (movedUris.has(uri)) continue;
            const asset = uriToAssetMap.get(uri);
            if (asset) {
              assetsToMove.push(asset);
              movedUris.add(uri);
            }
          }

          if (assetsToMove.length > 0) {
            console.log(`Moving ${assetsToMove.length} similar photos...`);
            await addAssetsToAlbum(SIMILAR_ALBUM_TITLE, assetsToMove);
            console.log(
              `Successfully moved ${assetsToMove.length} photos to "${SIMILAR_ALBUM_TITLE}".`
            );
          }
        }
      } catch (e: any) {
        console.error('Clustering or album move failed:', e);
        setResults({ all: { error: String(e?.message ?? e) } });
      } finally {
        if (!abortRef.current.aborted) {
          setRunning(false);
        }
      }
    };
  }, [assets, concurrency, threshold, minClusterSize, rest]);

  // 부분 분류 (새로 스크롤된 항목들에 대해)
  const runOn = useMemo(() => {
    return async (subset: Asset[]) => {
      if (!subset?.length) return;

      const uriToAssetMap = new Map(subset.map((a) => [a.uri, a]));
      const newUris = subset.map((a) => a.uri);

      const similarResults = await runSimilarGrouping(newUris, {
        concurrency,
        threshold,
        minClusterSize,
        ...rest,
      });

      setGroups((prev) => [...prev, ...similarResults.groups]);

      // 새 하위 집합의 클러스터링 결과에 따라 이동
      if (similarResults.groups.length > 0) {
        const assetsToMove: Asset[] = [];
        const movedUris = new Set<string>();
        const allMemberUris = similarResults.groups.flatMap((g) => g.memberUris);

        for (const uri of allMemberUris) {
          if (movedUris.has(uri)) continue;
          const asset = uriToAssetMap.get(uri);
          if (asset) {
            assetsToMove.push(asset);
            movedUris.add(uri);
          }
        }

        if (assetsToMove.length > 0) {
          try {
            console.log(`Moving ${assetsToMove.length} new similar photos...`);
            await addAssetsToAlbum(SIMILAR_ALBUM_TITLE, assetsToMove);
            console.log(
              `Successfully moved ${assetsToMove.length} new photos to "${SIMILAR_ALBUM_TITLE}".`
            );
          } catch (e) {
            console.error('Album move for new photos failed:', e);
          }
        }
      }
    };
  }, [concurrency, threshold, minClusterSize, rest]);

  return {
    runAll,
    runOn,
    results,
    running,
    progress,
    groups,
    abort: () => (abortRef.current.aborted = true),
  };
}
