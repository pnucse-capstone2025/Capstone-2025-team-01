import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

type Props = {
  uri: string;
  width: number; // 화면 너비
  height: number; // 화면 높이
  onZoomActiveChange?: (active: boolean) => void;
  minScale?: number; // 기본 1
  maxScale?: number; // 기본 4
  doubleTapScale?: number; // 기본 2
};

/** ===== worklet-safe helpers ===== */
const clamp = (v: number, lo: number, hi: number) => {
  'worklet';
  return Math.min(Math.max(v, lo), hi);
};
const getBoundX = (s: number, halfW: number) => {
  'worklet';
  return Math.max(0, (s - 1) * halfW);
};
const getBoundY = (s: number, halfH: number) => {
  'worklet';
  return Math.max(0, (s - 1) * halfH);
};

export function ZoomableImage({
  uri,
  width,
  height,
  onZoomActiveChange,
  minScale = 1,
  maxScale = 4,
  doubleTapScale = 2,
}: Props) {
  // ===== Shared Values =====
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // 제스처 컨텍스트
  const startScale = useSharedValue(1);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // 이동 한계 계산용
  const halfW = width / 2;
  const halfH = height / 2;

  const setZoomActiveJS = (active: boolean) => onZoomActiveChange?.(active);

  /** ===== Pinch ===== */
  const pinch = Gesture.Pinch()
    .onBegin(() => {
      'worklet';
      startScale.value = scale.value;
      runOnJS(setZoomActiveJS)(true);
    })
    .onUpdate((e) => {
      'worklet';
      const next = clamp(startScale.value * e.scale, minScale, maxScale);

      // focal 기준 원점 보정
      const fx = e.focalX - halfW;
      const fy = e.focalY - halfH;
      const scaleFactor = next / scale.value;

      translateX.value = (translateX.value - fx) * scaleFactor + fx;
      translateY.value = (translateY.value - fy) * scaleFactor + fy;

      scale.value = next;

      // 클램프
      const bx = getBoundX(scale.value, halfW);
      const by = getBoundY(scale.value, halfH);
      translateX.value = clamp(translateX.value, -bx, bx);
      translateY.value = clamp(translateY.value, -by, by);
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= minScale + 1e-3) {
        scale.value = withTiming(minScale, { duration: 160 });
        translateX.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(0, { duration: 160 });
        runOnJS(setZoomActiveJS)(false);
      } else {
        const bx = getBoundX(scale.value, halfW);
        const by = getBoundY(scale.value, halfH);
        translateX.value = withSpring(clamp(translateX.value, -bx, bx), {
          damping: 18,
          stiffness: 180,
        });
        translateY.value = withSpring(clamp(translateY.value, -by, by), {
          damping: 18,
          stiffness: 180,
        });
      }
    });

  /** ===== Pan ===== */
  const pan = Gesture.Pan()
    .onBegin(() => {
      'worklet';
      startX.value = translateX.value;
      startY.value = translateY.value;
      if (scale.value > minScale) runOnJS(setZoomActiveJS)(true);
    })
    .onUpdate((e) => {
      'worklet';
      if (scale.value <= minScale + 1e-3) return;

      const rawX = startX.value + e.translationX;
      const rawY = startY.value + e.translationY;

      const bx = getBoundX(scale.value, halfW);
      const by = getBoundY(scale.value, halfH);

      // 러버밴딩
      const overX = rawX < -bx ? rawX + bx : rawX > bx ? rawX - bx : 0;
      const overY = rawY < -by ? rawY + by : rawY > by ? rawY - by : 0;

      translateX.value = overX === 0 ? clamp(rawX, -bx, bx) : Math.sign(overX) * bx + overX * 0.55;
      translateY.value = overY === 0 ? clamp(rawY, -by, by) : Math.sign(overY) * by + overY * 0.55;
    })
    .onEnd(() => {
      'worklet';
      const bx = getBoundX(scale.value, halfW);
      const by = getBoundY(scale.value, halfH);
      translateX.value = withSpring(clamp(translateX.value, -bx, bx), {
        damping: 18,
        stiffness: 180,
      });
      translateY.value = withSpring(clamp(translateY.value, -by, by), {
        damping: 18,
        stiffness: 180,
      });
      if (scale.value <= minScale + 1e-3) {
        runOnJS(setZoomActiveJS)(false);
      }
    });

  /** ===== Double Tap ===== */
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e, success) => {
      'worklet';
      if (!success) return;

      const zoomingIn = scale.value <= minScale + 1e-3;
      const targetScale = zoomingIn ? doubleTapScale : minScale;

      // 화면 중앙 기준 좌표계로 변환
      const fx = e.absoluteX - halfW;
      const fy = e.absoluteY - halfH;

      if (zoomingIn) {
        const scaleFactor = targetScale / scale.value;
        const nextX = (translateX.value - fx) * scaleFactor + fx;
        const nextY = (translateY.value - fy) * scaleFactor + fy;

        const bx = getBoundX(targetScale, halfW);
        const by = getBoundY(targetScale, halfH);

        scale.value = withTiming(targetScale, { duration: 200 });
        translateX.value = withTiming(clamp(nextX, -bx, bx), { duration: 200 });
        translateY.value = withTiming(clamp(nextY, -by, by), { duration: 200 });
        runOnJS(setZoomActiveJS)(true);
      } else {
        scale.value = withTiming(minScale, { duration: 200 });
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        runOnJS(setZoomActiveJS)(false);
      }
    });

  const composed = useMemo(
    () => Gesture.Simultaneous(pinch, pan, doubleTap),
    [pinch, pan, doubleTap]
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <GestureDetector gesture={composed}>
        <Animated.View style={style}>
          <Image
            source={{ uri }}
            style={{ width, height }}
            contentFit="contain"
            transition={100}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
