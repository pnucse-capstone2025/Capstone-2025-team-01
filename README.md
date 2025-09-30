<img width="200" height="200" alt="logo" src="https://github.com/user-attachments/assets/9035e828-d151-421f-9cbb-6c32c3dd149a" />

# 컴퓨터 비전 기반의 개인 맞춤형 사진 관리 서비스 Broom

## 1. 프로젝트 배경
### 1.1. 국내외 시장 현황 및 문제점
스마트폰의 보급과 카메라 성능의 고도화로 개인이 생산 및 보유하는 사진의 규모가 급격히 확대되고 있다. 클라우드 스토리지의 보편화는 저장 장벽을 낮추어 촬영과 보관을 더욱 가속화하고 있다. 그러나 정리 기능은 이에 비해 여전히 사용자에게 부담스러운 문제로 남아있다. 이로 인해 흐린 이미지와 같은 품질이 낮은 이미지와 연사에 따른 유사 이미지가 누적되는 문제가 발생한다. 그 결과 원하는 사진을 신속히 탐색하기 어려워지고 관리 피로도가 증가하며 저장 공간의 비효율이 심화되고 있다.

기존 상용 사진 관리 서비스는 인물·장소·시간 등 메타데이터 중심의 자동 분류와 일부 기초 수준의 정리 제안을 제공하나, 사용자 개인의 취향과 맥락을 반영하는 정밀 개인화 수준에는 한계가 존재한다. 일률적 기준의 '베스트 샷' 추천은 개별 사용자의 선호를 충분히 반영하지 못하며 국내 사용자에게 빈번한 카카오톡 대화 캡처나 영수증·문서 촬영과 같은 활용 맥락을 삭제 대상으로만 간주하는 등 맥락적 처리에도 한계가 있다. 이로 인해 실제 사용 경험과 시스템의 정리 결과 사이에 괴리가 발생한다.

또한 네트워크 지연과 서버 의존 비용, 개인정보 전송에 대한 우려는 클라우드 중심 처리 방식의 한계를 드러낸다. 모바일 환경에서의 즉시성과 프라이버시 보호, 운영 비용 효율성을 동시에 확보하기 위해서는 온디바이스 기반의 지능형 사진 정리 기술이 요구된다.

### 1.2. 필요성과 기대효과
#### 필요성
- 메타데이터 중심의 획일적 정리는 개인의 취향·의도·맥락을 반영하지 못하므로 품질·내용 기반의 정밀 분석과 개인 맞춤형 분류가 필요하다.
- 네트워크 지연, 서버 비용, 개인정보 전송 우려가 존재하므로 온디바이스 추론을 통해 즉시성·비용 효율·프라이버시를 동시에 충족할 필요가 있다.
- 국내 사용자에게 빈번한 채팅 캡처·영수증 촬영 등 맥락적 이미지를 적절히 처리하기 위해 국내 사용 행태를 반영한 클래스 정의와 임계값 정책이 요구된다.
- 대규모 사진 라이브러리에서도 일관된 경험을 제공하기 위해 임베딩 기반 유사도·경량 클러스터링·워커 풀 병렬 처리를 통한 처리 성능 확보가 필요하다.

#### 기대효과
- **불필요 이미지 자동 정리**: 흐릿한 사진, 중복·유사 이미지 등 품질이 낮은 사진을 자동 탐지·정리하여 갤러리를 체계적으로 관리할 수 있다.
- **개인 맞춤형 폴더 생성**: 소수의 예시 이미지를 활용해 특징 벡터와 대표 벡터를 구성하고 유사도 기반 선별·그룹화를 수행함으로써 사용자가 원하는 주제의 폴더를 손쉽게 생성·유지할 수 있다.
- **즉시성·프라이버시·비용 효율**: 온디바이스 추론으로 불안정한 네트워크 환경에서도 즉각적인 결과를 제공하고, 원본 사진의 외부 전송 없이 개인정보 보호를 강화하며 서버 연산·트래픽 비용을 절감할 수 있다.
- **국내 사용 맥락 적합성**: 채팅 캡처·영수증 등 국내 특유의 사용 패턴을 반영한 분류·정리를 통해 실사용 행태와 부합하는 결과를 제공할 수 있다.
- **대규모 데이터 대응성**: 임베딩 기반 유사도 계산, 경량 클러스터링, 워커 풀 병렬 처리 적용으로, 대규모 사진 라이브러리에서도 안정적인 처리량과 일관된 사용자 경험을 제공할 수 있다.

