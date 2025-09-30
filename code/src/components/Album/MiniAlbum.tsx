import { font } from '@/src/constants/fonts';
import { MiniAlbumType } from '@/src/types/components/MiniAlbumType';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Text, TouchableOpacity, View } from 'react-native';

function MiniAlbum({ imageUrl, title, quantity, onPress }: MiniAlbumType) {
  return (
    <TouchableOpacity onPress={onPress}>
      <View className="relative aspect-square w-full overflow-hidden rounded-2xl">
        {/* 배경 이미지 */}
        <Image source={{ uri: imageUrl }} className="h-full w-full" resizeMode="cover" />

        {/* 하단 그라데이션 */}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)']}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }}
        />

        {/* 텍스트 */}
        <View className="absolute bottom-2 left-2 right-2">
          <Text style={font.bold} className="text-sm text-white">
            {title}
          </Text>
          <Text style={font.light} className="text-sm text-white">
            ({quantity})
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default MiniAlbum;
