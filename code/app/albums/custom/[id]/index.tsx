import SectionRow from '@/src/components/common/SectionRow';
import DetailHeader from '@/src/components/Header/DetailHeader';
import { Colors } from '@/src/constants/Colors';
import { useCustomAlbumDetail } from '@/src/hooks/useCustomAlbumDetail';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const ITEM_COUNT = 5;
const OVERLAP = 40;
const H_PADDING = 48;
const AVAILABLE_WIDTH = width - H_PADDING;
const ITEM_WIDTH = (AVAILABLE_WIDTH + OVERLAP * (ITEM_COUNT - 1)) / ITEM_COUNT;
const ITEM_HEIGHT = ITEM_WIDTH * 1.6;

export default function CustomAlbumDetailPage() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ id: string; draft?: string }>();

  const albumId = useMemo(() => (typeof params.id === 'string' ? params.id : ''), [params.id]);
  const isDraft = params?.draft === '1' || params?.draft === 'true';

  const {
    title,
    coverUri,
    thumbUris,
    titleModalVisible,
    setTitleModalVisible,
    editTitleInput,
    setEditTitleInput,
    savingTitle,
    TITLE_MAX,
    onPickCover,
    onOpenEditTitle,
    onSaveTitle,
    onDeleteAlbum,
    onCommitAll,
    onCancelDraftGuard,
    isProcessing,
    canStart,
    renderStatusSectionProps,
  } = useCustomAlbumDetail({ albumId, isDraft, itemCount: ITEM_COUNT });

  const { status, progress, foundCount, start, reset } = renderStatusSectionProps;

  // 화면 전용: 상태 섹션 렌더 (기존 UI 그대로)
  const renderStatusSection = () => (
    <View className="mt-4 px-6">
      <Text className="text-gray-800 text-lg font-semibold">사진 찾기</Text>
      {isProcessing ? (
        <View className="mt-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-gray-600 text-sm">{progress.message}</Text>
            <Text className="text-sm font-medium text-blue-600">
              {(progress.value * 100).toFixed(0)}%
            </Text>
          </View>
          <View className="bg-gray-200 mt-2 h-2 w-full rounded-full">
            <View
              style={{ width: `${progress.value * 100}%` }}
              className="h-2 rounded-full bg-blue-600"
            />
          </View>
        </View>
      ) : (
        <View className="mt-2">
          {status === 'idle' && (
            <Text className="text-gray-500 text-sm">
              시작하려면 최소 10개의 훈련 이미지를 추가하세요.
            </Text>
          )}
          {status === 'completed' && (
            <Text className="text-sm text-green-700">
              완료: {foundCount ?? 0}개의 이미지를 찾았습니다.
            </Text>
          )}
          {status === 'error' && (
            <Text className="text-sm text-red-700">
              탐색 중 오류가 발생했습니다. 다시 시도해주세요.
            </Text>
          )}
        </View>
      )}

      <View className="mt-4 flex-row justify-end gap-3">
        {(status === 'completed' || status === 'error') && (
          <Pressable onPress={reset} className="bg-gray-200 rounded-lg px-4 py-2">
            <Text className="text-gray-700 font-semibold">리셋</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => start()}
          disabled={!canStart}
          style={{ opacity: canStart ? 1 : 0.5 }}
          className="flex-row items-center rounded-lg bg-blue-400 px-4 py-2">
          {isProcessing && <ActivityIndicator size="small" color="white" className="mr-2" />}
          <Text className="font-semibold text-white">
            {isProcessing ? '처리중...' : '분석 시작'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  if (!albumId) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>잘못된 앨범 경로입니다.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <DetailHeader
        onPressBack={() => {
          if (isDraft) onCancelDraftGuard(navigation);
          else navigation.goBack();
        }}
        actions={
          isDraft
            ? [
                { label: '제목 수정', onPress: onOpenEditTitle, color: Colors.primary.black },
                { label: '저장', onPress: onCommitAll, color: '#B3261E' },
              ]
            : [
                { label: '제목 수정', onPress: onOpenEditTitle, color: Colors.primary.black },
                { label: '삭제', onPress: () => onDeleteAlbum(navigation), color: '#B3261E' },
              ]
        }>
        {title || '앨범'}
      </DetailHeader>

      {/* Cover */}
      <View className="mt-6 items-center">
        <Pressable onPress={onPickCover}>
          {coverUri ? (
            <Image source={{ uri: coverUri }} className="bg-gray-100 h-52 w-52 rounded-2xl" />
          ) : (
            <View className="border-gray-300 bg-gray-100 h-52 w-52 items-center justify-center rounded-2xl border-2 border-dashed">
              <Ionicons name="camera-outline" size={48} color="#9CA3AF" />
            </View>
          )}
        </Pressable>
      </View>

      <View className="mt-4 px-6">
        <SectionRow
          title="학습 이미지"
          subtitle="최소 10장 최대 100장을 학습시킬 수 있어요."
          onPress={() =>
            router.push(`/albums/custom/${albumId}/trainImage${isDraft ? '?draft=1' : ''}`)
          }
        />

        {/* Thumbnail strip — 포커스마다 최신순 5장 */}
        {thumbUris.length > 0 && (
          <View className="mt-3 flex-row pl-4">
            {thumbUris.map((uri, index) => (
              <Image
                key={uri + index}
                source={{ uri }}
                style={{
                  width: ITEM_WIDTH,
                  height: ITEM_HEIGHT,
                  marginLeft: index === 0 ? 0 : -OVERLAP,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
      </View>

      {!isDraft && renderStatusSection()}

      {/* Title Modal */}
      <Modal
        visible={titleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTitleModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 items-center justify-center bg-black/40">
          <View className="w-11/12 max-w-md rounded-2xl bg-white p-5 shadow-lg">
            <Text className="text-gray-900 text-lg font-semibold">제목 변경</Text>
            <Text className="text-gray-500 mt-1 text-sm">
              앨범의 새 제목을 입력하세요. (최대 {TITLE_MAX}자)
            </Text>

            <View className="mt-4">
              <TextInput
                value={editTitleInput}
                onChangeText={(t) => {
                  if (t.length <= TITLE_MAX) setEditTitleInput(t);
                }}
                placeholder="새 제목"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSaveTitle}
                className="border-gray-300 text-gray-900 rounded-xl border px-4 py-3 text-base"
              />
              <Text className="text-gray-500 mt-1 text-xs">
                {editTitleInput.trim().length}/{TITLE_MAX}
              </Text>
            </View>

            <View className="mt-5 flex-row justify-end gap-3">
              <Pressable
                onPress={() => setTitleModalVisible(false)}
                className="bg-gray-100 rounded-lg px-4 py-2">
                <Text className="text-gray-700 font-semibold">취소</Text>
              </Pressable>

              <Pressable
                onPress={onSaveTitle}
                className="flex-row items-center rounded-lg bg-blue-600 px-4 py-2">
                {savingTitle && <ActivityIndicator size="small" color="#fff" className="mr-2" />}
                <Text className="font-semibold text-white">저장</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
