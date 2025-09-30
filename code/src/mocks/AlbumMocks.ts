const AlbumMocks = {
  local: [
    {
      id: '1',
      imageUrl: 'https://picsum.photos/seed/camera1/300/200',
      title: '카메라',
      quantity: 10001,
    },
  ],
  sorted: [
    {
      id: '2',
      title: '중복 사진',
      description: '연속 촬영이나 실수로 여러 번 촬영된 유사 이미지들을 그룹화한다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8C%E1%85%AE%E1%86%BC%E1%84%87%E1%85%A9%E1%86%A8.png',
      quantity: 10,
      path: 'duplicatePhotos',
    },
    {
      id: '3',
      title: '흐릿한 사진',
      description: '초점이 맞지 않거나 모션 블러가 심해 식별이 어려운 사진을 탐지하여 분류한다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%92%E1%85%B3%E1%84%85%E1%85%B5%E1%86%AB.png',
      quantity: 10,
      path: 'blurPhotos',
    },
    {
      id: '4',
      title: '채팅 스크린샷',
      description: '사용자의 채팅 내역을 캡쳐한 사진들을 분류한다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8E%E1%85%A2%E1%84%90%E1%85%B5%E1%86%BC%E1%84%87%E1%85%A1%E1%86%BC.png',
      quantity: 10,
      path: 'chatScreenshots',
    },
    {
      id: '5',
      title: '고대비 사진',
      description:
        '지나치게 어둡거나 밝은 사진들을 분류한다. 플래시가 터진 사진이나 너무 어두운 곳에서 찍은 사진 등이 포함된다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%80%E1%85%A9%E1%84%83%E1%85%A2%E1%84%87%E1%85%B5.png',
      quantity: 10,
      path: 'highContrastPhotos',
    },
    {
      id: '6',
      title: '문서 및 영수증',
      description:
        '이미지 내 과도한 텍스트가 포함되어 있거나 문서 형식이 인식되는 경우 이를 자동으로 식별한다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%8B%E1%85%A7%E1%86%BC%E1%84%89%E1%85%AE%E1%84%8C%E1%85%B3%E1%86%BC.png',
      quantity: 10,
      path: 'documentPhotos',
    },
    {
      id: '7',
      title: '객체 없는 사진',
      description:
        '객체 탐지 알고리즘을 활용해 유의미한 객체가 전혀 탐지되지 않은 사진을 분류한다. 예를 들어, 벽이나 바닥만 찍힌 사진 또는 단색 배경의 사진이 포함된다.',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/albumTypes/%E1%84%80%E1%85%A2%E1%86%A8%E1%84%8E%E1%85%A6+%E1%84%8B%E1%85%A5%E1%86%B9%E1%84%82%E1%85%B3%E1%86%AB.webp',
      quantity: 10,
      path: 'noObjectPhotos',
    },
  ],
  custom: [
    {
      id: '8',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/similar-photo/%E1%84%86%E1%85%B5%E1%84%82%E1%85%B5%E1%84%86%E1%85%B5%E1%84%8D%E1%85%A1%E1%86%BC%E1%84%80%E1%85%AE.jpg',
      title: '짱구',
      quantity: 10,
    },
    {
      id: '9',
      imageUrl:
        'https://broom-pnu.s3.ap-northeast-2.amazonaws.com/sample/blur-photo/%E1%84%89%E1%85%A1%E1%86%AF%E1%84%8D%E1%85%A1%E1%86%A8+%E1%84%92%E1%85%B3%E1%86%AB%E1%84%83%E1%85%B3%E1%86%AF%E1%84%85%E1%85%B5%E1%86%B71.jpg',
      title: '고양이',
      quantity: 20,
    },
  ],
};

export default AlbumMocks;
