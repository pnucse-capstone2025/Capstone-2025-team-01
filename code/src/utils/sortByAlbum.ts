// 사진의 위치를 이동시킬 수 있는 함수들
import * as MediaLibrary from 'expo-media-library';

// 앨범 보장(없으면 생성)
export async function ensureAlbum(title: string) {
  const album = await MediaLibrary.getAlbumAsync(title);
  if (album) return album;
  return MediaLibrary.createAlbumAsync(title, undefined, false);
}

// 실제 이동(복사 X, 이동)
export async function moveAssetsToAlbum(assetIds: string[], albumTitle: string) {
  if (!assetIds.length) return;
  const album = await ensureAlbum(albumTitle);

  // Expo에서 addAssetsToAlbumAsync(assets, album, copy) 세 번째 인자 false면 복사 대신 추가(=이동/링크) 동작
  await MediaLibrary.addAssetsToAlbumAsync(assetIds, album, false);
}
