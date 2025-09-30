/*
- 온디바이스 환경에서 유사한 이미지를 찾아 그룹으로 묶는 기능(clustering)을 구현
- 프로세스
  1. 이미지 전처리: 각 이미지를 AI 모델이 이해할 수 있는 크기(224x224)와 형식으로 변환
  2. feature vector 추출 (embedding): MobileNet을 사용해 각 이미지의 핵심 특징을 숫자로 된 배열로 추출
  3. 유사도 계산 및 클러스터링: 모든 이미지 쌍의 feature vector 간 코사인 유사도를 계산하고
      유사도가 높은 이미지들을 DSU(Union-Find) 알고리즘을 사용해 하나의 그룹으로 묶음
*/
import { ImageInfo, Skia } from '@shopify/react-native-skia';
import { decode as atob } from 'base-64';
import * as FileSystem from 'expo-file-system';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';

// 모델 불러오기
const SIMILAR_BACKBONE = require('@/src/assets/models/similar/mobilenet_v3_small.tflite');

// 기본 파라미터
export type SimilarOptions = {
  threshold?: number; // 코사인 유사도 임계값. 이 값 이상이어야 '유사하다'고 판단 (기본 0.7)
  minClusterSize?: number; // 그룹으로 인정할 최소 이미지 개수 (기본 2)
  inputSize?: number; // AI 모델에 입력될 정사각형 이미지의 한 변 크기 (기본 224)
  inputRange?: '0_1' | '-1_1'; // 이미지 픽셀 값을 어떤 범위로 정규화할지 결정
  concurrency?: number; // 동시에 처리할 이미지의 최대 개수. 높이면 빠르지만 메모리를 더 쓰게됨
  stretch?: boolean; // true면 이미지 비율을 무시하고 정사각형으로 늘림, false면 비율을 유지하며 중앙을 잘라냄(center-crop)
  onProgress?: (done: number, total: number) => void; // 진행 상황 콜백으로 알려줌.
};

// 그룹화 작업이 완료된 후 반환되는 결과물의 구조
export type SimilarResult = {
  groups: Array<{
    // 찾아낸 유사 이미지 그룹들의 배열
    size: number; // 그룹에 속한 이미지의 총 개수
    representativeIndex: number; // 그룹을 대표하는 이미지의 인덱스 (가장 중심에 있는 이미지)
    representativeUri: string; // 대표 이미지의 파일 경로 (URI)
    memberIndices: number[]; // 그룹에 속한 모든 이미지의 인덱스 배열
    memberUris: string[]; // 그룹에 속한 모든 이미지의 URI 배열
  }>;
  sims: number[][]; // 모든 이미지 쌍 간의 코사인 유사도 값을 저장한 2차원 행렬
  uris: string[]; // 성공적으로 처리된 이미지들의 URI 목록 (오류 난 이미지는 제외될 수 있음)
  embeddings: Float32Array[]; // 각 이미지에서 추출한 L2 정규화된 특징 벡터 배열
  params: Required<
    Pick<SimilarOptions, 'threshold' | 'minClusterSize' | 'inputSize' | 'inputRange' | 'stretch'>
  >; // 실행에 사용된 최종 파라미터
};

// 모델 관리
let model: TensorflowModel | null = null; // 로드된 TFLite 모델을 저장할 변수

export async function ensureSimilarModel() {
  if (!model) model = await loadTensorflowModel(SIMILAR_BACKBONE);
  return model!;
}

// 이미지 전처리
function base64ToUint8(base64: string) {
  // param: Base64 인코딩된 문자열
  const bin = atob(base64); // base-64 라이브러리를 사용해 디코딩
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes; // bytes: 디코딩된 바이너리 데이터
}

