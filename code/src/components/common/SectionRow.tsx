import { font } from '@/src/constants/fonts';
import SectionRowType from '@/src/types/components/SectionRowType';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

function SectionRow({ title, subtitle, onPress }: SectionRowType) {
  return (
    <Pressable onPress={onPress} className="mt-7">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-text-primary text-lg" style={font.bold}>
            {title}
          </Text>
          {!!subtitle && <Text className="text-text-secondary mt-1 text-sm">{subtitle}</Text>}
        </View>
        <Ionicons name="chevron-forward" size={20} color="black" />
      </View>
    </Pressable>
  );
}

export default SectionRow;
