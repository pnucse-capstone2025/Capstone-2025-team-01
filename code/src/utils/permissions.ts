import * as MediaLibrary from 'expo-media-library';

export async function ensureMediaPermissions() {
  const { status } = await MediaLibrary.getPermissionsAsync();
  if (status === 'granted') return;
  const next = await MediaLibrary.requestPermissionsAsync();
  if (next.status !== 'granted') {
    throw new Error('미디어 라이브러리 접근 권한이 필요합니다.');
  }
}
