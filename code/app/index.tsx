// app/index.tsx (혹은 기존 index.tsx 위치에 맞게)

import { FloatingToolbar } from '@/src/components/FloatingToolbar/FloatingToolbar';
import { font } from '@/src/constants/fonts';
import { useSimilarBatchInfer } from '@/src/hooks/useSimilarBatchInfer';
import { useToolbarActions } from '@/src/hooks/useToolbarActions';
import { useUnifiedBatchInfer } from '@/src/hooks/useUnifiedBatchInfer';
import { getExcludedAssetIdSet } from '@/src/utils/albums';
import { loadEnabledFeatureIds } from '@/src/utils/featureToggles';
import { getSimilarityThreshold } from '@/src/utils/similarity';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';

type Asset = MediaLibrary.Asset;

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

// ===== 정렬 & 페이징 =====
const ASSET_SORT: MediaLibrary.SortByValue[] = [[MediaLibrary.SortBy.creationTime, false]];
const FIRST_LOAD = 120;
const PAGE_SIZE = 60;

// ===== 전량 재색인 청크 크기 =====
const CHUNK_SIZE = 1000;

// ===== 캐시 (화면 전환해도 유지) =====
const cache = {
  hydrated: false,
  assets: [] as Asset[],
  endCursor: null as string | null,
  hasNextPage: true,
  excludedIds: new Set<string>(),
};

// ===== 권한: 1회만 요청 =====
let permOnce: Promise<boolean> | null = null;
async function ensurePermissionOnce(): Promise<boolean> {
  if (!permOnce) {
    permOnce = (async () => {
      const cur = await MediaLibrary.getPermissionsAsync();
      if (cur.status === 'granted' || cur.status === 'limited') return true;
      const req = await MediaLibrary.requestPermissionsAsync();
      return req.status === 'granted' || req.status === 'limited';
    })();
  }
  return permOnce;
}

// ===== 전량 수집 유틸 =====
async function loadAllAssets(): Promise<Asset[]> {
  const ok = await ensurePermissionOnce();
  if (!ok) return [];
  const all: Asset[] = [];
  let after: string | null = null;
  const PAGE = 300; // 기기 성능에 따라 조정

  // 끝까지 긁기
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      sortBy: ASSET_SORT,
      first: PAGE,
      ...(after ? { after } : {}),
    });
    all.push(...page.assets);
    after = page.endCursor ?? null;
    if (!page.hasNextPage) break;
  }
  return all;
}

