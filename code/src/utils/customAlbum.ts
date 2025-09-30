import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { nanoid } from 'nanoid/non-secure';

export type CustomAlbum = {
  id: string;
  title: string;
  assetIds: string[];
  coverAssetId?: string;
  createdAt: number;
  updatedAt: number;
  isUserCreated?: boolean;
};

// 선택된 훈련 이미지 type
export type Picked = {
  id: string;
  uri: string;
  sig?: string;
  assetId?: string;
  fpKey?: string;
  size?: number;
  width?: number;
  height?: number;
  takenAt?: string;
};

// 사용자 정의 앨범 훈련 상태 type
export type CustomAlbumState = {
  status: 'idle' | 'training' | 'inferring' | 'completed' | 'error';
  embedding?: number[]; // 대표 임베딩 벡터
  lastCompleted?: number; // 마지막 완료 시각
  foundCount?: number;
};

const coverKey = (albumId: string) => `broom.coverAssetId.${albumId}.v1`;
const coverUriKey = (albumId: string) => `broom.coverUri.${albumId}.v1`;
const CA_STORAGE_KEY = 'broom.customAlbums.v1';
const stateKey = (albumId: string) => `broom.albumState.${albumId}.v1`;
const trainKey = (albumId: string) => `broom.trainImages.${albumId}.v1`;

// ------------------------------
// 기본 저장/로드
// ------------------------------
export async function loadAlbums(): Promise<CustomAlbum[]> {
  const raw = await AsyncStorage.getItem(CA_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as CustomAlbum[];
    return parsed.map((a) => ({
      ...a,
      assetIds: a.assetIds ?? [],
    }));
  } catch {
    return [];
  }
}

async function save(albums: CustomAlbum[]) {
  await AsyncStorage.setItem(CA_STORAGE_KEY, JSON.stringify(albums));
}

export async function loadAlbumById(id: string): Promise<CustomAlbum | null> {
  const albums = await loadAlbums();
  return albums.find((a) => a.id === id) ?? null;
}

// ------------------------------
// 생성/수정/삭제
// ------------------------------
export async function createAlbum(
  title: string,
  opts?: { isDraft?: boolean }
): Promise<CustomAlbum> {
  const albums = await loadAlbums();
  const now = Date.now();
  const isDraft = opts?.isDraft ?? true; // 기본값: 드래프트 생성
  const album: CustomAlbum = {
    id: nanoid(),
    title,
    assetIds: [],
    createdAt: now,
    updatedAt: now,
    isUserCreated: !isDraft, // 드래프트면 목록 비노출
  };
  await save([album, ...albums]);
  return album;
}

export async function publishAlbum(id: string) {
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === id);
  if (idx < 0) return;
  albums[idx] = { ...albums[idx], isUserCreated: true, updatedAt: Date.now() };
  await save(albums);
}

export async function renameAlbum(id: string, title: string) {
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === id);
  if (idx < 0) return;
  albums[idx] = { ...albums[idx], title, updatedAt: Date.now() };
  await save(albums);
}

export async function deleteAlbum(id: string) {
  const albums = await loadAlbums();
  await save(albums.filter((a) => a.id !== id));
  // 앨범별 커버 키 정리(자산ID & 내부 파일 URI)
  try {
    const uri = await AsyncStorage.getItem(coverUriKey(id));
    if (uri) {
      await deleteFileIfExists(uri);
      await AsyncStorage.removeItem(coverUriKey(id));
    }
    await AsyncStorage.removeItem(stateKey(id));
    const trainDir = FileSystem.documentDirectory + `train/${id}`;
    await FileSystem.deleteAsync(trainDir, { idempotent: true });
    await AsyncStorage.removeItem(trainKey(id));
  } catch (e) {
    console.error(`Error during cleanup for album ${id}`, e);
  }
}

// ------------------------------
// 자산 추가/제거
// ------------------------------
export async function addAssets(id: string, assetIds: string[]) {
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === id);
  if (idx < 0) return;

  const set = new Set(albums[idx].assetIds);
  assetIds.forEach((x) => set.add(x));

  const nextAssets = Array.from(set);
  const cover = albums[idx].coverAssetId ?? assetIds[0];

  albums[idx] = {
    ...albums[idx],
    assetIds: nextAssets,
    coverAssetId: cover,
    updatedAt: Date.now(),
  };
  await save(albums);
}

