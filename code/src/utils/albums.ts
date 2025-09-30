// src/utils/albums.ts
import { MANAGED_ALBUM_TITLES } from '@/src/constants/albums';
import { loadAlbums as loadCustomMetas } from '@/src/utils/customAlbum';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

const STORAGE_KEY = 'broom.excludedAlbumIds.v1';

export async function ensureAlbumsExist() {
  for (const title of MANAGED_ALBUM_TITLES) {
    const album = await MediaLibrary.getAlbumAsync(title);
    if (!album) {
      try {
        await MediaLibrary.createAlbumAsync(title, undefined as any, false);
      } catch {
        // 빈 앨범 생성이 불가한 경우: 첫 이동 시 자연스럽게 생성(이 케이스는 2회 호출 불가피)
      }
    }
  }
}

// asset들을 특정 앨범에 "복사 없이 추가"(=이동/링크)
// 새 앨범 생성 시 Android에서 발생하는 오류를 방지하도록 업데이트함
// @param title 앨범의 이름
// @param assets 추가할 Asset 객체의 배열

export async function addAssetsToAlbum(title: string, assets: MediaLibrary.Asset[]) {
  if (!assets?.length) return;

  let album = await MediaLibrary.getAlbumAsync(title);
  const ids = assets.map((a) => a.id);

  if (album) {
    await MediaLibrary.addAssetsToAlbumAsync(ids, album.id ?? album, false);
    return;
  }

  const [first, ...rest] = assets;
  album = await MediaLibrary.createAlbumAsync(title, first.id ?? first, /*copyAsset=*/ false);

  if (rest.length) {
    await MediaLibrary.addAssetsToAlbumAsync(
      rest.map((a) => a.id),
      album.id ?? album,
      false
    );
  }
}
// 권한 보장
async function ensureMediaPermissions() {
  const { status } = await MediaLibrary.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await MediaLibrary.requestPermissionsAsync();
    if (req.status !== 'granted') throw new Error('사진 라이브러리 권한이 필요합니다.');
  }
}

// ── [사용자 설정 저장/로드] ─────────────────────────────────────────────
export async function loadUserExcludedAlbumIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set<string>(JSON.parse(raw));
  } catch (e) {
    console.warn('loadUserExcludedAlbumIds 실패:', e);
    return new Set();
  }
}

export async function saveUserExcludedAlbumIds(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    console.warn('saveUserExcludedAlbumIds 실패:', e);
  }
}

// ── [앨범 유틸] ────────────────────────────────────────────────────────
async function getAllPhotoIdsInAlbumId(albumId: string): Promise<string[]> {
  const ids: string[] = [];
  let after: string | undefined;
  while (true) {
    const page = await MediaLibrary.getAssetsAsync({
      album: albumId,
      first: 200,
      after,
      mediaType: ['photo'],
      sortBy: [['creationTime', false]],
    });
    ids.push(...page.assets.map((a) => a.id));
    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }
  return ids;
}

// 우리가 관리하는(유사/흐릿/채팅/고대비/문서/무객체) 앨범에 들어있는 모든 사진 +
// 사용자가 “제외”로 토글한 앨범의 모든 사진 => 모델 제외 대상 +
// 사용자 정의 앨범(게시된 것만)의 모든 사진
export async function getExcludedAssetIdSet(): Promise<Set<string>> {
  await ensureMediaPermissions();

  // 1) 사용자 제외 앨범
  const userExcluded = await loadUserExcludedAlbumIds();

  // 2) 시스템에 존재하는 모든 앨범 (스마트 앨범 포함)
  const allAlbums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });

  // 2-1) 관리 앨범
  const managed = allAlbums.filter((a) => a.title && MANAGED_ALBUM_TITLES.includes(a.title));

  // 2-2) 사용자 제외로 체크된 앨범
  const userExcludedAlbums = allAlbums.filter((a) => userExcluded.has(a.id));

  // 2-3) 사용자 정의 앨범 (게시된 것만)
  const customMetas = await loadCustomMetas();
  const customTitles = new Set(
    customMetas.filter((m) => m.isUserCreated === true).map((m) => (m.title ?? '').trim())
  );
  const customAlbums = allAlbums.filter((a) => a.title && customTitles.has(a.title.trim()));

  // 3) 제외 대상 앨범들 합치기
  const targetAlbums = [...managed, ...userExcludedAlbums, ...customAlbums];

  if (targetAlbums.length === 0) return new Set();

  const lists = await Promise.all(targetAlbums.map((a) => getAllPhotoIdsInAlbumId(a.id)));
  const out = new Set<string>();
  for (const list of lists) for (const id of list) out.add(id);
  return out;
}
