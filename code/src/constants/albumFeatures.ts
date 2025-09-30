import { AlbumFeature } from '@/src/types/constants/AlbumFeatureType';

export const ALBUM_FEATURES: AlbumFeature[] = [
  {
    id: 'blurry',
    title: '흐릿한 사진',
    description: '흐릿한 사진을 분류할 수 있어요.\n직접 흐릿한 정도를 결정할 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%92%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB.png',
    path: 'blurPhotos',
  },
  {
    id: 'receipt',
    title: '문서 및 영수증',
    description: '영수증, 문서와 같은 사진을 모을 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8B%E1%85%A7%E1%86%BC%E1%84%89%E1%85%AE%E1%84%8C%E1%85%B3%E1%86%BC.png',
    path: 'documentPhotos',
  },
  {
    id: 'similar',
    title: '유사한 사진',
    description: '유사한 사진을 분류할 수 있어요.\n직접 유사한 정도를 설정할 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8C%E1%85%AE%E1%86%BC%E1%84%87%E1%85%A9%E1%86%A8.png',
    path: 'similarPhotos',
    manageable: true,
    settingsPath: '/albums/settings/similarAlbumSetting',
  },

  {
    id: 'highcontrast',
    title: '고대비 사진',
    description: '고대비 사진을 분류할 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%80%E1%85%A9%E1%84%83%E1%85%A2%E1%84%87%E1%85%B5.png',
    path: 'highContrastPhotos',
  },
  {
    id: 'screenshot',
    title: '채팅 스크린샷',
    description:
      '스크린샷을 자동 분류할 수 있어요.\n채팅, 정보글, SNS 등 용도에 따라 나눌 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8E%E1%85%A2%E1%84%90%E1%85%B5%E1%86%BC%E1%84%87%E1%85%A1%E1%86%BC.png',
    path: 'chatScreenshots',
  },
  {
    id: 'no-object',
    title: '객체 없는 사진',
    description:
      '객체 탐지 알고리즘을 활용해 유의미한 객체가 전혀 탐지되지 않은 사진을 분류할 수 있어요.',
    imageUrl:
      'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%80%E1%85%A2%E1%86%A8%E1%84%8E%E1%85%A6+%E1%84%8B%E1%85%A5%E1%86%B9%E1%84%82%E1%85%B3%E1%86%AB.webp',
    path: 'noObjectPhotos',
  },
];
