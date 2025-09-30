import { Colors } from '@/src/constants/Colors';
import { DetailHeaderType } from '@/src/types/components/DetailHeaderType';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

function DetailHeader({ children, onPressBack, actions }: DetailHeaderType) {
  return (
    <View className="flex h-14 flex-row items-center justify-between pl-4 pr-6">
      <View className="flex-row items-center gap-3.5">
        <TouchableOpacity onPress={onPressBack}>
          <MaterialIcons name="navigate-before" size={24} color={Colors.primary.black} />
        </TouchableOpacity>
        <Text className="text-lg text-black">{children}</Text>
      </View>
      <View className="flex flex-row gap-2.5">
        {actions?.map((action) => (
          <TouchableOpacity key={action.label} onPress={action.onPress}>
            <Text
              className={`text-sm ${!action.color ? 'text-black' : ''}`}
              style={action.color ? { color: action.color } : undefined}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default DetailHeader;
