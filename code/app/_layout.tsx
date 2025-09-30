import BottomTabBar from '@/src/components/BottomNavBar/BottomNavBar';
import { useFonts } from 'expo-font';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { setCustomText } from 'react-native-global-props';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';

export default function RootLayout() {
  const [loaded] = useFonts({
    KoPubBatangBold: require('@/src/assets/fonts/KoPub-Batang-Bold.ttf'),
    KoPubBatangLight: require('@/src/assets/fonts/KoPub-Batang-Light.ttf'),
    KoPubBatangMedium: require('@/src/assets/fonts/KoPub-Batang-Medium.ttf'),
    KoPubDotumBold: require('@/src/assets/fonts/KoPub-Dotum-Bold.ttf'),
    KoPubDotumLight: require('@/src/assets/fonts/KoPub-Dotum-Light.ttf'),
    KoPubDotumMedium: require('@/src/assets/fonts/KoPub-Dotum-Medium.ttf'),
  });

  const segments = useSegments() as string[];
  const i = segments.lastIndexOf('(viewer)');
  const hideTabBar = i !== -1 && segments.length === i + 2;

  useEffect(() => {
    if (loaded) {
      setCustomText({
        allowFontScaling: false,
        style: {
          fontFamily: 'KoPubDotumMedium',
        },
      });
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PaperProvider theme={MD3LightTheme}>
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-1">
              <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="+not-found" />
              </Stack>
            </View>
            <StatusBar style="auto" />
            <BottomTabBar hidden={hideTabBar} />
          </SafeAreaView>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
