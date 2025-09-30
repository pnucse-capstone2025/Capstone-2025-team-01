import DetailHeader from '@/src/components/Header/DetailHeader';
import { Colors } from '@/src/constants/Colors';
import Slider from '@react-native-community/slider';
import { useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, Text, View } from 'react-native';

const IMAGE_SETS = [
  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%89%E1%85%A1%E1%86%AF%E1%84%8D%E1%85%A1%E1%86%A8+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B71.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%89%E1%85%A1%E1%86%AF%E1%84%8D%E1%85%A1%E1%86%A8+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B72.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%89%E1%85%A1%E1%86%AF%E1%84%8D%E1%85%A1%E1%86%A8+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B73.jpg',
  ],

  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%8C%E1%85%A9%E1%86%B7+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B71.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%8C%E1%85%A9%E1%86%B7+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B72.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%8C%E1%85%A9%E1%86%B7+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B73.jpg',
  ],
  [
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%80%E1%85%A5%E1%86%B8%E1%84%82%E1%85%A1+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B71.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%80%E1%85%A5%E1%86%B8%E1%84%82%E1%85%A1%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B72.jpg',
    'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%80%E1%85%A5%E1%86%B8%E1%84%82%E1%85%A1%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B73.jpg',
  ],
];

const LABELS = ['1단계', '2단계', '3단계'];

export default function blurAlbumSettingPage() {
  const [similarity, setSimilarity] = useState(1);
  const [pendingSimilarity, setPendingSimilarity] = useState(1); // 슬라이더 실시간 조작값
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleSimilarityChange = (value: number) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start(() => {
      setSimilarity(value);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    });
  };

  return (
    <View className="flex-1 bg-white">
      <DetailHeader onPressBack={() => console.log('Back pressed')}>{'흐릿한 사진'}</DetailHeader>

      <ScrollView className="space-y-8 px-6 pb-10 pt-6">
        {/* 설명 */}
        <View>
          <Text className="text-base" style={{ fontFamily: 'System' }}>
            흐릿한 사진
          </Text>
          <Text className="mb-3 mt-1 text-sm font-light" style={{ fontFamily: 'System' }}>
            흐릿한 사진들을 정리해 공간을 확보하세요.
          </Text>
        </View>

        {/* 이미지 페이드 전환 */}
        <Animated.View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            opacity: fadeAnim,
            ...(Platform.OS === 'android' && { renderToHardwareTextureAndroid: true }),
            ...(Platform.OS === 'ios' && { shouldRasterizeIOS: true }),
          }}>
          {IMAGE_SETS[similarity].map((url, idx) => (
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
            흐릿한 정도를 드래그로 설정할 수 있어요
          </Text>

          <Slider
            minimumValue={0}
            maximumValue={2}
            step={1}
            value={pendingSimilarity}
            onValueChange={setPendingSimilarity}
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
