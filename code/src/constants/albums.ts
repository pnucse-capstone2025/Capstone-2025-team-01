export type AlbumKey =
  | 'blurPhotos'
  | 'chatScreenshots'
  | 'highContrastPhotos'
  | 'documentPhotos'
  | 'noObjectPhotos'
  | 'similarPhotos';

// 앱에 보여줄 “표시명”(로컬라이즈 가능)
export const ALBUM_TITLES: Record<AlbumKey, string> = {
  blurPhotos: '흐릿한 사진',
  chatScreenshots: '채팅 스크린샷',
  highContrastPhotos: '고대비 사진',
  documentPhotos: '문서 및 영수증',
  noObjectPhotos: '객체 없는 사진',
  similarPhotos: '유사한 사진',
};

// 우리가 “관리하는” 앨범들의 실제 제목 배열
export const MANAGED_ALBUM_TITLES: string[] = Object.values(ALBUM_TITLES);

// 흐릿한 사진 앨범 제목
export const BLUR_ALBUM_TITLE = ALBUM_TITLES.blurPhotos;

// 채팅 스크린샷 앨범 제목
export const CHAT_ALBUM_TITLE = ALBUM_TITLES.chatScreenshots;

// 고대비 사진 앨범 제목
export const HIGHCONT_ALBUM_TITLE = ALBUM_TITLES.highContrastPhotos;

// 문서 및 영수증 앨범 제목
export const DOC_ALBUM_TITLE = ALBUM_TITLES.documentPhotos;

// 객체 없는 사진 앨범 제목
export const NOOBJECT_ALBUM_TITLE = ALBUM_TITLES.noObjectPhotos;

// 유사한 사진 앨범 제목
export const SIMILAR_ALBUM_TITLE = ALBUM_TITLES.similarPhotos;
