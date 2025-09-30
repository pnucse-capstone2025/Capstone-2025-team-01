import * as MediaLibrary from 'expo-media-library';
import { embedMany, embedSingle, ensureSimilarModel } from './inferSimilar';
import { l2Normalize } from './l2Normalize';

/**
 * 여러 벡터(embeddings)의 평균을 계산
 * @param embeddings - 특징 벡터(Float32Array)들의 배열
 * @returns 정규화된(normalized) 평균 벡터
 */
function averageEmbeddings(embeddings: Float32Array[]): Float32Array {
  if (!embeddings.length) {
    throw new Error('Cannot average empty list of embeddings.');
  }
  const vecLength = embeddings[0].length;
  const sum = new Float32Array(vecLength).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < vecLength; i++) {
      sum[i] += emb[i];
    }
  }

  const avg = new Float32Array(vecLength);
  for (let i = 0; i < vecLength; i++) {
    avg[i] = sum[i] / embeddings.length;
  }

  return l2Normalize(avg); // 중요: 최종 평균 벡터를 정규화
}

/**
 * 1단계: 예시 이미지들로부터 대표 특징 벡터를 생성하여 "학습"을 수행
 * @param trainUris - 학습 이미지들의 URI 배열
 * @param onProgress - 진행 상황을 보고하기 위한 콜백 함수
 * @returns 대표 임베딩(representative embedding)으로 귀결되는 Promise
 */
export async function createRepresentativeEmbedding(
  trainUris: string[],
  onProgress?: (done: number, total: number) => void
): Promise<Float32Array> {
  const model = await ensureSimilarModel();
  const { embeddings, okUris } = await embedMany(
    trainUris,
    model,
    224, // inputSize
    '0_1', // inputRange
    false, // stretch
    4, // concurrency
    onProgress
  );

  if (embeddings.length !== trainUris.length) {
    console.warn(`Could only process ${okUris.length}/${trainUris.length} training images.`);
    if (embeddings.length === 0) {
      throw new Error('Failed to create embeddings for any training images.');
    }
  }

  return averageEmbeddings(embeddings);
}

/**
 * 2단계: 전체 사진(assets) 풀에서 대표 임베딩과 유사한 이미지들을 검색
 * @param assetsToSearch - 검색을 수행할 모든 사진(asset)들
 * @param representativeEmbedding - 비교의 기준이 될 목표 임베딩
 * @param options - 검색 프로세스에 대한 설정값
 * @returns 일치하는 사진(asset)들의 배열로 귀결되는 Promise
 */
export async function findSimilarAssets(
  assetsToSearch: MediaLibrary.Asset[],
  representativeEmbedding: Float32Array,
  options: {
    threshold?: number;
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  }
): Promise<MediaLibrary.Asset[]> {
  const { threshold = 0.8, concurrency = 4, onProgress } = options;

  await ensureSimilarModel(); // 모델을 한 번만 미리 로드
  const matchedAssets: MediaLibrary.Asset[] = [];
  let done = 0;

  const queue = [...assetsToSearch];

  const workers = Array(Math.min(concurrency, queue.length))
    .fill(0)
    .map(async () => {
      while (queue.length > 0) {
        const asset = queue.shift();
        if (!asset) continue;

        try {
          const currentEmbedding = await embedSingle(asset.uri);

          let dotProduct = 0;
          for (let i = 0; i < representativeEmbedding.length; i++) {
            dotProduct += representativeEmbedding[i] * currentEmbedding[i];
          }

          if (dotProduct >= threshold) {
            matchedAssets.push(asset);
          }
        } catch (e) {
          console.warn(`Failed to process asset ${asset.uri}:`, e);
        } finally {
          done++;
          onProgress?.(done, assetsToSearch.length);
        }
      }
    });

  await Promise.all(workers);

  return matchedAssets;
}
