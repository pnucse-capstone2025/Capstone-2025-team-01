import type * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  BLUR_ALBUM_TITLE,
  CHAT_ALBUM_TITLE,
  DOC_ALBUM_TITLE,
  HIGHCONT_ALBUM_TITLE,
  NOOBJECT_ALBUM_TITLE,
  SIMILAR_ALBUM_TITLE,
} from '../constants/albums';
import { addAssetsToAlbum } from '../utils/albums';
import { getReadableUri } from '../utils/getReadableUri';
import { inferUnified } from '../utils/inferUnified';

// 라벨 → 앨범명
const ALBUM_TITLE_MAP: Record<string, string> = {
  blur: BLUR_ALBUM_TITLE,
  chat: CHAT_ALBUM_TITLE,
  document: DOC_ALBUM_TITLE,
  highcontrast: HIGHCONT_ALBUM_TITLE,
  noobject: NOOBJECT_ALBUM_TITLE,
  duplicate: SIMILAR_ALBUM_TITLE,
};

// 모델 라벨 → 토글 id 매핑
const LABEL_TO_FEATURE_ID: Record<string, string> = {
  blur: 'blurry',
  chat: 'screenshot',
  document: 'receipt',
  highcontrast: 'highcontrast',
  noobject: 'no-object',
  duplicate: 'similar',
};

type Result = {
  label: string;
  score: number;
  threshold: number;
  passes: boolean;
  probs: number[];
};

type MoveItem = { label: string; asset: MediaLibrary.Asset };

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function groupByAlbumTitle(items: MoveItem[]) {
  const map = new Map<string, MediaLibrary.Asset[]>();
  for (const { label, asset } of items) {
    const title = ALBUM_TITLE_MAP[label] ?? label;
    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(asset);
  }
  return map;
}

export function useUnifiedBatchInfer(
  assets: MediaLibrary.Asset[],
  options?: {
    concurrency?: number;
    moveChunkSize?: number; // 500~1000 권장
    // duplicateThreshold?: number;  // 필요 시 중복 전용 임계값 오버라이드
    enabledFeatureIds?: string[]; // 켜져있는 기능 id 목록 (예: ['blurry','receipt', ...])
  }
) {
  const concurrency = options?.concurrency ?? 4;
  const moveChunkSize = options?.moveChunkSize ?? 500;

  // enabled set (미지정 시 모두 on)
  const enabledSet = useMemo(() => {
    const ids = options?.enabledFeatureIds;
    if (!ids) return null; // null = all enabled
    return new Set(ids);
  }, [options?.enabledFeatureIds]);

  // 특정 라벨이 허용되는지
  const isLabelEnabled = useCallback(
    (label: string) => {
      if (!enabledSet) return true; // 옵션이 없으면 전부 허용
      const fid = LABEL_TO_FEATURE_ID[label];
      if (!fid) return false; // 알 수 없는 라벨은 막음
      return enabledSet.has(fid);
    },
    [enabledSet]
  );

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Record<string, Result | { error: string }>>({});
  const abortRef = useRef({ aborted: false });

  useEffect(() => () => void (abortRef.current.aborted = true), []);

  // 분류(순수): 이동 없음
  const classify = useCallback(async (asset: MediaLibrary.Asset) => {
    const uri = await getReadableUri(asset);
    const result = await inferUnified(uri);
    const scores = `blur:${result.probs[0].toFixed(4)} chat:${result.probs[1].toFixed(
      4
    )} doc:${result.probs[2].toFixed(4)} highcont:${result.probs[3].toFixed(4)} noobj:${result.probs[4].toFixed(4)}`;
    console.log(
      `[UNIFIED SCORE] ${asset.filename} | ${result.label} (${result.score.toFixed(4)}) | ${scores}`
    );
    setResults((prev) => ({ ...prev, [asset.id]: result }));
    return result as Result;
  }, []);

  // 앨범별 배치 이동(한 앨범=한 번 호출)
  const moveInBatchesByLabel = useCallback(
    async (items: MoveItem[]) => {
      if (!items.length) return;
      const grouped = groupByAlbumTitle(items);
      for (const [albumTitle, assetsOfAlbum] of grouped.entries()) {
        for (const part of chunk(assetsOfAlbum, moveChunkSize)) {
          await addAssetsToAlbum(albumTitle, part); // 내부에서 1회 호출로 처리
        }
      }
    },
    [moveChunkSize]
  );

  const runAll = useMemo(() => {
    return async () => {
      if (Platform.OS === 'web' || !assets?.length) return;

      // 모두 꺼져 있다면 즉시 no-op
      if (
        enabledSet &&
        [...enabledSet].every((id) => !Object.values(LABEL_TO_FEATURE_ID).includes(id))
      ) {
        return;
      }

      abortRef.current.aborted = false;
      setRunning(true);
      setProgress(0);
      setResults({});
      let done = 0;

      const queue = [...assets];
      const toMove: MoveItem[] = [];

      const worker = async () => {
        while (queue.length > 0) {
          if (abortRef.current.aborted) break;
          const asset = queue.shift();
          if (!asset) continue;
          try {
            const r = await classify(asset);
            // 이동/반영은 켜진 라벨만
            if (
              r.passes &&
              r.label !== 'others' &&
              ALBUM_TITLE_MAP[r.label] &&
              isLabelEnabled(r.label)
            ) {
              toMove.push({ label: r.label, asset });
            }
          } catch (e: any) {
            setResults((prev) => ({
              ...prev,
              [asset?.id ?? `error-${Date.now()}`]: { error: String(e?.message ?? e) },
            }));
          } finally {
            done++;
            if (done % 5 === 0 || done === assets.length) setProgress(done / assets.length);
          }
        }
      };

      const workers = Array.from({ length: Math.min(concurrency, assets.length) }, () => worker());
      await Promise.all(workers);

      if (!abortRef.current.aborted && toMove.length) {
        await moveInBatchesByLabel(toMove);
      }
      if (!abortRef.current.aborted) {
        setProgress(1);
        setRunning(false);
      }
    };
  }, [assets, concurrency, classify, moveInBatchesByLabel, isLabelEnabled, enabledSet]);

  const runOn = useMemo(() => {
    return async (subset: MediaLibrary.Asset[]) => {
      if (Platform.OS === 'web' || !assets?.length) return;

      // 모두 꺼져 있다면 즉시 no-op
      if (
        enabledSet &&
        [...enabledSet].every((id) => !Object.values(LABEL_TO_FEATURE_ID).includes(id))
      ) {
        return;
      }

      setRunning(true);
      const partToMove: MoveItem[] = [];
      for (const asset of subset) {
        try {
          if (results[asset.id]) continue;
          const r = await classify(asset);
          // 이동/반영은 켜진 라벨만
          if (
            r.passes &&
            r.label !== 'others' &&
            ALBUM_TITLE_MAP[r.label] &&
            isLabelEnabled(r.label)
          ) {
            partToMove.push({ label: r.label, asset });
          }
        } catch (e: any) {
          setResults((prev) => ({ ...prev, [asset.id]: { error: String(e?.message ?? e) } }));
        }
      }
      if (partToMove.length) await moveInBatchesByLabel(partToMove);
      setRunning(false);
    };
  }, [results, classify, moveInBatchesByLabel, isLabelEnabled]);

  const abort = useCallback(() => {
    abortRef.current.aborted = true;
    setRunning(false);
  }, []);

  return { running, progress, results, runAll, runOn, abort };
}
