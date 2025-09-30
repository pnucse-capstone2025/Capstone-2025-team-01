import type * as MediaLibrary from 'expo-media-library';

type Asset = MediaLibrary.Asset;

type PhotoCacheShape = {
  hydrated: boolean;
  assets: Asset[];
  endCursor: string | null;
  hasNextPage: boolean;
  excludedIds: Set<string>;
};

declare global {
  // eslint-disable-next-line no-var
  var __PHOTO_CACHE__: PhotoCacheShape | undefined;
}

const initial: PhotoCacheShape = {
  hydrated: false,
  assets: [],
  endCursor: null,
  hasNextPage: true,
  excludedIds: new Set(),
};

export function getPhotoCache(): PhotoCacheShape {
  if (!globalThis.__PHOTO_CACHE__) {
    globalThis.__PHOTO_CACHE__ = initial;
  }
  return globalThis.__PHOTO_CACHE__;
}

export function resetPhotoCache() {
  globalThis.__PHOTO_CACHE__ = { ...initial };
}