## 2. 개발 목표
### 2.1. 목표 및 세부 내용
온디바이스 컴퓨터 비전 기술을 기반으로 대규모 모바일 사진 라이브러리를 자동 정리·개인 맞춤 분류까지 수행하는 통합 사진 관리 서비스를 구현한다. 사용자는 최소한의 조작으로 갤러리를 깔끔하게 유지하고, 자신의 취향과 맥락을 반영한 사용자 정의 폴더를 지속적으로 운영할 수 있도록 한다.

#### (1) 지능형 이미지 필터링
사진의 품질과 내용을 정량적으로 분석하여 불필요한 이미지를 자동으로 분류하고 정리하는 것을 목표로 한다. 이를 위해 '흐릿한 사진(Blur)', '채팅 스크린샷(Chat)', '문서(Document)', '고대비 사진(HighContrast)', '객체 없는 사진(NoObject)' 5개의 특정 클래스를 정의하고, 전이 학습으로 최적화된 단일 통합 분류 모델(Unified Model)을 개발한다. 이 모델은 모바일 환경에 최적화된 TensorFlow Lite 형식으로 배포되어 기기 내에서 직접 추론을 수행한다.

#### (2) 유사 이미지 군집화
MobileNet을 특징 추출기로 사용하여 갤러리 내 모든 이미지의 고유한 시각적 특징을 숫자로 이루어진 특징 벡터로 변환한다. 이후, 모든 이미지 쌍에 대해 코사인 유사도를 계산하여 두 이미지가 얼마나 유사한지를 나타내는 유사도 행렬을 생성하여 이를 바탕으로 DSU 알고리즘을 적용하여 이미지들을 빠른 속도로 군집화한다.

#### (3) 사용자 주도형 맞춤 분류
사용자가 직접 제공한 소수의 예시 이미지를 기반으로 유사한 사진들을 자동으로 선별하고 그룹화하는 개인 맞춤형 정리 기능을 구현하는 것을 목표로 한다. 이 기능은 퓨샷 러닝(Few-shot Learning) 개념을 적용하여, MobileNet 기반의 특징 추출기로 이미지의 특징 벡터를 생성하고 학습 이미지들의 대표 벡터를 계산하여 분류 기준으로 사용한다. 이를 통해 사용자는 '고양이 사진', '특정 캐릭터' 등 자신만의 기준으로 앨범을 생성할 수 있다.

#### (4) 통합 모바일 애플리케이션 서비스 개발
앞서 언급한 핵심 기능들을 통합하고 대규모 이미지 처리를 위한 워커 풀(Worker Pool) 기반의 병렬 처리 아키텍처를 적용하여 모바일 환경에서의 성능을 최적화한다. 최종적으로 사용자 친화적인 UI를 통해 정리 결과를 직관적으로 제공하고 관리할 수 있는 완성된 형태의 사진 정리 애플리케이션을 출시하는 것을 최종 목표로 한다.

### 2.2. 기존 서비스 대비 차별성 
#### (1) 처리 위치와 프라이버시
기존 서비스는 클라우드 기반 분석에 의존하는 경우가 많아 네트워크 품질에 의존하는 문제와 개인정보 전송 리스크가 존재한다. 이에 비해 완전 온디바이스 추론을 채택하여 네트워크 없이도 즉시 동작하며 원본 사진의 외부 전송을 차단함으로써 프라이버시를 구조적으로 보호한다.

#### (2) 개인화 방식
기존 서비스는 사전 정의 태그나 메타데이터 중심 분류에 머물러 있어 사용자 개인 취향의 반영이 제한적이다. 이에 대해 소수의 예시 이미지를 이용하여 사용자가 원하는 주제를 맞춤 폴더로 관리한다.

