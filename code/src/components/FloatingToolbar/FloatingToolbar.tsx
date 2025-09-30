import { Colors } from '@/src/constants/Colors';
import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { IconButton, Portal, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible?: boolean;
  style?: ViewStyle;
  onDelete?: () => void;
  onShare?: () => void;
  onDetails?: () => void;
  disabled?: boolean;
  tabBarHeight?: number;
  gapAboveTab?: number;
};

export function FloatingToolbar({
  visible = true,
  style,
  onDelete,
  onShare,
  onDetails,
  disabled = false,
  tabBarHeight = 64,
  gapAboveTab = 12,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const bottom = Math.max(insets.bottom, 0) + tabBarHeight + gapAboveTab;

  return (
    <Portal>
      <Surface
        mode="elevated"
        style={[
          styles.container,
          {
            bottom,
            backgroundColor: Colors.primary.blueLight,
          },
          styles.shadow,
          style,
        ]}>
        <IconButton
          icon="trash-can-outline"
          size={22}
          disabled={disabled}
          onPress={onDelete}
          accessibilityLabel="삭제"
        />
        <IconButton
          icon="share-variant"
          size={22}
          disabled={disabled}
          onPress={onShare}
          accessibilityLabel="공유"
        />
        <IconButton
          icon="folder-move-outline"
          size={22}
          disabled={disabled}
          onPress={onDetails}
          accessibilityLabel="이동"
        />
      </Surface>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  shadow: {
    marginHorizontal: 2,
  },
});
