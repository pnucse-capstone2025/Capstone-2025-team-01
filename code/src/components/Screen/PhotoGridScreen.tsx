import { FloatingToolbar } from '@/src/components/FloatingToolbar/FloatingToolbar';
import { font } from '@/src/constants/fonts';
import { useToolbarActions } from '@/src/hooks/useToolbarActions';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

type GridAsset = { id: string; uri: string };
type Props = {
  title: string;
  dataSource: {
    assets: GridAsset[];
    refreshing: boolean;
    fetchFirst: () => void | Promise<void>;
    fetchMore: () => void | Promise<void>;
    loadingMore: boolean;
    hasNextPage: boolean;
  };
  viewerParams: (index: number) => Record<string, string>;
};

export default function PhotoGridScreen({ title, dataSource, viewerParams }: Props) {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const numColumns = 3;
  const gap = 2;
  const itemSize = useMemo(
    () => Math.floor((width - (numColumns - 1) * gap) / numColumns),
    [width]
  );

  const { assets, refreshing, fetchFirst, fetchMore, loadingMore, hasNextPage } = dataSource;

  // 헤더 페이드
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

  // 선택 모드
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const enterSelection = useCallback((id: string) => {
    setSelectionMode(true);
    setSelected(new Set([id]));
  }, []);
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      next.has(id) ? next.delete(id) : next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectionMode(false);
  }, []);

  const { deleteSelected, shareSelected, openMovePicker, MovePicker } = useToolbarActions({
    selected,
    clearSelection,
    onCompleted: (a) => {
      if (a === 'delete' || a === 'move') fetchFirst();
    },
  });

  const firstReachedRef = useRef(false);

  const countLabel = useMemo(() => {
    const total = (dataSource as any).totalCount as number | undefined;
    if (typeof total === 'number') return `${total}장`;
    // 전체 개수를 모르니, 로드된 개수 + 더 있음 여부
    return `${assets.length}${hasNextPage ? '+' : ''}장`;
  }, [assets.length, hasNextPage /*, (dataSource as any).totalCount*/]);

  return (
    <>
      <FlatList
        data={assets}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ gap }}
        className="flex-1 bg-white"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchFirst} />}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!firstReachedRef.current) {
            firstReachedRef.current = true;
            return;
          }
          if (!loadingMore && hasNextPage) fetchMore();
        }}
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
                router.push({ pathname: '/[path]', params: viewerParams(index) }); // 공통 뷰어
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
                    {isSelected ? <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text> : null}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          !refreshing ? (
            <View style={{ paddingTop: 120, alignItems: 'center' }}>
              <Text>표시할 사진이 없습니다.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={loadingMore ? <Text className="text-center">불러오는 중…</Text> : null}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />

      {/* 헤더 오버레이 */}
      <Animated.View
        pointerEvents="box-none"
        style={{
          opacity: headerOpacity,
          transform: [
            { translateY: headerOpacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
          ],
        }}
        className="absolute left-0 right-0 top-0 z-10 h-56">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(0,0,0,0.9)', 'transparent']}
          className="absolute inset-0"
        />
        <View
          pointerEvents="box-none"
          className="absolute inset-0 flex flex-row items-start px-4 pt-7">
          <View
            className="flex w-full flex-row items-center justify-between"
            pointerEvents="box-none">
            {/* 왼쪽: 제목 + 개수 */}
            <View>
              <Text style={font.bold} className="text-2xl text-white">
                {title}
              </Text>
              <Text className="mt-1 text-white/80">{countLabel}</Text>
            </View>

            {/* 오른쪽: 항상 보이는 버튼 */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={selectionMode ? clearSelection : () => setSelectionMode(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="flex items-center justify-center rounded-full bg-white px-3.5 py-2">
              <Text style={font.bold}>
                {selectionMode
                  ? selected.size > 0
                    ? `${selected.size}개 선택 취소`
                    : '선택 종료'
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
