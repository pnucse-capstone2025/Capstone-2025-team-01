import { SectionHeaderType } from '@/src/types/components/SectionHeaderType';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

function SectionHeader({ children, onPress }: SectionHeaderType) {
  return (
    <View className="flex flex-row items-center justify-between">
      <Text className="text-xl">{children}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress}>
          <MaterialIcons name="chevron-right" size={32} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default SectionHeader;
