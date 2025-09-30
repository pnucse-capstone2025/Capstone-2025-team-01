/**
 * 벡터를 단위 길이로 L2 정규화
 * @param vec 입력 벡터 (Float32Array)
 * @returns 정규화된 벡터
 */
export function l2Normalize(vec: Float32Array): Float32Array {
  let norm = 0;
  // 각 요소의 제곱의 합을 계산
  for (let i = 0; i < vec.length; i++) {
    norm += vec[i] * vec[i];
  }
  // 벡터의 크기(magnitude)를 계산하고, 0으로 나누는 것을 방지하기 위해 아주 작은 값(epsilon)을 더함
  norm = Math.sqrt(norm) + 1e-12;
  const out = new Float32Array(vec.length);
  // 각 요소를 벡터의 크기로 나눔
  for (let i = 0; i < vec.length; i++) {
    out[i] = vec[i] / norm;
  }
  return out;
}
