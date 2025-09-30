import { TouchableOpacity, View } from 'react-native';

function DragHandle() {
  return (
    <TouchableOpacity className="flex flex-col items-center justify-center gap-0.5">
      {[...Array(3)].map((_, index) => (
        <View key={index} className="flex flex-row gap-0.5">
          <View className="h-1 w-1 rounded-full bg-gray" />
          <View className="h-1 w-1 rounded-full bg-gray" />
        </View>
      ))}
    </TouchableOpacity>
  );
}

export default DragHandle;
