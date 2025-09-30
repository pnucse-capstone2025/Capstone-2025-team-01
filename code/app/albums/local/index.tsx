import RowAlbum from '@/src/components/Album/RowAlbum';
import { MANAGED_ALBUM_TITLES } from '@/src/constants/albums';
import { Colors } from '@/src/constants/Colors';
import { font } from '@/src/constants/fonts';
import { STORAGE_KEYS } from '@/src/constants/storage';
import { useLocalAlbums } from '@/src/hooks/useLocalAlbums';
import { UIAlbum } from '@/src/types/domain/album';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, Text, View } from 'react-native';

export default function LocalAlbumsPage() {
  const router = useRouter();

  const { albums, loading, refresh } = useLocalAlbums({
    managedTitles: MANAGED_ALBUM_TITLES,
    excludedIdsStorageKey: STORAGE_KEYS.MANAGED_ALBUM_IDS,
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList<UIAlbum>
        data={albums}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 28, paddingTop: 28, paddingBottom: 12 }}>
            <Text style={font.bold} className="text-2xl">
              로컬 앨범
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isFirst = index === 0;
          const isLast = index === albums.length - 1;
          return (
            <View
              style={{
                marginHorizontal: 28,
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
        ListFooterComponent={<View style={{ height: 20 }} />}
      />
    </View>
  );
}
