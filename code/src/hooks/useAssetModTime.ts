import * as MediaLibrary from 'expo-media-library';
import { useEffect, useRef, useState } from 'react';

const globalModCache = new Map<string, string>();

export function useAssetModTime(assetId?: string) {
  const [modTimeText, setModTimeText] = useState<string | null>(null);
  const currentIdRef = useRef<string | undefined>(assetId);

  useEffect(() => {
    if (!assetId) {
      setModTimeText(null);
      return;
    }
    currentIdRef.current = assetId;

    const cached = globalModCache.get(assetId);
    if (cached) {
      setModTimeText(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const info: MediaLibrary.AssetInfo = await MediaLibrary.getAssetInfoAsync(assetId);
        const ms = info.modificationTime ?? info.creationTime ?? null;
        const text = ms ? new Date(ms).toLocaleString() : '-';
        if (!cancelled && currentIdRef.current === assetId) {
          globalModCache.set(assetId, text);
          setModTimeText(text);
        }
      } catch {
        if (!cancelled) setModTimeText('-');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return { modTimeText };
}
