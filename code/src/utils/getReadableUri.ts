import * as MediaLibrary from 'expo-media-library';

export async function getReadableUri(asset: MediaLibrary.Asset) {
  const info = await MediaLibrary.getAssetInfoAsync(asset);
  return info.localUri ?? asset.uri; // file:// 우선, 없으면 기존
}
