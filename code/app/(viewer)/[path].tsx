import { ZoomableImage } from '@/src/components/ZoomableImage';
import { font } from '@/src/constants/fonts';
import { useAlbumViewerData } from '@/src/hooks/useAlbumViewerData';
import { useAssetModTime } from '@/src/hooks/useAssetModTime';
import { Asset } from '@/src/types/domain/asset';
import { bytesToReadable } from '@/src/utils/format';
import { ensureMediaPermissions } from '@/src/utils/permissions';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlatList, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Icon } from 'react-native-paper';
import { runOnJS } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AlbumViewerPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  // params: /[path]?path=<키|all>&index=<숫자>&source=<local|smart>&albumId=<id>
  const {
    path,
    index: indexParam,
    source,
    albumId,
  } = useLocalSearchParams<{
    path?: string;
    index?: string;
    source?: string;
    albumId?: string;
  }>();

  const isLocal = source === 'local';
  const isAll = !isLocal && path === 'all';
  const initialIndex = Number(indexParam ?? 0);

  // ===== 데이터 소스 =====
  const { assets, loading } = useAlbumViewerData({
    isAll,
    isLocal,
    path,
    albumId,
  });

  // ===== 리스트/스크롤 상태 =====
  const listRef = useRef<FlatList<Asset>>(null);
  const [index, setIndex] = useState<number>(Math.max(0, initialIndex));
  const currentIndexRef = useRef<number>(Math.max(0, initialIndex));
  const [pagingEnabled, setPagingEnabled] = useState(true);

  const safeInitialIndex = Math.min(Math.max(0, initialIndex), Math.max(assets.length - 1, 0));
  const enableInitialIndex = assets.length > 0;

  const keyExtractor = useCallback((item: Asset) => item.id, []);
  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: width, offset: width * i, index: i }),
    [width]
  );

  const onViewableItemsChanged = useRef(
    (info: { viewableItems: Array<{ index: number | null }> }) => {
      const next = info.viewableItems?.[0]?.index;
      if (next == null || typeof next !== 'number') return;
      if (next !== currentIndexRef.current) {
        currentIndexRef.current = next;
        setIndex(next);
      }
    }
  ).current;

  // ===== 상단 컨트롤 표시/숨김 애니메이션 =====
  const [controlsVisible, setControlsVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: controlsVisible ? 1 : 0,
        duration: controlsVisible ? 160 : 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: controlsVisible ? 0 : -8,
        duration: controlsVisible ? 160 : 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [controlsVisible, opacity, translateY]);

  const scheduleAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setControlsVisible(true);
    scheduleAutoHide();
  }, [scheduleAutoHide]);

  const onTapJS = () => {
    setControlsVisible((v) => {
      const next = !v;
      if (next) scheduleAutoHide();
      return next;
    });
  };
  const tap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((_e, success) => {
      'worklet';
      if (!success) return;
      runOnJS(onTapJS)();
    });

  // ===== 현재 인덱스 자산의 수정시간 표시 =====
  const current = assets[index];
  const { modTimeText } = useAssetModTime(current?.id);

  // ===== 공유 & 정보 =====
  const handleShare = useCallback(async () => {
    const asset = assets[index];
    if (!asset) return;

    try {
      await ensureMediaPermissions();
      setControlsVisible(true);
      scheduleAutoHide();

      const info: MediaLibrary.AssetInfo = await MediaLibrary.getAssetInfoAsync(asset.id);
      await Share.share({
        url: info.localUri ?? info.uri ?? asset.uri,
        message: undefined,
      });
    } catch (e: unknown) {
      Alert.alert('오류', (e as { message?: string })?.message ?? '공유 중 오류가 발생했습니다.');
    }
  }, [assets, index, scheduleAutoHide]);

  const handleInfo = useCallback(async () => {
    const asset = assets[index];
    if (!asset) return;

    try {
      await ensureMediaPermissions();
      setControlsVisible(true);
      scheduleAutoHide();

      const info = await MediaLibrary.getAssetInfoAsync(asset.id);

      let bytes: number | null = null;
      const localPath = (info.localUri ?? (info as MediaLibrary.AssetInfo).uri) as
        | string
        | undefined;

      if (localPath?.startsWith('file://')) {
        const stat = await FileSystem.getInfoAsync(localPath);
        if (stat.exists && typeof stat.size === 'number') {
          bytes = stat.size;
        }
      }

      const lines = [
        `파일명: ${info.filename ?? '-'}`,
        `경로: ${info.localUri ?? info.uri ?? '-'}`,
        `해상도: ${info.width && info.height ? `${info.width} × ${info.height}` : '-'}`,
        `용량: ${bytes ? bytesToReadable(bytes) : '-'}`,
        `촬영(creation): ${info.creationTime ? new Date(info.creationTime).toLocaleString() : '-'}`,
        `수정(modification): ${
          info.modificationTime ? new Date(info.modificationTime).toLocaleString() : '-'
        }`,
      ];

      Alert.alert('사진 정보', lines.join('\n'), [{ text: '확인' }], { cancelable: true });
    } catch (e: unknown) {
      Alert.alert(
        '오류',
        (e as { message?: string })?.message ?? '정보를 불러오는 중 오류가 발생했습니다.'
      );
    }
  }, [assets, index, scheduleAutoHide]);

  // ===== 로딩/빈 상태 =====
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'black',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!assets || assets.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: 'black',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={[font.bold, { color: '#fff' }]}>표시할 사진이 없어요</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <GestureDetector gesture={tap}>
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={assets}
            horizontal
            pagingEnabled
            scrollEnabled={pagingEnabled}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            {...(enableInitialIndex ? { initialScrollIndex: safeInitialIndex } : {})}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => listRef.current?.scrollToIndex({ index, animated: false }), 80);
            }}
            onScrollBeginDrag={() => setControlsVisible(false)}
            onMomentumScrollEnd={() => {
              setControlsVisible(true);
              scheduleAutoHide();
            }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            initialNumToRender={1}
            windowSize={3}
            maxToRenderPerBatch={2}
            removeClippedSubviews={Platform.OS === 'android'}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
                <ZoomableImage
                  uri={item.uri}
                  width={width}
                  height={height}
                  onZoomActiveChange={(active) => setPagingEnabled(!active)}
                />
              </View>
            )}
          />
        </View>
      </GestureDetector>

      {/* 상단 컨트롤 */}
      <Animated.View
        pointerEvents={controlsVisible ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2,
          paddingTop: insets.top + 8,
          paddingHorizontal: 12,
          paddingBottom: 12,
          opacity,
          transform: [{ translateY }],
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Icon source="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <Text style={[font.bold, { color: '#fff' }]}>{`${index + 1} / ${assets.length}`}</Text>
          <Text style={{ color: '#ddd', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
            {modTimeText ?? '…'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <TouchableOpacity onPress={handleShare} hitSlop={12}>
            <Icon source="share-variant" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleInfo} hitSlop={12}>
            <Icon source="information-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}
