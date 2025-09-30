import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

export function extractTakenAt(exif?: any): string | undefined {
  if (!exif) return undefined;
  return exif.DateTimeOriginal || exif.DateTime || exif.CreationDate || undefined;
}

export type Fingerprint = {
  md5?: string;
  size?: number;
  width?: number;
  height?: number;
  takenAt?: string;
  fpKey: string;
};

export async function makeFingerprint(a: ImagePicker.ImagePickerAsset): Promise<Fingerprint> {
  let md5: string | undefined, size: number | undefined;
  try {
    const info = await FileSystem.getInfoAsync(a.uri, { md5: true });
    md5 = (info as any)?.md5;
    size = (info as any)?.size;
  } catch {}

  const width = a.width,
    height = a.height;
  const takenAt = extractTakenAt((a as any).exif);

  const fpKey = [
    md5 || 'nomd5',
    size ?? 'nosize',
    `${width || 'w?'}x${height || 'h?'}`,
    takenAt || 'notime',
  ].join(':');

  return { md5, size, width, height, takenAt, fpKey };
}
