import { font } from '@/src/constants/fonts';
import { VerticalPhotoType } from '@/src/types/components/VerticalPhotoType';
import { Image, Text, View } from 'react-native';

function VerticalPhoto({ imageUrl, dateLabel }: VerticalPhotoType) {
  return (
    <View className="relative aspect-[2.2/3] w-[110px]">
      <Image source={{ uri: imageUrl }} className="h-full w-full rounded-xl" resizeMode="cover" />
      {dateLabel && (
        <View className="absolute bottom-0 left-0 h-[30px] w-full items-center justify-center rounded-b-xl bg-black/40">
          <Text className="text-xs text-white" style={font.light}>
            {dateLabel}
          </Text>
        </View>
      )}
    </View>
  );
}

export default VerticalPhoto;