#### (3) 성능·운영 효율
기존 서비스는 서버 추론·전송 비용과 지연의 영향을 크게 받는다. 이에 비해 워커 풀 병렬화, 배치/증분 추론, 임베딩 캐시를 적용하여 대용량에서도 체감 성능을 유지하고 서버 의존을 최소화해 운영 비용을 줄인다.

### 2.3. 사회적 가치 도입 계획 
#### (1) 공공성·디지털 웰빙
과잉 사진 누적으로 인한 탐색 피로와 디지털 저장 강박을 완화하기 위해 정리 자동화와 가역적 UX를 제공하여 안전한 정리 습관을 확산한다. 앱 내 디지털 위생 가이드를 통해 정리 주기, 백업 권장, 중복 최소화 방법을 안내한다.

#### (2) 프라이버시-우선(Default Private) 설계
원본 사진과 임베딩의 외부 전송을 금지하고 온디바이스 추론과 최소 권한 정책을 기본값으로 적용한다.

#### (3) 지속 가능성·환경 보호
클라우드 전송과 서버 추론을 최소화하여 네트워크 트래픽과 데이터센터 사용을 줄인다. 워커 풀·증분 스캔·전력·발열 인지 스케줄링을 통해 단말 전력 소모를 낮추고, 경량 모델로 구형 기기 호환성을 유지하여 전자폐기물 발생을 완화한다.

## 3. 시스템 설계
### 3.1. 시스템 구성도

<img width="1576" height="678" alt="image" src="https://github.com/user-attachments/assets/2c06fd72-0b52-438e-a9b2-d919c704a3ce" />

#### 구성 요소
- **MobileNet**: 사용자 이미지로부터 고정 길이 Feature Vector를 생성한다.
- **Unified Model**: Head Training과 Fine-Tuning을 거쳐 Blur, Chat, Document, HighContrast, NoObject의 5개 클래스를 단일 모델로 분류한다.
- **Similar Clustering**: 특징 벡터를 추출한 뒤 코사인 유사도를 계산하여 유사한 사진을 클러스터링한다.
- **Custom Album**: 사용자가 제공한 예시 이미지의 대표 벡터를 나머지 이미지들과 비교하여 예시 이미지와 유사한 이미지를 찾아낸다.
- **Worker Pool**: 모바일 환경에서 다량 이미지를 배치 단위로 병렬 처리하여 체감 성능을 확보한다.

#### 데이터 흐름(단말 내부 처리 절차)

1. 특징 추출: 사용자 갤러리 이미지가 MobileNet을 통해 Feature Vector로 변환된다.

2. 유사 군집화 분기<br/>
  (a) 유사도 계산: 모든 이미지 쌍에 대해 코사인 유사도를 계산하여 유사도 행렬을 만든다.<br/>
  (b) 클러스터링: DSU(Disjoint Set Union) 알고리즘으로 유사 이미지들을 하나의 그룹으로 묶는다.<br/>
  (c) 후처리 필터: group size ≥ 2이면서 코사인 유사도가 임계값 이상인 그룹만 유지한다.<br/>
  (d) 결과 생성: 그룹화된 이미지들을 유사한 이미지 폴더로 이동한다.

3. 통합 분류 분기<br/>
  (a) 신뢰도 산출: 각 클래스에 대한 신뢰도를 계산한다.<br/>
  (b) 최고 점수 선택: 가장 높은 신뢰도 클래스를 선택한다.<br/>
  (c) 신뢰도 필터 적용: 최고 점수가 임계값 이상일 때 해당 클래스로 확정한다.<br/>
  (d) 앨범 반영: 최종 라벨에 따라 Unified Classification 결과를 생성한다.

5. 사용자 정의 앨범 분기<br/>
  (a) 대표 벡터 계산: 사용자가 제공한 Train Image의 임베딩 평균을 Representative Vector로 설정한다.<br/>
  (b) 유사도 비교: 전체 이미지의 특징 벡터를 대표 벡터와 비교하여 코사인 유사도를 계산한다.<br/>
  (c) 임계값 적용: 코사인 유사도가 임계값 이상인 이미지만 선별한다.<br/>
  (d) 앨범 생성: 조건을 충족한 이미지를 사용자 정의 앨범으로 이동한다.


