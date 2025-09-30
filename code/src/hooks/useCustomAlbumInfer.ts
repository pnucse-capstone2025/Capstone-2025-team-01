import * as MediaLibrary from 'expo-media-library';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CustomAlbumState,
  loadAlbumById,
  loadAlbums,
  loadAlbumState,
  loadTrainPicks,
  saveAlbumState,
  saveTrainPicks,
} from '../utils/customAlbum';
import { createRepresentativeEmbedding, findSimilarAssets } from '../utils/customAlbumInfer';

type Status = CustomAlbumState['status'];

type Progress = {
  message: string;
  value: number; // 0 to 1
};

// `start` 함수에 전달할 옵션 타입을 정의
type StartOptions = {
  threshold?: number;
};

// 파일 상단 또는 start 내부 위쪽에 헬퍼 함수 추가
async function collectAssetIdsOfAlbums(titles: string[]) {
  const excluded = new Set<string>();

  // 로컬 미디어 라이브러리에서 제목으로 앨범 찾기
  // (가능하면 id를 저장해 두고 그걸 쓰는 게 더 안전하지만, 현재 구조에선 title 매칭)
  for (const title of titles) {
    if (!title?.trim()) continue;
    const libAlbum = await MediaLibrary.getAlbumAsync(title.trim());
    if (!libAlbum) continue;

    // 모든 자산을 페이징으로 수집
    let after: string | undefined = undefined;
    // first는 한 번에 가져올 개수, 너무 작지 않게 500~1000 정도 권장
    const PAGE = 1000;

    while (true) {
      const page = await MediaLibrary.getAssetsAsync({
        album: libAlbum, // 또는 album: libAlbum.id
        mediaType: 'photo',
        first: PAGE,
        after,
      });
      for (const a of page.assets) excluded.add(a.id);
      if (!page.endCursor || !page.hasNextPage) break;
      after = page.endCursor;
    }
  }

  return excluded;
}