// 이미지 비율을 유지하면서 중앙을 잘라내기(center-crop) 위해 원본 이미지에서 잘라낼 영역(Rect)을 계산
// srcW : 원본 이미지 너비
// srcH : 원본 이미지 높이
// dstW : 목표 너비 (모델 입력 크기)
// dstH : 목표 높이 (모델 입력 크기)
function computeCenterCropSrcRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  //const scale = Math.max(dstW / srcW, dstH / srcH);
  //const newW = srcW * scale;
  //const newH = srcH * scale;
  //const left = (newW - dstW) / 2;
  //const top = (newH - dstH) / 2;
  const dstAspect = dstW / dstH; // 목표 영역의 가로세로 비율
  const srcAspect = srcW / srcH; // 원본 이미지의 가로세로 비율
  if (srcAspect > dstAspect) {
    // 원본이 가로로 더 길쭉한 경우 높이를 기준으로 너비를 계산하여, 가로 방향의 중앙을 잘라냄
    const cropW = Math.round(srcH * dstAspect);
    const cropH = srcH;
    const cropX = Math.floor((srcW - cropW) / 2);
    return { x: cropX, y: 0, width: cropW, height: cropH };
  } else {
    // 원본이 세로로 더 길쭉한 경우 너비를 기준으로 높이를 계산하여, 세로 방향의 중앙을 잘라냄
    const cropW = srcW;
    const cropH = Math.round(srcW / dstAspect);
    const cropY = Math.floor((srcH - cropH) / 2);
    return { x: 0, y: cropY, width: cropW, height: cropH };
  }
}

// 이미지 파일을 읽고, AI 모델 입력에 맞게 크기를 조절한 후, RGB 픽셀 배열로 변환
async function decodeAndResizeToRGB(
  uri: string, // 이미지 파일 경로
  outW = 224, // 결과 이미지 너비
  outH = 224, // 결과 이미지 높이
  opts: { inputRange: '0_1' | '-1_1'; stretch: boolean } = { inputRange: '0_1', stretch: false }
) {
  // // 1. Expo FileSystem API를 사용해 이미지를 Base64 문자열로 읽어옴
  const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const encoded = base64ToUint8(b64);

  // 2. Skia를 사용해 이미지 데이터를 디코딩
  const data = Skia.Data.fromBytes(encoded);
  const img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) throw new Error('Skia: failed to decode image');

  // 3. 리사이즈된 이미지를 그릴 가상의 캔버스(Surface)를 만듦
  const surface = Skia.Surface.MakeOffscreen(outW, outH);
  if (!surface) throw new Error('Skia: failed to create surface');

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();

  // 4. stretch 옵션에 따라 원본 이미지 전체를 사용하거나, center-crop을 위한 영역을 계산
  const srcRect = opts.stretch
    ? { x: 0, y: 0, width: img.width(), height: img.height() }
    : computeCenterCropSrcRect(img.width(), img.height(), outW, outH);

  // 5. 원본의 srcRect 영역을 캔버스의 (0,0,outW,outH) 영역에 맞게 그림 (리사이즈 발생)
  canvas.drawImageRect(img, srcRect, { x: 0, y: 0, width: outW, height: outH }, paint);

  // 6. 캔버스에 그려진 최종 이미지를 픽셀 데이터로 읽어옴
  const snapshot = surface.makeImageSnapshot();
  const info: ImageInfo = {
    width: outW,
    height: outH,
    colorType: 4, // RGBA8888
    alphaType: 2,
  };
  const rgba = snapshot.readPixels(0, 0, info);
  if (!rgba) throw new Error('Skia: readPixels failed');

  // 7. RGBA 픽셀 데이터를 모델이 요구하는 RGB Float32 배열로 변환하고, 픽셀 값을 정규화
  const rgb = new Float32Array(outW * outH * 3);
  const range = opts.inputRange;
  if (range === '0_1') {
    // 픽셀 값(0~255)을 0~1 사이의 실수로 변환
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i] / 255;
      rgb[j + 1] = rgba[i + 1] / 255;
      rgb[j + 2] = rgba[i + 2] / 255;
      // 알파 값은 버림
    }
  } else {
    // 픽셀 값(0~255)을 -1~1 사이의 실수로 변환
    for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
      rgb[j] = rgba[i] / 127.5 - 1;
      rgb[j + 1] = rgba[i + 1] / 127.5 - 1;
      rgb[j + 2] = rgba[i + 2] / 127.5 - 1;
    }
  }

  return rgb;
}

// 임베딩 및 유사도 계산

