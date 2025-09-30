import { Colors } from '@/src/constants/Colors';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomNavigation } from 'react-native-paper';

type Props = { hidden?: boolean };

function BottomTabBar({ hidden }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const routes = [
    {
      key: 'photos',
      title: 'Photos',
      focusedIcon: 'image',
      unfocusedIcon: 'image-outline',
      path: '/' as const,
    },
    {
      key: 'albums',
      title: 'Albums',
      focusedIcon: 'folder',
      unfocusedIcon: 'folder-outline',
      path: '/albums' as const,
    },
    { key: 'menu', title: 'Menu', focusedIcon: 'menu', path: '/menu' as const },
  ];

  const handleIndexChange = (i: number) => {
    setIndex(i);
    const path = routes[i]?.path;
    if (path) router.replace(path);
  };

  const handleTabPress = ({ route }: { route: (typeof routes)[number] }) => {
    const isReselect = routes[index]?.key === route.key;
    if (isReselect) {
      const target = routes.find((r) => r.key === route.key);
      if (target?.path) router.replace(target.path);
    }
  };

  return (
    <View style={{ height: hidden ? 0 : 72, overflow: 'hidden' }}>
      <BottomNavigation
        navigationState={{ index, routes }}
        onIndexChange={handleIndexChange}
        onTabPress={handleTabPress}
        renderScene={() => null}
        barStyle={{ backgroundColor: Colors.primary.white }}
        activeColor={Colors.primary.black}
        inactiveColor={Colors.primary.grayDark}
        sceneAnimationEnabled={false}
        theme={{
          version: 3,
          colors: {
            secondaryContainer: Colors.primary.blueLight,
          },
        }}
      />
    </View>
  );
}

export default BottomTabBar;