export function useCustomAlbumInfer(albumId: string) {
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState<Progress>({ message: '', value: 0 });
  const [foundCount, setFoundCount] = useState<number | null>(null);
  const abortRef = useRef(false);

  useEffect(() => {
    if (!albumId) return;
    abortRef.current = false;
    (async () => {
      const savedState = await loadAlbumState(albumId);
      if (abortRef.current) return;
      if (savedState) {
        setStatus(savedState.status ?? 'idle');
        setFoundCount(savedState.foundCount ?? null);
      } else {
        setStatus('idle');
        setFoundCount(null);
      }
    })();
    return () => {
      abortRef.current = true;
    };
  }, [albumId]);

  const start = useCallback(
    async (options?: StartOptions) => {
      if (!albumId) return;
      abortRef.current = false;

      // 옵션에서 임계값을 가져오거나, 없으면 기본값 0.6을 사용
      const searchThreshold = options?.threshold ?? 0.6;

      try {
        setStatus('training');
        setProgress({ message: '학습 이미지를 불러오는 중...', value: 0 });

        // 1) 학습 픽 로드
        const trainPicks = await loadTrainPicks(albumId);
        if (trainPicks.length < 10) {
          throw new Error('최소 10장의 학습 이미지가 필요합니다.');
        }
        const trainUris = trainPicks.map((p) => p.uri);

        // 2) 임베딩 생성
        setProgress({ message: `학습 이미지 ${trainUris.length}장으로 학습 중...`, value: 0.1 });
        const representativeEmbedding = await createRepresentativeEmbedding(
          trainUris,
          (done, total) => {
            if (abortRef.current) throw new Error('Aborted');
            setProgress({
              message: `학습 중... (${done}/${total})`,
              value: 0.1 + (done / total) * 0.2,
            });
          }
        );

        // 3) 학습 픽의 assetId 보강(지문 인덱스/스캔)
        const trainPicksAll = await loadTrainPicks(albumId);
        const trainAssetIds = trainPicksAll.map((p) => p.assetId).filter((x): x is string => !!x);

        const missingByFp = trainPicksAll
          .filter((p) => !p.assetId && p.fpKey)
          .map((p) => ({
            fpKey: p.fpKey!,
            md5: p.sig,
            size: p.size,
            width: p.width,
            height: p.height,
            takenAt: p.takenAt,
          }));

        let resolvedMap: Record<string, string> = {};
        if (missingByFp.length) {
          const { findAssetIdsInIndex } = await import('../utils/fingerprintIndex');
          const inIndex = await findAssetIdsInIndex(
            albumId,
            missingByFp.map((x) => x.fpKey)
          );
          resolvedMap = { ...inIndex };

          const unresolved = missingByFp.filter((x) => !resolvedMap[x.fpKey]);
          if (unresolved.length) {
            const { resolveAssetIdsByFpHints } = await import('../utils/fingerprintResolve');
            const byScan = await resolveAssetIdsByFpHints(unresolved);
            resolvedMap = { ...resolvedMap, ...byScan };
          }
        }

        if (Object.keys(resolvedMap).length) {
          let changed = false;
          for (const p of trainPicksAll) {
            if (!p.assetId && p.fpKey && resolvedMap[p.fpKey]) {
              p.assetId = resolvedMap[p.fpKey];
              changed = true;
            }
          }
          if (changed) {
            await saveTrainPicks(albumId, trainPicksAll);
          }
        }

        // assetId 기준으로 학습샘플 제외
        const trainAssetIdSet = new Set<string>([...trainAssetIds, ...Object.values(resolvedMap)]);

        // 4) 사용자 정의 앨범(게시된 것)들의 assetId 수집
        setStatus('inferring');
        setProgress({ message: '모든 사진을 불러오는 중...', value: 0.3 });

        const allCustom = await loadAlbums();
        const publishedTitles = allCustom
          .filter((a) => a.isUserCreated === true && a.title?.trim())
          .map((a) => a.title.trim());

        const excludedByCustomAlbums = await collectAssetIdsOfAlbums(publishedTitles);

        // 5) 전체 자산 로드 및 탐색 대상 필터링 (assetId 기준 제외) ← ★ 수정된 부분
        const allAssets = await MediaLibrary.getAssetsAsync({
          mediaType: 'photo',
          first: 100000,
        });

        const assetsToSearch = allAssets.assets.filter(
          (a) => !trainAssetIdSet.has(a.id) && !excludedByCustomAlbums.has(a.id)
        );

        setProgress({ message: `${assetsToSearch.length}장의 사진을 탐색중...`, value: 0.3 });

        const foundAssets = await findSimilarAssets(assetsToSearch, representativeEmbedding, {
          threshold: searchThreshold,
          concurrency: 4,
          onProgress: (done, total) => {
            if (abortRef.current) throw new Error('Aborted');
            setProgress({
              message: `탐색중... (${done}/${total})`,
              value: 0.3 + (done / total) * 0.7,
            });
          },
        });

        if (abortRef.current) throw new Error('Aborted');

        // 로그
        console.log(
          `[Custom Album: ${albumId}] Analysis complete with threshold ${searchThreshold}.`
        );
        console.log(`- Training images: ${trainUris.length}`);
        console.log(`- New similar photos found: ${foundAssets.length}`);
        console.log(`- Total files to be moved: ~${trainAssetIdSet.size + foundAssets.length}`);

        // 6) 앨범 반영(유효성/중복/접근 체크 추가)
        try {
          const albumMeta = await loadAlbumById(albumId);
          const albumTitle = albumMeta?.title?.trim() || `Album-${albumId}`;

          const perm = await MediaLibrary.requestPermissionsAsync();
          if (!perm.granted) throw new Error('갤러리 접근 권한이 필요합니다.');

          // 최종 후보 집합(중복 제거)
          const foundAssetIds = foundAssets.map((a) => a.id);
          const toMoveIds = Array.from(new Set<string>([...trainAssetIdSet, ...foundAssetIds]));

          // 앨범 확보/생성 (create는 첫 자산 필요)
          let targetAlbum = await MediaLibrary.getAlbumAsync(albumTitle);
          if (!targetAlbum) {
            if (toMoveIds.length === 0) {
              console.log(`[Custom Album: ${albumId}] No assets to create album "${albumTitle}".`);
            } else {
              // 첫 자산 id가 실제 유효한지 확인
              let firstValidId: string | undefined;
              for (const id of toMoveIds) {
                try {
                  const info = await MediaLibrary.getAssetInfoAsync(id);
                  if (info && (info.localUri || info.uri)) {
                    firstValidId = id;
                    break;
                  }
                } catch {}
              }
              if (!firstValidId) {
                throw new Error('유효한 자산이 없어 앨범을 생성할 수 없습니다.');
              }
              targetAlbum = await MediaLibrary.createAlbumAsync(albumTitle, firstValidId, false);
              // 이미 추가된 첫 자산은 후보에서 제외
              const idx = toMoveIds.indexOf(firstValidId);
              if (idx >= 0) toMoveIds.splice(idx, 1);
            }
          }

          if (targetAlbum && toMoveIds.length > 0) {
            // 유효 자산만 남기기
            const validIds: string[] = [];
            for (const id of toMoveIds) {
              try {
                const info = await MediaLibrary.getAssetInfoAsync(id);
                if (info && (info.localUri || info.uri)) validIds.push(id);
              } catch {
                /* invalid id 무시 */
              }
            }

            // 앨범의 기존 멤버 제외
            const existing = await MediaLibrary.getAssetsAsync({
              album: targetAlbum,
              first: 100000,
            });
            const existingSet = new Set(existing.assets.map((a) => a.id));
            const toAdd = validIds.filter((id) => !existingSet.has(id));

            if (toAdd.length > 0) {
              await MediaLibrary.addAssetsToAlbumAsync(toAdd, targetAlbum, false /* move */);
            }

            console.log(
              `[Custom Album: ${albumId}] Updated local album "${albumTitle}" — added ${toAdd.length} assets.`
            );
          }
        } catch (moveErr) {
          console.warn('Moving assets into local album failed:', moveErr);
        }

        // 7) 상태 저장
        setStatus('completed');
        setFoundCount(foundAssets.length);
        setProgress({
          message: `완료했습니다! ${foundAssets.length}개의 새로운 사진을 찾았습니다.`,
          value: 1,
        });

        await saveAlbumState(albumId, {
          status: 'completed',
          embedding: Array.from(representativeEmbedding),
          lastCompleted: Date.now(),
          foundCount: foundAssets.length,
        });
      } catch (e: any) {
        if (e.message !== 'Aborted') {
          console.error('Custom album inference failed:', e);
          setStatus('error');
          setProgress({ message: `Error: ${e.message}`, value: 0 });
          await saveAlbumState(albumId, { status: 'error' });
        }
      }
    },
    [albumId]
  );

  const reset = useCallback(async () => {
    if (!albumId) return;
    setStatus('idle');
    setProgress({ message: '', value: 0 });
    setFoundCount(null);
    await saveAlbumState(albumId, { status: 'idle' });
  }, [albumId]);

  return { status, progress, foundCount, start, reset };
}