// 벡터를 L2 정규화. 벡터의 크기(magnitude)를 1로 만드는 과정
// 이렇게 하면 나중에 코사인 유사도를 간단히 내적으로 계산할 수 있어 효율적
function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  // 벡터의 각 요소를 제곱하여 더함
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  // 제곱합의 제곱근을 구하여 벡터의 크기를 계산
  norm = Math.sqrt(norm) + 1e-12; // 0으로 나누는 것을 방지하기 위해 작은 값 1e-12를 더함
  const out = new Float32Array(vec.length);
  // 각 요소를 벡터의 크기로 나누어 정규화
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / norm;
  return out;
}

// 단일 이미지에 대한 특징 벡터(임베딩)를 추출
async function embedOne(
  uri: string,
  m: TensorflowModel,
  size: number,
  inputRange: '0_1' | '-1_1',
  stretch: boolean
) {
  // 1. 이미지를 전처리하여 모델 입력 형식으로 만듦
  const input = await decodeAndResizeToRGB(uri, size, size, { inputRange, stretch });
  // 2. 모델을 실행(추론)하여 결과물을 받음
  const outputs = m.runSync([input]);
  // 3. 모델의 출력에서 1차원 특징 벡터를 추출
  const raw = outputs[0] as Float32Array;
  if (!raw || !(raw instanceof Float32Array)) throw new Error('Invalid embedding output');
  // 4. 추출된 특징 벡터를 L2 정규화하여 반환
  return l2Normalize(raw);
}

// 여러 이미지를 동시에 처리하여 각각의 특징 벡터를 추출
// 'Promise Pool'을 사용하여 지정된 동시성(concurrency)에 맞게 병렬 처리하여 속도를 높임
export async function embedMany(
  uris: string[],
  m: TensorflowModel,
  size: number,
  inputRange: '0_1' | '-1_1',
  stretch: boolean,
  concurrency = 3,
  onProgress?: (done: number, total: number) => void
) {
  const results: Float32Array[] = []; // 성공한 임베딩을 저장할 배열
  const okUris: string[] = []; // 성공한 URI를 저장할 배열
  let done = 0;

  // 간단한 Promise Pool 구현
  const queue = [...uris]; // 처리해야 할 URI 큐
  const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
    // 큐에 처리할 URI가 남아있는 동안 계속 작업
    while (queue.length) {
      const uri = queue.shift()!;
      try {
        const e = await embedOne(uri, m, size, inputRange, stretch);
        results.push(e);
        okUris.push(uri);
      } catch (_err) {
        // skip failed
      } finally {
        done++;
        onProgress?.(done, uris.length);
      }
    }
  });
  // 모든 워커가 작업을 마칠 때까지 기다림
  await Promise.all(workers);
  return { embeddings: results, okUris };
}

// 클러스터링 & DSU (Union-Find)
class DSU {
  // 각 이미지를 하나의 집합으로 시작하여 유사한 이미지들을 만나면 두 집합을 합치는 데 사용
  private p: number[]; // 각 원소의 부모 노드를 저장하는 배열
  private r: number[]; // 각 집합의 순위(rank)를 저장하는 배열 (트리의 깊이)
  constructor(n: number) {
    // n개의 원소로 초기화. 처음에는 모두 자기 자신을 부모로 가리킵니다. (n개의 집합)
    this.p = Array.from({ length: n }, (_, i) => i);
    this.r = Array(n).fill(0);
  }

  // x가 속한 집합의 대표(루트)를 찾는 함수. 경로 압축 최적화 포함.
  find(x: number): number {
    while (this.p[x] !== x) {
      this.p[x] = this.p[this.p[x]]; // 부모를 루트로 직접 연결 (경로 압축)
      x = this.p[x];
    }
    return x;
  }

  // a와 b가 속한 두 집합을 합치는 함수. rank 기반 최적화 포함.
  union(a: number, b: number): boolean {
    const ra = this.find(a),
      rb = this.find(b);
    if (ra === rb) return false; // 이미 같은 집합이면 합치지 않음

    if (this.r[ra] < this.r[rb]) this.p[ra] = rb;
    else if (this.r[ra] > this.r[rb]) this.p[rb] = ra;
    else {
      this.p[rb] = ra;
      this.r[ra] += 1;
    } // rank가 같으면 한쪽을 다른 쪽에 붙이고 rank를 1 증가
    return true;
  }
}

