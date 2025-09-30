import DetailHeader from '@/src/components/Header/DetailHeader';
import { MAX_TRAIN_COUNT, MIN_TRAIN_COUNT } from '@/src/constants/training';
import { useTrainImages } from '@/src/hooks/useTrainImages';
import { Picked } from '@/src/utils/customAlbum';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Pressable, Text, useWindowDimensions, View } from 'react-native';

const COLS = 3;
const GAP = 12;
const EDGE = 16;
const ASPECT = 3 / 4;

export default function TrainImagePage() {
  const router = useRouter();
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const albumId = useMemo(() => (typeof id === 'string' ? id : ''), [id]);
  const isDraft = draft === '1' || draft === 'true';

  const { width: screenW } = useWindowDimensions();
  const outerPad = EDGE - GAP / 2;
  const tileW = (screenW - outerPad * 3 - GAP * (COLS - 1)) / COLS;

  const { selected, data, openPicker, confirmRemove } = useTrainImages({
    albumId,
    isDraft,
    min: MIN_TRAIN_COUNT,
    max: MAX_TRAIN_COUNT,
  });

  const renderItem = ({ item }: { item: Picked; index: number }) => {
    const isAdd = item.id === '__add__';
    const atMax = selected.length >= MAX_TRAIN_COUNT;

    return (
      <View style={{ marginBottom: GAP }}>
        {isAdd ? (
          <Pressable
            onPress={atMax ? undefined : openPicker}
            style={{
              width: tileW,
              aspectRatio: ASPECT,
              marginHorizontal: GAP / 2,
              opacity: atMax ? 0.5 : 1,
            }}
            className="items-center justify-center rounded-2xl bg-[#F1F3F6]"
            android_ripple={atMax ? undefined : { color: '#E5E7EB', borderless: false }}
            onLongPress={() => {
              if (atMax) Alert.alert('최대 개수', `이미 ${MAX_TRAIN_COUNT}장을 선택했습니다.`);
            }}>
            <Ionicons name="add-circle-outline" size={28} color="#8A8F98" />
            <Text className="mt-1 text-xs text-[#8A8F98]">
              {atMax ? `최대 ${MAX_TRAIN_COUNT}장` : '추가'}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onLongPress={() => confirmRemove(item)}
            style={{ width: tileW, aspectRatio: ASPECT, marginHorizontal: GAP / 2 }}
            className="overflow-hidden rounded-2xl bg-[#F3F5F7]">
            <Image
              source={{ uri: item.uri }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <DetailHeader onPressBack={() => router.back()}>학습 이미지</DetailHeader>

      <View className="px-4 pb-2 pt-4">
        <Text className="text-gray-500 mt-3 text-lg">
          선택된 학습 이미지 ({selected.length}/{MAX_TRAIN_COUNT})
        </Text>
      </View>

      <FlatList
        contentContainerStyle={{ paddingHorizontal: outerPad, paddingBottom: 24 }}
        data={data}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={COLS}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