export default function MainPage() {
  const router = useRouter();

  // ===== 리스트 상태 =====
  const [refreshing, setRefreshing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>(cache.assets);
  const [endCursor, setEndCursor] = useState<string | null>(cache.endCursor);
  const [hasNextPage, setHasNextPage] = useState<boolean>(cache.hasNextPage);
  const [loadingMore, setLoadingMore] = useState(false);

  // ===== 기능 토글 =====
  const [enabledFeatures, setEnabledFeatures] = useState<string[] | null>(null);
  const reloadEnabledFeatures = useCallback(async () => {
    const ids = await loadEnabledFeatureIds();
    setEnabledFeatures(ids);
  }, []);

  useEffect(() => {
    reloadEnabledFeatures();
  }, [reloadEnabledFeatures]);

  // ===== 선택 모드 =====
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const enterSelection = useCallback((id: string) => {
    setSelectionMode(true);
    setSelected(new Set([id]));
  }, []);
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectionMode(false);
  }, []);

  // ===== 헤더 페이드 =====
  const headerOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => () => headerOpacity.stopAnimation(), [headerOpacity]);
  const fadeTo = (to: number, duration = 180) =>
    Animated.timing(headerOpacity, { toValue: to, duration, useNativeDriver: true }).start();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = () => {
    fadeTo(0, 120);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      fadeTo(1, 220);
      idleTimerRef.current = null;
    }, 140);
  };
  const headerAnimStyle = {
    opacity: headerOpacity,
    transform: [
      { translateY: headerOpacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
    ],
  } as const;

  // ===== 분류(추론) =====
  const [isInferring, setIsInferring] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [similarityTh, setSimilarityTh] = useState<number>(0.8);

  useEffect(() => {
    (async () => {
      try {
        const th = await getSimilarityThreshold(); // 없으면 0.8
        setSimilarityTh(th);
      } catch {
        setSimilarityTh(0.8);
      }
    })();
  }, []);

  const [excludedIds, setExcludedIds] = useState<Set<string>>(cache.excludedIds);
  const [excludedReady, setExcludedReady] = useState(cache.excludedIds.size > 0);

  // inferTargets: 화면 로드된 자산 기준(일반 UI용). 전량 재색인은 별도 함수에서 직접 targets 구성.
  const inferTargets = useMemo(
    () => assets.filter((a) => !excludedIds.has(a.id)),
    [assets, excludedIds]
  );

  const similarOn = useMemo(
    () => (enabledFeatures ? enabledFeatures.includes('similar') : true),
    [enabledFeatures]
  );

  // similar이 꺼져 있으면 대상 0장으로 넘겨서 훅이 바로 no-op
  const similarInfer = useSimilarBatchInfer(similarOn ? inferTargets : [], {
    concurrency: 4,
    threshold: similarityTh,
    minClusterSize: 2,
  });

  const unifiedInfer = useUnifiedBatchInfer(inferTargets, {
    enabledFeatureIds: enabledFeatures ?? undefined,
  });

  // 진행률 UI 반영
  useEffect(() => {
    if (similarInfer.running) setTotalProgress(similarInfer.progress * 0.5);
  }, [similarInfer.running, similarInfer.progress]);
  useEffect(() => {
    if (unifiedInfer.running) setTotalProgress(0.5 + unifiedInfer.progress * 0.5);
  }, [unifiedInfer.running, unifiedInfer.progress]);

  // 최신 훅/함수를 ref로 고정 (deps 루프 방지)
  const similarRef = useRef(similarInfer);
  const unifiedRef = useRef(unifiedInfer);
  const loadExcludedRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    similarRef.current = similarInfer;
  }, [similarInfer]);
  useEffect(() => {
    unifiedRef.current = unifiedInfer;
  }, [unifiedInfer]);

  // 중복 실행 방지
  const inferLockRef = useRef(false);

  // ===== 로더 =====
  const ensurePermission = useCallback(async () => ensurePermissionOnce(), []);

  const loadExcluded = useCallback(async () => {
    setExcludedReady(false);
    try {
      const idSet = await getExcludedAssetIdSet();
      setExcludedIds(idSet);
      cache.excludedIds = idSet;
    } catch {
      setExcludedIds(new Set());
      cache.excludedIds = new Set();
    } finally {
      setExcludedReady(true);
    }
  }, []);
  useEffect(() => {
    loadExcludedRef.current = loadExcluded;
  }, [loadExcluded]);

  const loadInitial = useCallback(async () => {
    const ok = await ensurePermission();
    if (!ok) {
      setAssets([]);
      setEndCursor(null);
      setHasNextPage(false);
      cache.assets = [];
      cache.endCursor = null;
      cache.hasNextPage = false;
      return;
    }
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ASSET_SORT,
        first: FIRST_LOAD,
      });
      setAssets(page.assets);
      setEndCursor(page.endCursor ?? null);
      setHasNextPage(page.hasNextPage);

      cache.assets = page.assets;
      cache.endCursor = page.endCursor ?? null;
      cache.hasNextPage = page.hasNextPage;
    } catch (e) {
      console.error('Failed to load assets:', e);
      setAssets([]);
      setEndCursor(null);
      setHasNextPage(false);

      cache.assets = [];
      cache.endCursor = null;
      cache.hasNextPage = false;
    }
  }, [ensurePermission]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || loadingMore || !endCursor) return;
    const ok = await ensurePermission();
    if (!ok) return;

    setLoadingMore(true);
    try {
      const page = await MediaLibrary.getAssetsAsync({
        mediaType: 'photo',
        sortBy: ASSET_SORT,
        first: PAGE_SIZE,
        after: endCursor,
      });
      const newAssets = page.assets;

      setAssets((prev) => {
        const next = [...prev, ...newAssets];
        cache.assets = next;
        return next;
      });

      setEndCursor(page.endCursor ?? null);
      setHasNextPage(page.hasNextPage);
      cache.endCursor = page.endCursor ?? null;
      cache.hasNextPage = page.hasNextPage;

      // 모델은 전량 재색인으로 이미 수행했으므로 여기선 추가 실행 없음
    } catch (e) {
      console.error('Failed to load more assets:', e);
    } finally {
      setLoadingMore(false);
    }
  }, [hasNextPage, loadingMore, endCursor, ensurePermission]);

  // ===== 전량 재색인 (청크) =====
  const reindexAllChunks = useCallback(async () => {
    if (inferLockRef.current) {
      console.log('[infer] skip: already running');
      return;
    }
    inferLockRef.current = true;
    setIsInferring(true);
    setTotalProgress(0);

    try {
      // 1) 제외 세트 확보
      await loadExcludedRef.current?.();
      const excluded = cache.excludedIds;

      // 2) 전량 수집
      const all = await loadAllAssets();

      // 3) 타겟 필터
      const targets = all.filter((a) => !excluded.has(a.id));
      if (targets.length === 0) {
        setTotalProgress(1);
        console.log('[infer] no targets');
        return;
      }

      // 4) 청크 단위로 similar → unified
      // 토글 상태로 similar 실행 여부 결정
      const similarOnNow = enabledFeatures ? enabledFeatures.includes('similar') : true;

      const total = targets.length;
      let processed = 0;

      for (let i = 0; i < targets.length; i += CHUNK_SIZE) {
        const chunk = targets.slice(i, i + CHUNK_SIZE);

        // similar: 켜져있을 때만
        if (similarOnNow) {
          console.log(`🚀 similar.runOn chunk ${i / CHUNK_SIZE + 1}`);
          await similarRef.current.runOn(chunk);
        } else {
          console.log('⏭️ similar skipped by toggle');
        }

        // 제외 세트가 정책상 변할 수 있으면 주기적으로 갱신
        await loadExcludedRef.current?.();

        // unified
        console.log(`🚀 unified.runOn chunk ${i / CHUNK_SIZE + 1}`);
        await unifiedRef.current.runOn(chunk);

        processed += chunk.length;
        // 진행률(거칠게 %): similar 50% + unified 50% 비중
        const p = Math.min(processed / total, 1);
        setTotalProgress(p);
      }

      setTotalProgress(1);
      console.log('✅ full reindex done');

      // (선택) UI 리스트를 전량으로 한 번에 갱신하고 싶다면 주석 해제:
      // setAssets(all);
      // setEndCursor(null);
      // setHasNextPage(false);
      // cache.assets = all;
      // cache.endCursor = null;
      // cache.hasNextPage = false;
    } catch (e) {
      console.warn('full reindex failed:', e);
    } finally {
      setIsInferring(false);
      inferLockRef.current = false;
    }
    // enabledFeatures가 바뀌면 최신 토글로 재색인되도록
  }, [enabledFeatures]);

  // ===== 초기 1회: 초기 UI + 전량 재색인 =====
  const bootedRef = useRef(false);
  // 부팅 이펙트: 초기 데이터 로드까지만
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    (async () => {
      if (cache.hydrated) {
        setAssets(cache.assets);
        setEndCursor(cache.endCursor);
        setHasNextPage(cache.hasNextPage);
        setExcludedIds(cache.excludedIds);
        setExcludedReady(true);
      } else {
        await loadExcluded();
        await loadInitial();
        cache.hydrated = true;
      }

      // 토글만 로드
      await reloadEnabledFeatures();
    })();
  }, [reloadEnabledFeatures, loadExcluded, loadInitial]);

  // 최초 1회: enabledFeatures가 준비되면 재색인
  const firstReindexRan = useRef(false);
  useEffect(() => {
    if (!bootedRef.current) return;
    if (enabledFeatures == null) return; // 아직 로딩 전
    if (firstReindexRan.current) return;
    firstReindexRan.current = true;

    // 이 시점에는 unifiedInfer가 새 옵션으로 렌더됐고, unifiedRef.current도 useEffect로 갱신됨.
    (async () => {
      await reindexAllChunks();
    })();
  }, [enabledFeatures, reindexAllChunks]);

  // ===== Pull to Refresh: 전량 재색인 =====
  const onRefresh = useCallback(async () => {
    console.log('[refresh] start');
    setRefreshing(true);

    similarRef.current.abort?.();
    unifiedRef.current.abort?.();
    inferLockRef.current = false;
    setIsInferring(false);

    await loadExcluded();
    await loadInitial();

    // 토글 최신화 후 재색인
    await reloadEnabledFeatures();

    // 렌더/이펙트 턴 한 번 양보 (unifiedRef 갱신 보장)
    await new Promise((r) => setTimeout(r, 0));

    await reindexAllChunks();

    setRefreshing(false);
    console.log('[refresh] done');
  }, [loadExcluded, loadInitial, reindexAllChunks, reloadEnabledFeatures]);

  // ===== 레이아웃 =====
  const screenWidth = Dimensions.get('window').width;
  const numColumns = 3;
  const gap = 1;
  const itemSize = (screenWidth - gap * (numColumns - 1)) / numColumns;

  // ===== 툴바 =====
  const { deleteSelected, shareSelected, openMovePicker, MovePicker } = useToolbarActions({
    selected,
    clearSelection,
    onCompleted: (action) => {
      if (action === 'delete') {
        (async () => {
          await loadExcluded();
          await loadInitial();
          // 삭제 후 즉시 전량 재색인까지 필요하면 아래 주석 해제
          // await reindexAllChunks();
        })();
      }
    },
  });

  return (
    <>
      <FlatList
        data={assets}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap }}
        className="flex-1 bg-white"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isInferring || !excludedReady}
            onRefresh={onRefresh}
          />
        }
        onEndReachedThreshold={0.3}
        onEndReached={loadMore}
        renderItem={({ item, index }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onLongPress={() => enterSelection(item.id)}
              onPress={() => {
                if (selectionMode) {
                  toggleSelect(item.id);
                  return;
                }
                // index 기반 viewer 이동 (dataset 키를 쓰지 않는 버전)
                router.push({
                  pathname: '/[path]',
                  params: { path: 'all', index: String(index) },
                });
              }}
              style={{ width: itemSize, height: itemSize }}>
              <Image
                source={{ uri: item.uri }}
                style={{ width: itemSize, height: itemSize, opacity: isSelected ? 0.65 : 1 }}
                contentFit="cover"
              />
              {selectionMode && (
                <View style={{ position: 'absolute', top: 6, left: 6 }}>
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#111' : 'rgba(255,255,255,0.9)',
                      borderWidth: isSelected ? 0 : 1,
                      borderColor: 'rgba(0,0,0,0.15)',
                    }}>
                    {isSelected ? <Icon source="check" size={14} color="#fff" /> : null}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={loadingMore ? <Text className="text-center">불러오는 중…</Text> : null}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* 헤더 (디밍 + 컨트롤) */}
      <AnimatedLinearGradient
        pointerEvents="none"
        colors={['rgba(0, 0, 0, 0.9)', 'transparent']}
        className="absolute left-0 right-0 top-0 h-56"
        style={headerAnimStyle}
      />
      <Animated.View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 h-56"
        style={headerAnimStyle}>
        <View
          pointerEvents="box-none"
          className="flex w-full flex-row items-start px-4 pt-7"
          style={{ height: '100%' }}>
          <View
            className="flex w-full flex-row items-center justify-between"
            pointerEvents="box-none">
            <Text style={font.bold} className="text-2xl text-white">
              모든 사진
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              className="flex items-center justify-center rounded-full bg-white px-3.5 py-2"
              onPress={selectionMode ? clearSelection : () => setSelectionMode(true)}>
              <Text style={font.bold}>
                {selectionMode
                  ? `${selected.size}개 선택 취소`
                  : isInferring
                    ? `${Math.round(totalProgress * 100)}%`
                    : '선택'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {selectionMode && (
        <FloatingToolbar
          onDelete={deleteSelected}
          onShare={shareSelected}
          onDetails={openMovePicker}
        />
      )}
      {MovePicker}
    </>
  );
}
