// src/utils/inferUnified.ts
import { ImageInfo, Skia } from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import { decode as atob } from 'base-64';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

const UNIFIED_MODEL = require('../assets/models/unified/unified_detector.tflite');
const UNIFIED_THRESH = require('../assets/models/unified/unified_threshold.json');

const CLASSES = (UNIFIED_THRESH.classes ?? []) as string[];
const THRESHOLDS: Record<string, number> = UNIFIED_THRESH.thresholds_per_class ?? {};

let model: TensorflowModel | null = null;

function base64ToUint8(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

// 이미지를 모델 입력에 맞는 uint8 타입의 RGB 데이터로 변환하는 함수
async function decodeAndResizeToRGBUint8(uri: string, outW = 224, outH = 224): Promise<Uint8Array> {
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const encoded = base64ToUint8(b64);

  const data = Skia.Data.fromBytes(encoded);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error('Skia: Failed to decode image');

  const surface = Skia.Surface.Make(outW, outH);
  if (!surface) throw new Error('Skia: Failed to create surface');

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.drawImageRect(
    img,
    { x: 0, y: 0, width: img.width(), height: img.height() },
    { x: 0, y: 0, width: outW, height: outH },
    paint
  );

  const snapshot = surface.makeImageSnapshot();
  const info: ImageInfo = {
    width: outW,
    height: outH,
    colorType: 4, // RGBA_8888
    alphaType: 2, // Premul
  };

  const rgba = snapshot.readPixels(0, 0, info);
  if (!rgba) throw new Error('Skia: readPixels failed');

  // RGBA를 RGB Uint8Array로 변환 (정규화 없음)
  const rgb = new Uint8Array(outW * outH * 3);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i];
    rgb[j + 1] = rgba[i + 1];
    rgb[j + 2] = rgba[i + 2];
  }
  return rgb;
}

export async function ensureUnifiedModel(): Promise<TensorflowModel> {
  if (!model) {
    model = await loadTensorflowModel(UNIFIED_MODEL);
  }
  return model!;
}

export async function inferUnified(uri: string) {
  const m = await ensureUnifiedModel();
  // Uint8 변환 함수를 사용하도록 변경
  const input = await decodeAndResizeToRGBUint8(uri);

  const output = m.runSync([input]);
  // 모델 출력값(probs)은 라이브러리가 자동으로 float으로 변환
  const probs = Array.from(output[0] as ArrayLike<number>);

  let maxProb = -1;
  let maxIndex = -1;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > maxProb) {
      maxProb = probs[i];
      maxIndex = i;
    }
  }

  const label = CLASSES[maxIndex];
  const threshold = THRESHOLDS[label] ?? 1.0;
  const passes = maxProb >= threshold;

  return {
    label: passes ? label : 'others',
    score: maxProb,
    threshold,
    passes,
    probs,
  };
}