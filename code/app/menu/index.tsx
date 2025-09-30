import SettingRow from '@/src/components/SettingRow/SettingRow';
import PhotoTrendCard from '@/src/components/Stats/PhotoTrendCard';
import StorageUsageCard from '@/src/components/Stats/StorageUsageCard';
import { Colors } from '@/src/constants/Colors';
import { font } from '@/src/constants/fonts';
import { useAlbumStats } from '@/src/hooks/useAlbumStats';
import { useStorageStats } from '@/src/hooks/useStorageStats';
import { useRouter } from 'expo-router';

import { ScrollView, Text, View } from 'react-native';

export default function AlbumPage() {
  const router = useRouter();

  const { totalBytes, freeBytes } = useStorageStats();

  const totalGB = totalBytes / 1024 ** 3;
  const usedGB = (totalBytes - freeBytes) / 1024 ** 3;

  const { grouped, delta, loading: albumsLoading } = useAlbumStats();

  return (
    <ScrollView className="bg-white" showsVerticalScrollIndicator={false}>
      <View className="flex flex-col gap-5 p-7">
        <Text style={font.bold} className="text-2xl">
          메뉴
        </Text>
        <StorageUsageCard usedGB={Number(usedGB.toFixed(2))} totalGB={Number(totalGB.toFixed(2))} />

        <PhotoTrendCard
          loading={albumsLoading}
          segments={[
            {
              label: '자동 정리',
              value: grouped.auto,
              color: Colors.primary.blueDark,
              delta: delta.auto,
            },
            {
              label: '사용자 정의',
              value: grouped.custom,
              color: Colors.primary.blueMid,
              delta: delta.custom,
            },
            {
              label: '미분류',
              value: grouped.uncategorized,
              color: Colors.primary.gray,
              delta: delta.uncategorized,
            },
          ]}
        />
        <View className="flex flex-col">
          <SettingRow
            title="정리 앨범 관리"
            description="필요에 따라 기능을 껐다 켤 수 있어요."
            onPress={() => {
              router.push('/menu/cleanupAlbum');
            }}
          />
          <SettingRow
            title="사용자 정의 앨범 관리"
            description="원하는 패턴을 추출해 앨범을 만들 수 있어요."
            onPress={() => {
              router.push('/menu/customAlbum');
            }}
          />
          <SettingRow
            title="제외시킬 앨범 관리"
            description="로컬 앨범에서 정리를 제외시킬 앨범을 선택할 수 있어요."
            onPress={() => {
              router.push('/menu/excludedAlbum');
            }}
          />
        </View>
      </View>
    </ScrollView>
  );
}
