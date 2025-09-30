import { font } from '@/src/constants/fonts';
import { RowAlbumType } from '@/src/types/components/RowAlbumType';
import { Feather } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function RowAlbum({ title, quantity, onPress }: RowAlbumType) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-row items-center gap-3">
        <Feather name="folder" size={20} />
        <Text className="text-base text-black">
          {title}
          <Text style={font.light} className="text-xs text-black">
            ({quantity})
          </Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}
