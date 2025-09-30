import GridAlbum from '@/src/components/Album/GridAlbum';
import MiniAlbum from '@/src/components/Album/MiniAlbum';
import RowAlbum from '@/src/components/Album/RowAlbum';
import SectionHeader from '@/src/components/Header/SectionHeader';
import { ALBUM_FEATURES } from '@/src/constants/albumFeatures';
import { Colors } from '@/src/constants/Colors';
import { font } from '@/src/constants/fonts';
import { useCustomAlbums } from '@/src/hooks/useCustomAlbums';
import { useLocalAlbums } from '@/src/hooks/useLocalAlbums';
import { useManagedAlbumCounts } from '@/src/hooks/useManagedAlbumCounts';
import type { UIAlbum, UICustomAlbum } from '@/src/types/domain/album';
import { padToGrid } from '@/src/utils/layout';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';

const LOCAL_LIMIT = 5;

export default function AlbumPage() {
  const router = useRouter();

  const { counts, refresh: refreshManaged } = useManagedAlbumCounts(ALBUM_FEATURES);
  const {
    albums: local,
    loading: localLoading,
    refresh: refreshLocal,
    silentRefresh: refreshLocalSilently,
  } = useLocalAlbums({
    managedTitlesFromFeatures: ALBUM_FEATURES.map((f) => f.title),
  });
  const localVisible = useMemo<UIAlbum[]>(() => local.slice(0, LOCAL_LIMIT), [local]);

  const { albums: customAlbums, refresh: refreshCustom } = useCustomAlbums();

  const handleCreateAndOpen = useCallback(async () => {
    router.push('/menu/customAlbum');
  }, [router]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshLocal(), refreshManaged(), refreshCustom()]);
  }, [refreshLocal, refreshManaged, refreshCustom]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refreshCustom();
        await refreshLocalSilently();
        await refreshManaged();
      })();
    }, [refreshCustom, refreshLocalSilently])
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList<UIAlbum>
        data={localVisible}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={localLoading} onRefresh={onRefresh} />}
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === localVisible.length - 1;
          return (
            <View
              style={{
                backgroundColor: Colors.primary.blueLight,
                borderTopLeftRadius: isFirst ? 16 : 0,
                borderTopRightRadius: isFirst ? 16 : 0,
                borderBottomLeftRadius: isLast ? 16 : 0,
                borderBottomRightRadius: isLast ? 16 : 0,
                overflow: 'hidden',
              }}>
              <RowAlbum
                title={item.title}
                quantity={item.quantity}
                onPress={() =>
                  router.push({
                    pathname: '/albums/local/[id]',
                    params: { id: item.id, title: item.title },
                  })
                }
              />
              {!isLast && (
                <View style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.1)', marginLeft: 36 }} />
              )}
            </View>
          );
        }}
        contentContainerStyle={{ padding: 28, paddingBottom: 28, gap: 0 }}
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <Text style={font.bold} className="text-2xl">
              모든 앨범
            </Text>

            {/* 사용자 정의 앨범 */}
            <View style={{ gap: 8 }}>
              <SectionHeader onPress={() => router.push('/menu/customAlbum')}>
                사용자 정의 앨범
              </SectionHeader>
              <View className="flex flex-row gap-5">
                {(() => {
                  const visible = customAlbums.slice(0, 2); // 최대 2개만
                  const placeholdersNeeded = 2 - visible.length;
                  return (
                    <>
                      {visible.map((album: UICustomAlbum) => (
                        <GridAlbum
                          key={`custom-${album.id}`}
                          imageUrl={album.imageUrl ?? ''}
                          title={album.title}
                          quantity={album.quantity}
                          onPress={() => {
                            if (album.libraryAlbumId) {
                              router.push({
                                pathname: '/albums/local/[id]',
                                params: { id: album.libraryAlbumId, title: album.title },
                              });
                            } else {
                              router.push(`/albums/custom/${album.id}`);
                            }
                          }}
                        />
                      ))}
                      {Array.from({ length: placeholdersNeeded }).map((_, i) => (
                        <GridAlbum
                          key={`placeholder-${i}`}
                          imageUrl=""
                          title="앨범 추가"
                          quantity={-1}
                          onPress={handleCreateAndOpen}
                        />
                      ))}
                    </>
                  );
                })()}
              </View>
            </View>

            {/* 정리 앨범 */}
            <View style={{ gap: 8 }}>
              <SectionHeader>정리 앨범</SectionHeader>
              <View style={{ gap: 16 }}>
                {padToGrid(ALBUM_FEATURES, 3).reduce((rows, _, rowIndex) => {
                  if (rowIndex % 3 !== 0) return rows;
                  const row = ALBUM_FEATURES.slice(rowIndex, rowIndex + 3);
                  rows.push(
                    <View key={`feat-row-${rowIndex}`} style={{ flexDirection: 'row', gap: 16 }}>
                      {row.map((item) => (
                        <View key={`feat-${item.id}`} style={{ flex: 1 }}>
                          <MiniAlbum
                            imageUrl={item.imageUrl}
                            title={item.title}
                            quantity={counts[item.id] ?? 0}
                            onPress={() => router.push(`/albums/smart/${item.path}`)}
                          />
                        </View>
                      ))}
                    </View>
                  );
                  return rows;
                }, [] as React.ReactNode[])}
              </View>
            </View>

            <SectionHeader onPress={() => router.push('/albums/local')}>로컬 앨범</SectionHeader>
          </View>
        }
        ListFooterComponent={<View style={{ height: 12 }} />}
      />
    </View>
  );
}
