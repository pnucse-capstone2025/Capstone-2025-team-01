import { font } from '@/src/constants/fonts';
import { GridAlbumType } from '@/src/types/components/GridAlbumType';
import { Ionicons } from '@expo/vector-icons';
import { Image, Text, TouchableOpacity, View } from 'react-native';

function GridAlbum({ imageUrl, title, quantity, onPress }: GridAlbumType) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex flex-1 flex-col gap-1.5"
      activeOpacity={0.8}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          className="bg-gray-200 aspect-[1/1] rounded-xl"
          resizeMode="cover"
        />
      ) : (
        <View className="border-gray-300 aspect-[1/1] items-center justify-center rounded-2xl border-2 border-dashed">
          <Ionicons name="add" size={32} color="#9CA3AF" />
        </View>
      )}
      <View className="flex flex-col">
        <Text style={font.bold} className="text-base text-black">
          {title}
        </Text>
        {quantity >= 0 ? (
          <Text style={font.light} className="text-sm text-black">
            ({quantity})
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default GridAlbum;
