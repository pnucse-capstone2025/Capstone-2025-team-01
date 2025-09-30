import { extractTakenAt } from '@/src/utils/fingerprint';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

export type FpHint = {
  fpKey: string;
  md5?: string;
  size?: number;
  width?: number;
  height?: number;
  takenAt?: string;
};

const PAGE = 300;

function fpKeyOf(md5?: string, size?: number, w?: number, h?: number, takenAt?: string) {
  return [md5 || 'nomd5', size ?? 'nosize', `${w || 'w?'}x${h || 'h?'}`, takenAt || 'notime'].join(
    ':'
  );
}

/** 라이브러리를 페이징 스캔하여 fpKey → assetId 매핑을 찾아 반환 */
export async function resolveAssetIdsByFpHints(hints: FpHint[]): Promise<Record<string, string>> {
  if (!hints.length) return {};
  const need = new Map(hints.map((h) => [h.fpKey, h]));
  const found: Record<string, string> = {};

  // 빠른 후보 필터를 위해 힌트별 (size, wh, takenAt) 집합
  const sizeSet = new Set(hints.map((h) => h.size).filter(Boolean) as number[]);
  const whSet = new Set(hints.map((h) => `${h.width}x${h.height}`));
  const taSet = new Set(hints.map((h) => h.takenAt).filter(Boolean) as string[]);

  let after: string | undefined;

  scan: while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: 'photo',
      first: PAGE,
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    for (const a of page.assets) {
      // 1차 필터: 해상도/촬영시각(있으면)
      const whKey = `${a.width}x${a.height}`;
      if (whSet.size && !whSet.has(whKey)) continue;

      // 세부정보
      const info = await MediaLibrary.getAssetInfoAsync(a.id);
      const takenAt = extractTakenAt((info as any)?.exif);
      if (taSet.size && takenAt && !taSet.has(takenAt)) {
        // takenAt이 있는 힌트가 있는 경우, 안 맞으면 패스 (없으면 통과)
      }

      const local = info.localUri ?? info.uri;
      if (!local) continue;

      // 파일 md5/size
      let md5: string | undefined, size: number | undefined;
      try {
        const stat = await FileSystem.getInfoAsync(local, { md5: true });
        md5 = (stat as any)?.md5;
        size = (stat as any)?.size;
      } catch {}

      // 2차: size가 있는 힌트가 있다면 걸러주기
      if (sizeSet.size && size && !sizeSet.has(size)) continue;

      // fpKey 구성 & 매칭
      const fp = fpKeyOf(md5, size, a.width, a.height, takenAt);
      if (need.has(fp)) {
        found[fp] = a.id;
        need.delete(fp);
        if (need.size === 0) break scan;
      }
    }

    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }

  return found;
}
