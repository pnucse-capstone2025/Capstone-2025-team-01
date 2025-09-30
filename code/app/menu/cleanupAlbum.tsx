import ListAlbum from '@/src/components/Album/ListAlbum';
import DetailHeader from '@/src/components/Header/DetailHeader';
import { ALBUM_FEATURES } from '@/src/constants/albumFeatures';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

export default function CleanupAlbumPage() {
  const navigation = useNavigation();
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('album-toggles');
        if (raw) setToggles(JSON.parse(raw));
      } catch (e) {
        console.warn('failed to load toggles', e);
      }
    })();
  }, []);

  const handleToggle = async (id: string) => {
    const current = toggles[id] ?? true;
    const updated = { ...toggles, [id]: !current };
    setToggles(updated);
    try {
      await AsyncStorage.setItem('album-toggles', JSON.stringify(updated));
    } catch (e) {
      console.warn('failed to save toggles', e);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <DetailHeader
        onPressBack={() => {
          navigation.goBack();
        }}>
        정리 기능 관리
      </DetailHeader>
      <ScrollView className="space-y-6 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {ALBUM_FEATURES.map((feature, index) => (
          <View key={feature.id} className={index < ALBUM_FEATURES.length - 1 ? 'mb-6' : ''}>
            <ListAlbum
              title={feature.title}
              description={feature.description}
              imageUrl={feature.imageUrl}
              hasToggle
              onPress={() => handleToggle(feature.id)}
              isEnabled={toggles[feature.id] ?? true}
              manageable={feature.manageable}
              settingsPath={feature.settingsPath}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