export async function removeAsset(id: string, assetId: string) {
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === id);
  if (idx < 0) return;

  const next = albums[idx].assetIds.filter((x) => x !== assetId);
  const cover =
    albums[idx].coverAssetId && albums[idx].coverAssetId === assetId
      ? next[0]
      : albums[idx].coverAssetId;

  albums[idx] = { ...albums[idx], assetIds: next, coverAssetId: cover, updatedAt: Date.now() };
  await save(albums);
}

// ------------------------------
// 커버 저장/복원 (앨범별) — 기존: 갤러리(자산) 방식
// ------------------------------
/**
 * 앨범별 커버 AssetId 저장
 */
export async function saveCoverAssetId(albumId: string, assetId: string) {
  try {
    await AsyncStorage.setItem(coverKey(albumId), assetId);
  } catch {}
  // 앨범 메타에도 반영(선택 사항이지만 일관성 좋음)
  const albums = await loadAlbums();
  const idx = albums.findIndex((a) => a.id === albumId);
  if (idx >= 0) {
    albums[idx] = { ...albums[idx], coverAssetId: assetId, updatedAt: Date.now() };
    await save(albums);
  }
}

/**
 * 앨범별 커버 URI 로드 (저장된 AssetId → MediaLibrary에서 현재 URI 조회)
 */
export async function loadCoverAssetUri(albumId: string): Promise<string | null> {
  try {
    const assetId = await AsyncStorage.getItem(coverKey(albumId));
    if (!assetId) return null;
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    return info.localUri ?? info.uri ?? null;
  } catch {
    return null;
  }
}

// ------------------------------
// 갤러리에 저장하지 않는 “앱 내부 파일” 방식
// ------------------------------

/** 내부 커버 파일 경로 키-값 */
export async function saveCoverUri(albumId: string, uri: string) {
  await AsyncStorage.setItem(coverUriKey(albumId), uri);
}

export async function loadCoverUri(albumId: string): Promise<string | null> {
  return AsyncStorage.getItem(coverUriKey(albumId));
}

/** 내부에 저장된 커버 파일이 있으면 삭제 */
export async function deleteCoverFileIfExists(uri?: string | null) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // ignore
  }
}

/** 확장자 유틸 */
function extFrom(uri?: string, fileName?: string, mimeType?: string) {
  const byName = (fileName ?? uri ?? '').split('/').pop() ?? '';
  if (byName.includes('.')) return byName.split('.').pop()!.toLowerCase();
  if (mimeType?.startsWith('image/')) return mimeType.split('/')[1]?.toLowerCase() || 'jpg';
  return 'jpg';
}

/**
 * - 선택한 이미지(picker uri)를 '앱 전용 저장소'에 복사해 커버로 설정
 * - 갤러리에 올라가지 않음 (MediaLibrary 비사용)
 * - 반환값: 최종 저장된 내부 파일 URI
 */
export async function persistCoverToAppStorage(params: {
  albumId: string;
  srcUri: string;
  fileName?: string;
  mimeType?: string;
}) {
  const { albumId, srcUri, fileName, mimeType } = params;
  const coversDir = FileSystem.documentDirectory + 'covers';
  await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });

  const ext = extFrom(srcUri, fileName, mimeType);
  const dest = `${coversDir}/${albumId}.${ext}`;

  // 기존 파일 정리
  const prev = await loadCoverUri(albumId);
  if (prev && prev !== dest) {
    await deleteCoverFileIfExists(prev);
  }

  // 복사 (영구 보존)
  await FileSystem.copyAsync({ from: srcUri, to: dest });

  // 저장
  await saveCoverUri(albumId, dest);
  return dest;
}

/* ------------------------------ 학습 이미지 관련 코드 ------------------------------ */
/** 내부 파일 삭제 (있으면) */
export async function deleteFileIfExists(uri?: string | null) {
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {
    // ignore
  }
}

