import DetailHeader from '@/src/components/Header/DetailHeader';
import { Colors } from '@/src/constants/Colors';
import {
  getSimilarityThreshold,
  setSimilarityThreshold,
  THRESHOLD_OPTIONS,
  thresholdToIndex,
} from '@/src/utils/similarity';
import Slider from '@react-native-community/slider';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, Text, View } from 'react-native';

const IMAGE_SETS = [
  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%8D%E1%85%A1%E1%86%BC%E1%84%80%E1%85%AE%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%8D%E1%85%A1%E1%86%BC%E1%84%80%E1%85%AE%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A9%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7.jpg',
  ],
  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92-2.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%86%E1%85%B5%E1%84%82%E1%85%B5%E1%84%86%E1%85%B5%E1%84%8D%E1%85%A1%E1%86%BC%E1%84%80%E1%85%AE.jpg',
  ],
  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%82%E1%85%A3%E1%86%B7%E1%84%82%E1%85%A3%E1%86%B7%E1%84%83%E1%85%A1%E1%84%85%E1%85%B3%E1%86%AB%E1%84%80%E1%85%A1%E1%86%A8%E1%84%83%E1%85%A92.jpg',
  ],
];

const LABELS = ['유사', '매우 유사', '일치'];

export default function SimilarAlbumSettingPage() {
  const [similarity, setSimilarity] = useState<0 | 1 | 2>(1);
  const [pendingSimilarity, setPendingSimilarity] = useState<0 | 1 | 2>(1); // 슬라이더 실시간 조작값
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const th = await getSimilarityThreshold(); // 없으면 내부에서 0.8 반환
      const idx = thresholdToIndex(th); // 0/1/2로 매핑 (없으면 1)
      setSimilarity(idx);
      setPendingSimilarity(idx);
    })();
  }, []);

  const handleSimilarityChange = (value: number) => {
    // 안전 클램프 & 정수화
    const newIdx = Math.max(0, Math.min(2, Math.round(value))) as 0 | 1 | 2;
    const newThreshold = THRESHOLD_OPTIONS[newIdx]; // 0.7 / 0.8 / 0.9

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(async () => {
      await setSimilarityThreshold(newThreshold); // AsyncStorage 저장
      setSimilarity(newIdx);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });
  };

  // 인덱스 가드 (혹시 모를 범위 이탈 대비)
  const currentSet = IMAGE_SETS[similarity] ?? IMAGE_SETS[1];

  return (
    <View className="flex-1 bg-white">
      <DetailHeader onPressBack={() => router.back()}>{'중복된 사진'}</DetailHeader>

      <ScrollView className="space-y-8 px-6 pb-10 pt-6">
        {/* 설명 */}
        <View>
          <Text className="text-base" style={{ fontFamily: 'System' }}>
            중복된 사진
          </Text>
          <Text className="mb-3 mt-1 text-sm font-light" style={{ fontFamily: 'System' }}>
            중복된 사진들을 정리할 수 있어요.
          </Text>
        </View>

        {/* 이미지 페이드 전환 */}
        <Animated.View
          // ⚠️ 플랫폼 전용 props는 style 바깥(View props)으로
          {...(Platform.OS === 'android' ? { renderToHardwareTextureAndroid: true } : {})}
          {...(Platform.OS === 'ios' ? { shouldRasterizeIOS: true } : {})}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            opacity: fadeAnim,
          }}>
          {currentSet.map((url, idx) => (
            <Image
              key={idx}
              source={{ uri: url }}
              style={{
                width: 100,
                height: 130,
                borderRadius: 12,
                marginRight: idx < 2 ? 12 : 0,
              }}
              resizeMode="cover"
            />
          ))}
        </Animated.View>

        {/* 슬라이더 */}
        <View>
          <Text className="mb-2 mt-3 text-sm font-light" style={{ fontFamily: 'System' }}>
            중복의 기준을 설정할 수 있어요
          </Text>

          <Slider
            minimumValue={0}
            maximumValue={2}
            step={1}
            value={pendingSimilarity}
            onValueChange={(v) =>
              setPendingSimilarity(Math.max(0, Math.min(2, Math.round(v))) as 0 | 1 | 2)
            }
            onSlidingComplete={handleSimilarityChange}
            minimumTrackTintColor={Colors.primary.gray}
            maximumTrackTintColor={Colors.primary.gray}
            thumbTintColor={Colors.primary.blueDark}
          />

          {/* 라벨 */}
          <View className="mt-2 flex-row justify-between px-1">
            {LABELS.map((label, idx) => (
              <Text
                key={idx}
                className="text-xs"
                style={{
                  fontFamily: 'System',
                  color: similarity === idx ? Colors.primary.blueDark : Colors.primary.gray,
                  fontWeight: similarity === idx ? '600' : '400',
                }}>
                {label}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
