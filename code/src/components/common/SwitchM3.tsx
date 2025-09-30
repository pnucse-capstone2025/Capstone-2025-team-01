import { Colors } from '@/src/constants/Colors';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

type SwitchM3Props = {
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
};

export default function SwitchM3({ value, onToggle, disabled = false }: SwitchM3Props) {
  const animation = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: value ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const thumbTranslate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22],
  });

  const thumbSize = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 20],
  });

  const trackColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primary.gray, Colors.primary.blueDark],
  });

  const trackBorder = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const checkOpacity = animation;

  const thumbColor = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primary.grayDark, Colors.primary.white],
  });

  return (
    <Pressable
      onPress={() => !disabled && onToggle(!value)}
      disabled={disabled}
      style={styles.wrapper}>
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackColor,
            borderWidth: trackBorder,
            borderColor: Colors.primary.grayDark,
          },
        ]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX: thumbTranslate }],
              width: thumbSize,
              height: thumbSize,
              backgroundColor: thumbColor,
            },
            styles.shadow,
          ]}>
          <Animated.View style={{ opacity: checkOpacity }}>
            <MaterialIcons
              name="check"
              size={14}
              color={disabled ? Colors.primary.gray : Colors.primary.blueDark}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 48,
    height: 28,
    justifyContent: 'center',
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 999,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  thumb: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: {
    shadowColor: Colors.primary.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
});
