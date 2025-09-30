// components/SettingRow/SettingRow.tsx
import { font } from '@/src/constants/fonts';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

type SettingRowProps = {
  title: string;
  description?: string;
  onPress?: () => void;
  disabled?: boolean;
  hasDivider?: boolean;
};

function SettingRow({
  title,
  description,
  onPress,
  disabled = false,
  hasDivider = false,
}: SettingRowProps) {
  return (
    <View className="w-full">
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="flex flex-row items-center px-4 py-3">
        {/* 텍스트 영역 */}
        <View className="flex-1 pr-3">
          <Text className="text-base font-semibold text-black">{title}</Text>
          {!!description && (
            <Text style={font.light} className="mt-1 text-xs text-[#6B7280]">
              {description}
            </Text>
          )}
        </View>

        <View className="items-center justify-center">
          <MaterialIcons name="chevron-right" size={22} color="#222" />
        </View>
      </TouchableOpacity>

      {hasDivider && <View className="ml-4 h-[1px] bg-[#E5E7EB]" />}
    </View>
  );
}

export default SettingRow;