### 3.2. 사용 기술
| 분류 | 기술 |
|---|---|
| Programming Language | ![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) |
| DL Framework | ![TensorFlow](https://img.shields.io/badge/TensorFlow-FF6F00?logo=tensorflow&logoColor=white) ![Keras](https://img.shields.io/badge/Keras-D00000?logo=keras&logoColor=white) |
| Base Model Architecture | ![MobileNetV2](https://img.shields.io/badge/MobileNetV2-009688?logo=google&logoColor=white) |
| Data Processing | ![NumPy](https://img.shields.io/badge/NumPy-013243?logo=numpy&logoColor=white) |
| On-device AI | ![TensorFlow Lite](https://img.shields.io/badge/TensorFlow%20Lite-425066?logo=tensorflow&logoColor=white) ![MobileNet](https://img.shields.io/badge/MobileNet-00BCD4?logo=google&logoColor=white) |
| Frontend | ![React Native](https://img.shields.io/badge/React%20Native-20232A?logo=react&logoColor=61DAFB) ![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white) ![NativeWind](https://img.shields.io/badge/NativeWind-38B2AC?logo=tailwindcss&logoColor=white) |
| Mobile Build/Distribution | ![Expo EAS](https://img.shields.io/badge/Expo%20EAS-000020?logo=expo&logoColor=white) ![Dev Client](https://img.shields.io/badge/Dev%20Client-4630EB?logo=expo&logoColor=white) |

## 4. 개발 결과
### 4.1. 전체 시스템 흐름도
<img width="1163" height="681" alt="이미지 관련 처리" src="https://github.com/user-attachments/assets/e442895e-7828-43a4-8369-ace8bfe1c23d" />
사용자가 앱에서 사진 접근 권한을 허용하면, 기기 내 TensorFlow Lite 엔진이 이미지를 분석하여 자동 정리 앨범(흐릿한 사진, 문서 및 영수증, 중복, 고대비, 채팅 스크린샷, 객체 없음)을 생성·갱신하고, 사용자가 예시 이미지를 제공한 경우 맞춤 기준에 따라 사용자 정의 앨범(예: 강아지, 음식)을 동적으로 구성한다. 모든 추론과 분류는 온디바이스에서 수행되어 네트워크 없이 즉시 반영되며 개인정보가 외부로 전송되지 않는다.

### 4.2. 기능 설명 및 주요 기능 명세서
#### (1) 통합 분류(Unified Classification)
<img width="1957" height="881" alt="image" src="https://github.com/user-attachments/assets/6e955e49-fd74-465a-9075-edf0577ccc00" />

- **목적**: 갤러리 이미지를 Blur / Chat / Document / HighContrast / NoObject 5개 클래스에 해당하는지 판단하여 폴더별로 정리한다.
- **입력**: 이미지 파일, 전처리 규격, 클래스별 임계값 테이블.
- **처리 파이프라인**<br/>
  (a) 전이 학습 기반 MobileNet 백본에 대해 2단계 훈련(Head Training → Fine-Tuning)으로 통합 분류기를 학습한다.<br/>
  (b) 온디바이스 TFLite 모델로 추론하여 클래스별 Confidence Scores 산출한다.<br/>
  (c) Top-1 클래스를 선택하고, 해당 점수가 클래스별 임계값을 넘을 때만 확정한다.
- **출력**: 확정 라벨, 신뢰도
- **결과**
<img width="512" height="430" alt="image" src="https://github.com/user-attachments/assets/c1b4a0dd-4a5c-4269-a212-80191dd9dfe3" />

#### (2) 유사·중복 사진 군집화(Similar Clustering)
<img width="1917" height="257" alt="image" src="https://github.com/user-attachments/assets/571942fb-edbd-4adc-8c89-7081dc327697" />

- **목적**: 연사 촬영 또는 중복 저장 등으로 발생한 유사 사진을 자동으로 묶어 일괄적으로 정리한다.
- **입력**: 갤러리 이미지들, 그룹 최소 크기, 유사도 임계값.
- **처리 파이프라인**<br/>
  (a) MobileNet으로 각 사진의 Feature Vector를 추출한다.<br/>
  (b) 모든 사진 쌍의 코사인 유사도 행렬을 계산한다.<br/>
  (c) DSU 알고리즘으로 연결 성분을 형성해 군집을 만든다.<br/>
  (d) 그룹의 크기가 2 이상이고 유사도가 임계값 이상인 군집만 유지한다.
- **출력**: 클러스터링 결과로 그룹별 묶음 목록(예: group1, group2, …)을 제공한다.
- **결과**
<img width="512" height="306" alt="image" src="https://github.com/user-attachments/assets/dbb5f961-777e-4410-8fe8-06dda90ffab6" />

#### (3) 사용자 정의 앨범 생성(Few-shot Personalization)
<img width="1969" height="264" alt="image" src="https://github.com/user-attachments/assets/8f31267d-656a-4f25-a5e7-63ee7b637bc8" />

- **목적**: 사용자가 제공한 소수의 예시 이미지를 바탕으로 갤러리 전역에서 예시 이미지와 유사한 사진을 선별한다.
- **입력**: 예시 이미지 집합, 갤러리 이미지들, 유사도 임계값.
- **처리 파이프라인**<br/>
  (a) MobileNet으로 모든 이미지의 특징 벡터를 추출한다.<br/>
  (b) 예시 이미지 임베딩의 평균을 대표 벡터로 계산한다.<br/>
  (c) 각 사진의 임베딩과 대표 벡터 간 코사인 유사도를 계산한다.<br/>
  (d) 유사도가 임계값 이상인 사진만 선별한다.
- **출력**: 사용자 정의 앨범(예: “캐릭터”, “고양이”)에 선별 사진 목록이 추가/이동된다.
- **결과**
<img width="512" height="474" alt="image" src="https://github.com/user-attachments/assets/72c80356-d41e-4046-8355-408917854923" />

### 4.3. 디렉토리 구조
```
BROOM/
├─ app/                 # 화면/라우팅
├─ src/
|  ├─ assets/
│  |  ├─ fonts/         # 앱 폰트 파일
│  |  ├─ images/        # 아이콘/일러스트
│  |  └─ models/        # 온디바이스 AI 관련 코드
│  ├─ components/       # 재사용 UI 컴포넌트
│  ├─ hooks/            # 기능 단위 커스텀 훅
│  ├─ utils/            # 순수 유틸
│  ├─ constants/        # 상수
│  ├─ state/            # 전역 상태와 스토어, 타입
│  ├─ types/            # 도메인 타입/인터페이스 정의
│  └─ mocks/            # 목 데이터
├─ android/             # 네이티브(Android) 프로젝트(Dev Client/릴리스)
│
├─ .gitignore
├─ app.json
├─ babel.config.js
├─ eas.json
├─ eslint.config.mjs
├─ expo-env.d.ts
├─ global.css
├─ metro.config.js
├─ nativewind-env.d.ts
├─ package.json
├─ package-lock.json
├─ prettier.config.js
├─ README.md
├─ tailwind.config.js
└─ tsconfig.json
```

### 4.4. 산업체 멘토링 의견 및 반영 사항
#### (1) 멘토 의견 요약
- TensorFlow Lite 기반 경량화 모델로 모바일에서의 빠른 응답성을 확보한 점은 긍정적이다.
- 모델 학습 단계의 서버 부하 관리와 안드로이드 기종별 성능 최적화를 추가로 고려하면 앱 품질이 향상된다.
- 상용화 가능성이 높으나, 사용자 관점의 UI/UX 보완과 실사용 환경에서의 장기 성능 검증이 필요하다.

#### (2) 반영 사항
- 서버 부하/운영 부담 최소화(온디바이스 일원화)
  - 모든 추론·의사결정을 온디바이스로 수행하여 런타임에 서버 호출이나 데이터 업로드가 발생하지 않도록 했다.<br/>
  - 분류 임계값·제외 앨범 등 정책은 로컬 설정 파일(JSON) 로 관리하여 서버 배포 없이도 앱 내에서 즉시 적용되도록 했다.
- 안드로이드 기종별 성능 대응
  - 워커 풀 기반 병렬 처리와 배치 추론을 적용하여 중저가 기기에서도 처리량을 확보했다.
- UI/UX 보완
  - **분류 진행률 가시화**: 모델 분류가 진행되는 동안 퍼센트(%) 진행률을 표시하여 사용자가 처리 상태를 즉시 파악할 수 있도록 하였다.
  - **즉시 조정 가능한 설정**: 임계값 슬라이더와 제외 앨범/예외 규칙을 설정 화면에서 즉시 적용되도록 구성하여, 재실행 없이 결과를 곧바로 반영하도록 UI를 단순화하였다.
  - **앨범 페이지 재설계**: 앨범 페이지에서 정리된 각 앨범(Blur/Chat/Document/HighContrast/NoObject 및 맞춤 앨범)을 카드형으로 한눈에 확인할 수 있게 배치하고, 앨범별 항목 수를 함께 표시하여 탐색 효율을 높였다.

## 5. 설치 및 실행 방법
### 5.1. 설치절차 및 실행 방법
#### 사전 준비
1. Node.js 18 LTS 이상, npm
2. JDK 17, Android Studio(Platform SDK 34+, build-tools 34.x, platform-tools)
3. 환경 변수 설정
   - JAVA_HOME = JDK 경로
   - ANDROID_HOME = ~/Library/Android/sdk(mac) 또는 %LOCALAPPDATA%\Android\Sdk(Win)
   - PATH에 $ANDROID_HOME/platform-tools 추가

#### 의존성 설치
```bash
# 프로젝트 루트
npm install   # 또는 npm ci
```

#### 개발용 실행
```bash
# 1) 최초 1회: 기기/에뮬레이터에 Dev Client 설치
npm run android          # = npx expo run:android

# 2) 메트로 서버 실행(Dev Client 모드)
npm run start            # = expo start --dev-client
```

### 5.2. 오류 발생 시 해결 방법
#### (1) SDK location not found / ANDROID_HOME 관련 에러
- 원인: Android SDK 경로 미설정.
- 조치: ANDROID_HOME 설정 후 터미널 재시작, Android Studio에서 SDK 34+와 build-tools 34.x 설치.

#### (2) Metro 연결 실패 / “Unable to load script”
- 원인: Metro 미기동 또는 기기 ↔ PC 연결 문제.
- 조치
```bash
# Metro 재시작
expo start --dev-client -c
```

## 6. 소개 자료 및 시연 영상
### 6.1. 프로젝트 소개 자료
- [포스터](https://github.com/user-attachments/files/22616631/2025._01_Broom.pdf)
- [발표자료](https://github.com/user-attachments/files/22616655/Broom_.pdf)

### 6.2. 시연 영상
[![Broom 시연 영상](<http://img.youtube.com/vi/Uou5iwWqTDA/0.jpg>)](<https://youtu.be/Uou5iwWqTDA>)

## 7. 팀 구성
### 7.1. 팀원별 소개 및 역할 분담
| 이름 | 프로필 | 소개 | 역할 |
|---|:---:|---|---|
| 조수영 | <a href="https://github.com/suyoungee"><img src="https://github.com/suyoungee.png" width="100" alt="조수영"/></a><br/>[@suyoungee](https://github.com/suyoungee) | ML Engineer | 전체 이미지 분류 모델 개발 및 이미지 추론 기능 구현 |
| 이서연 | <a href="https://github.com/yeonddori"><img src="https://github.com/yeonddori.png" width="100" alt="이서연"/></a><br/>[@yeonddori](https://github.com/yeonddori) | Fronted Developer | 온디바이스 AI 모델 연결<br/>사용자 인터페이스 디자인 및 기능 구현 |
| 정지민 | <a href="https://github.com/stopmin"><img src="https://github.com/stopmin.png" width="100" alt="정지민"/></a><br/>[@stopmin](https://github.com/stopmin) | ML Engineer<br/>Frontend Developer | 온디바이스 AI 모델 개발 및 모델 연결<br/>사용자 인터페이스 디자인 및 기능 구현|

### 7.2. 팀원 별 참여 후기
| 이름 | 프로필 | 참여 후기 |
|---|:---:|---|
| 조&#8288;수&#8288;영 | <a href="https://github.com/suyoungee"><img src="https://github.com/suyoungee.png" width="100" alt="조수영"/></a><br/>[@suyoungee](https://github.com/suyoungee) | 분류 모델을 학습시키는 과정에서 양질의 데이터를 선별 및 분류하는 과정과 데이터 불균형 문제를 해결하는 것이 핵심 과제였습니다. 문제를 해결하는 과정 속에서 하이퍼 파라미터를 다루는 방식이나 데이터 증강 기법에 대해 더 깊은 이해를 할 수 있었습니다. 또한 온디바이스 AI 기술을 접목함으로써 모델 경량화에 대한 지식을 쌓을 수 있어서 좋은 경험이 되었습니다. |
| 이&#8288;서&#8288;연 | <a href="https://github.com/yeonddori"><img src="https://github.com/yeonddori.png" width="100" alt="이서연"/></a><br/>[@yeonddori](https://github.com/yeonddori) | 본격적인 앱 개발, 온디바이스 추론, 내부 파일 관리를 처음 시도하며 작은 실험을 거듭했습니다. 그 과정에서 모바일은 자원·권한·수명주기 제약을 우선 고려해야 한다는 점을 몸으로 배웠고, 테스트를 반복하면서 모델 성능 못지않게 UI 반응성과 자원 관리가 사용자 경험을 좌우한다는 사실도 확실히 체감했습니다. 도전의 연속이었지만, 이번 프로젝트로 온디바이스 AI와 앱 아키텍처의 기본기를 탄탄히 다질 수 있었습니다. |
| 정&#8288;지&#8288;민 | <a href="https://github.com/stopmin"><img src="https://github.com/stopmin.png" width="100" alt="정지민"/></a><br/>[@stopmin](https://github.com/stopmin) |  초기 백엔드 서버 구축 계획에서 온디바이스(On-Device) 구현으로 방향을 전환하며 React Native와 Document Detector 기능을 구현했습니다. React Native 개발 과정에서 비동기 처리, 권한 관리, 생명주기 등 모바일 환경의 특수성과 기기별 성능 차이를 깊이 체감했습니다. 또한, ML 기반의 문서 감지 기능을 접목하며 학습 데이터의 품질과 선별이 모델 성능의 핵심임을 깨달았습니다. 수많은 기술적 난관을 팀원들과 해결하며 모바일 앱 아키텍처와 온디바이스 환경의 기본기를 단단히 다질 수 있었습니다.|

## 8. 참고 문헌 및 출처
[1] X. Wang, Z. Tang, J. Guo, T. Meng, C. Wang, T. Wang, and W. Jia, "Empowering Edge Intelligence: A Comprehensive Survey on On-Device AI Models," arXiv preprint arXiv:2503.06027, 2025.

[2] A. G. Howard, M. Zhu, B. Chen, D. Kalenichenko, W. Wang, T. Weyand, M. Andreetto, and H. Adam, "MobileNets: Efficient Convolutional Neural Networks for Mobile Vision Applications," arXiv preprint, 2017.

[3] M. Goyal, R. S. Munjal, S. Moharana, D. Garg, D. P. Mohanty, and S. P. Thota, "ScreenSeg: On-Device Screenshot Layout Analysis," arXiv preprint, 2021.

[4] S. Lonn, P. Radeva, and M. Dimiccoli, "Smartphone Picture Organization: A Hierarchical Approach," arXiv preprint arXiv:1803.05940, Sep. 2019.

[5] A. Fraga Pérez and M. A. Forti Buratti, "New habits in smartphones photo management," adComunica. Revista Científica de Estrategias, Tendencias e Innovación en Comunicación, No. 13, pp. 135–156, 2017.