/** 앨범별 학습 이미지 로드/저장 */
export async function loadTrainPicks(albumId: string): Promise<Picked[]> {
  const raw = await AsyncStorage.getItem(trainKey(albumId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Picked[];
    // 혹시 파일이 사라진 항목은 걸러준다
    const checked: Picked[] = [];
    for (const p of arr) {
      try {
        const info = await FileSystem.getInfoAsync(p.uri);
        if (info.exists) checked.push(p);
      } catch {}
    }
    if (checked.length !== arr.length) {
      await AsyncStorage.setItem(trainKey(albumId), JSON.stringify(checked));
    }
    return checked;
  } catch {
    return [];
  }
}

export async function saveTrainPicks(albumId: string, picks: Picked[]) {
  await AsyncStorage.setItem(trainKey(albumId), JSON.stringify(picks));
}

/** 선택한 이미지를 "앱 전용 저장소"에 영구 복사하고 Picked 반환 */
export async function persistPickedToAppStorage(params: {
  albumId: string;
  srcUri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<Picked> {
  const { albumId, srcUri, fileName, mimeType } = params;
  const baseDir = FileSystem.documentDirectory + `train/${albumId}`;
  await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });

  const id = nanoid();
  const ext = extFrom(srcUri, fileName, mimeType);
  const dest = `${baseDir}/${id}.${ext}`;

  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return { id, uri: dest };
}

// ------------------------------
// 앨범 상태 관리(훈련/추론용)
// ------------------------------
/** 맞춤형 앨범의 학습/추론 상태를 저장 */
export async function saveAlbumState(albumId: string, state: CustomAlbumState) {
  try {
    await AsyncStorage.setItem(stateKey(albumId), JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save album state:', e);
  }
}

/** 맞춤형 앨범의 학습/추론 상태를 로드 */
export async function loadAlbumState(albumId: string): Promise<CustomAlbumState | null> {
  try {
    const raw = await AsyncStorage.getItem(stateKey(albumId));
    if (!raw) return null;
    return JSON.parse(raw) as CustomAlbumState;
  } catch (e) {
    console.error('Failed to load album state:', e);
    return null;
  }
}

// ----- 드래프트 키/유틸 -----
export const draftFlagFromParams = (params: any) =>
  params?.draft === '1' || params?.draft === 1 || params?.draft === true;

export const draftCoverUriKey = (albumId: string) => `broom.draft.coverUri.${albumId}.v1`;
export const draftTrainKey = (albumId: string) => `broom.draft.trainImages.${albumId}.v1`;

export type DraftPicked = {
  id: string;
  uri: string;
  sig?: string;
  assetId?: string;
  fpKey?: string;
  size?: number;
  width?: number;
  height?: number;
  takenAt?: string;
};

// 드래프트 학습이미지 로드/저장
export async function loadDraftTrainPicks(albumId: string): Promise<DraftPicked[]> {
  const raw = await AsyncStorage.getItem(draftTrainKey(albumId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DraftPicked[];
  } catch {
    return [];
  }
}
export async function saveDraftTrainPicks(albumId: string, picks: DraftPicked[]) {
  await AsyncStorage.setItem(draftTrainKey(albumId), JSON.stringify(picks));
}
export async function clearDraftTrain(albumId: string) {
  await AsyncStorage.removeItem(draftTrainKey(albumId));
  // 드래프트 폴더 삭제
  const dir = FileSystem.documentDirectory + `train_draft/${albumId}`;
  try {
    await FileSystem.deleteAsync(dir, { idempotent: true });
  } catch {}
}

// 드래프트 커버 로드/저장/삭제
export async function loadDraftCoverUri(albumId: string) {
  return AsyncStorage.getItem(draftCoverUriKey(albumId));
}
export async function saveDraftCoverUri(albumId: string, uri: string) {
  await AsyncStorage.setItem(draftCoverUriKey(albumId), uri);
}
export async function deleteDraftCoverFileIfExists(albumId: string) {
  const uri = await loadDraftCoverUri(albumId);
  if (!uri) return;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {}
  await AsyncStorage.removeItem(draftCoverUriKey(albumId));
}

export async function persistDraftPickedToAppStorage(params: {
  albumId: string;
  srcUri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<Picked> {
  const { albumId, srcUri, fileName, mimeType } = params;
  const baseDir = FileSystem.documentDirectory + `train_draft/${albumId}`;
  await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });

  const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
  const ext = (() => {
    const byName = (fileName ?? srcUri ?? '').split('/').pop() ?? '';
    if (byName.includes('.')) return byName.split('.').pop()!.toLowerCase();
    if (mimeType?.startsWith('image/')) return mimeType.split('/')[1]?.toLowerCase() || 'jpg';
    return 'jpg';
  })();
  const dest = `${baseDir}/${id}.${ext}`;

  await FileSystem.copyAsync({ from: srcUri, to: dest });
  return { id, uri: dest };
}
// ----------------------------------------------