// 임베딩 배열을 받아 코사인 유사도를 계산하고, DSU를 이용해 클러스터를 만듦
function buildClusters(embs: Float32Array[], threshold: number) {
  const n = embs.length;
  const dsu = new DSU(n);
  const sims: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    sims[i][i] = 1; // 자기 자신과의 유사도는 1
    for (let j = i + 1; j < n; j++) {
      // L2 정규화된 벡터들의 코사인 유사도는 단순히 내적과 같음
      let s = 0;
      const a = embs[i],
        b = embs[j];
      const L = a.length;
      for (let k = 0; k < L; k++) s += a[k] * b[k];
      sims[i][j] = s;
      sims[j][i] = s; // 유사도 행렬은 대칭
      if (s >= threshold) dsu.union(i, j); // 계산된 유사도가 임계값보다 높으면 두 이미지를 같은 그룹으로 합침
    }
  }

  // DSU 작업이 끝난 후 최종 그룹들을 만듦
  const groupsMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = dsu.find(i);
    const arr = groupsMap.get(root) || [];
    arr.push(i);
    groupsMap.set(root, arr); // 같은 루트를 가진 이미지들을 하나의 배열에 묶음
  }
  return { groups: [...groupsMap.values()], sims };
}

function pickMedoid(embs: Float32Array[], idxs: number[], sims: number[][]) {
  // 평균 유사도가 가장 높은 멤버 선택
  let bestIdx = idxs[0];
  let bestScore = -Infinity;
  for (const i of idxs) {
    let mean = 0;
    for (const j of idxs) mean += sims[i][j];
    mean /= idxs.length;
    if (mean > bestScore) {
      bestScore = mean;
      bestIdx = i;
    }
  }
  return bestIdx;
}

// 메인 실행 함수

export async function runSimilarGrouping(
  uris: string[],
  options: SimilarOptions = {}
): Promise<SimilarResult> {
  const {
    threshold = 0.7,
    minClusterSize = 2,
    inputSize = 224,
    inputRange = '0_1',
    concurrency = 3,
    stretch = false,
    onProgress,
  } = options;

  // 1. AI 모델을 로드
  const m = await ensureSimilarModel();

  // 2. 모든 이미지에 대해 병렬로 임베딩을 추출
  const { embeddings, okUris } = await embedMany(
    uris,
    m,
    inputSize,
    inputRange,
    stretch,
    concurrency,
    onProgress
  );

  // 처리된 이미지가 하나도 없으면 빈 결과를 반환
  if (embeddings.length === 0) {
    return {
      groups: [],
      sims: [],
      uris: [],
      embeddings: [],
      params: { threshold, minClusterSize, inputSize, inputRange, stretch },
    };
  }

  // 3. 임베딩을 이용해 클러스터를 구축
  const { groups, sims } = buildClusters(embeddings, threshold);

  // 4. 최종 결과를 정리하고 형식에 맞게 가공
  const printable = groups
    // 최소 클러스터 크기보다 작은 그룹은 필터링하여 제외
    .filter((g) => g.length >= minClusterSize)
    .map((g) => {
      const rep = pickMedoid(embeddings, g, sims);
      return {
        size: g.length,
        representativeIndex: rep,
        representativeUri: okUris[rep],
        memberIndices: g,
        memberUris: g.map((i) => okUris[i]),
      };
    })
    .sort((a, b) => b.size - a.size || a.representativeUri.localeCompare(b.representativeUri));

  return {
    groups: printable,
    sims,
    uris: okUris,
    embeddings,
    params: { threshold, minClusterSize, inputSize, inputRange, stretch },
  };
}

// 편의 래퍼: 단일 URI에 대한 임베딩
export async function embedSingle(
  uri: string,
  opts?: { inputSize?: number; inputRange?: '0_1' | '-1_1'; stretch?: boolean }
) {
  const m = await ensureSimilarModel();
  const size = opts?.inputSize ?? 224;
  const inputRange = opts?.inputRange ?? '0_1';
  const stretch = opts?.stretch ?? false;
  return embedOne(uri, m, size, inputRange, stretch);
}
