import { font } from '@/src/constants/fonts';
import { ListAlbumType } from '@/src/types/components/ListAlbumType';
import { Image, Text, View, Pressable } from 'react-native';
import SwitchM3 from '../common/SwitchM3';
import { router } from 'expo-router';
import { Colors } from '@/src/constants/Colors';

function ListAlbum({
  title,
  description,
  imageUrl,
  hasToggle = false,
  onPress,
  isEnabled,
  manageable,
  settingsPath,
}: ListAlbumType & {
  onDrag?: () => void;
  isEnabled?: boolean;
  manageable?: boolean;
  settingsPath?: string;
}) {
  return (
    <View className="flex w-full flex-row items-center gap-1.5">
      <View className="flex flex-1 flex-row gap-2.5">
        <Image source={{ uri: imageUrl }} className="aspect-[1/1] w-[110px] rounded-xl" />
        <View className="flex flex-1 flex-col">
          {/* 상단: 제목 + 토글 */}
          <View className="flex flex-row items-center justify-between">
            <Text className="text-sm font-bold text-black">{title}</Text>

            {hasToggle && <SwitchM3 value={!!isEnabled} onToggle={() => onPress?.()} />}
          </View>

          {/* 설명 */}
          <Text style={font.light} className="mt-0.5 text-xs">
            {description}
          </Text>

          {/* 관리 버튼: manageable일 때만 노출, chevron 사용 안 함 */}
          {manageable && (
            <View className="mt-2">
              <Pressable
                onPress={() => router.push(settingsPath as never)}
                style={{ backgroundColor: Colors.primary.blueDark }}
                className="self-start rounded-xl px-4 py-2">
                <Text className="text-sm text-white">설정</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default ListAlbum;
