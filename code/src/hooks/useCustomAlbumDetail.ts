import {
  clearDraftTrain,
  deleteAlbum,
  deleteDraftCoverFileIfExists,
  deleteFileIfExists,
  draftCoverUriKey,
  DraftPicked,
  loadAlbumById,
  loadCoverUri,
  loadDraftCoverUri,
  loadDraftTrainPicks,
  loadTrainPicks,
  publishAlbum,
  renameAlbum,
  saveCoverUri,
  saveDraftCoverUri,
  saveTrainPicks,
} from '@/src/utils/customAlbum';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { getExtensionFromUriOrFilename } from '../utils/file';
import { useCustomAlbumInfer } from './useCustomAlbumInfer';

type Params = { albumId: string; isDraft: boolean; itemCount: number };
type NavGoBackOnly = Pick<NavigationProp<ParamListBase>, 'goBack'>;

export function useCustomAlbumDetail({ albumId, isDraft, itemCount }: Params) {
  const router = useRouter();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [title, setTitle] = useState<string>('');
  const [initialTitle, setInitialTitle] = useState<string>('');
  const [thumbUris, setThumbUris] = useState<string[]>([]);
  const [trainImageCount, setTrainImageCount] = useState(0);

  // 제목 모달
  const [titleModalVisible, setTitleModalVisible] = useState(false);
  const [editTitleInput, setEditTitleInput] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const TITLE_MAX = 40;

  const { status, progress, foundCount, start, reset } = useCustomAlbumInfer(albumId);

  // 포커스 → 데이터 리프레시
  useFocusEffect(
    useCallback(() => {
      if (!albumId) return;
      let cancelled = false;

      const refresh = async () => {
        try {
          const album = await loadAlbumById(albumId);
          if (!cancelled) {
            const t = album?.title ?? '앨범';
            setTitle(t);
            setInitialTitle(t);
          }

          const draftCover = await loadDraftCoverUri(albumId);
          if (!cancelled && draftCover) setCoverUri(draftCover);
          else {
            const uri = await loadCoverUri(albumId);
            if (!cancelled) setCoverUri(uri);
          }

          const picks = isDraft
            ? await loadDraftTrainPicks(albumId)
            : await loadTrainPicks(albumId);
          if (!cancelled) setTrainImageCount(picks.length);

          // 최신순 top N 썸네일
          const withTime = await Promise.all(
            picks.map(async (p: { uri: string }) => {
              try {
                const info = await FileSystem.getInfoAsync(p.uri);
                const mt = info.exists && !info.isDirectory ? (info.modificationTime ?? 0) : 0;
                return { uri: p.uri, mt };
              } catch {
                return { uri: p.uri, mt: 0 };
              }
            })
          );
          withTime.sort((a, b) => b.mt - a.mt);
          if (!cancelled) {
            const topN = withTime.slice(0, itemCount).map((x) => x.uri);
            setThumbUris(topN.reverse());
          }
        } catch {
          if (!cancelled) setThumbUris([]);
        }
      };

      refresh();
      return () => {
        cancelled = true;
      };
    }, [albumId, isDraft, itemCount])
  );

  // 커버 선택
  const onPickCover = useCallback(async () => {
    if (!albumId) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (res.canceled) return;
    const picked = res.assets[0];

    try {
      const dir = FileSystem.documentDirectory + (isDraft ? 'covers_draft' : 'covers');
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const ext = getExtensionFromUriOrFilename(
        picked.uri,
        picked.fileName ?? undefined,
        picked.mimeType ?? undefined
      );
      const dest = `${dir}/${albumId}-${Date.now()}.${ext}`;

      if (isDraft) {
        const prevDraft = await loadDraftCoverUri(albumId);
        if (prevDraft) {
          try {
            await deleteFileIfExists(prevDraft);
          } catch {
            // 삭제 실패해도 무시
          }
        }
        await FileSystem.copyAsync({ from: picked.uri, to: dest });
        await saveDraftCoverUri(albumId, dest);
        setCoverUri(dest);
        return;
      }

      const prev = await loadCoverUri(albumId);
      if (prev) await deleteFileIfExists(prev);

      await FileSystem.copyAsync({ from: picked.uri, to: dest });
      await saveCoverUri(albumId, dest);
      setCoverUri(dest);
    } catch {
      Alert.alert('커버 변경 오류', '새 커버 이미지를 설정할 수 없습니다.');
      setCoverUri(picked.uri);
    }
  }, [albumId, isDraft]);

  // 제목 수정 모달
  const onOpenEditTitle = useCallback(() => {
    setEditTitleInput(title ?? '');
    setTitleModalVisible(true);
  }, [title]);

  const onSaveTitle = useCallback(async () => {
    if (!albumId) return;
    const next = editTitleInput.trim();
    if (!next) {
      Alert.alert('제목을 입력해 주세요.');
      return;
    }
    if (next.length > TITLE_MAX) {
      Alert.alert(`제목은 최대 ${TITLE_MAX}자까지 가능합니다.`);
      return;
    }
    if (next === title) {
      setTitleModalVisible(false);
      return;
    }
    try {
      setSavingTitle(true);
      await renameAlbum(albumId, next);
      setTitle(next);
      setTitleModalVisible(false);
    } catch {
      Alert.alert('저장 실패', '잠시 후 다시 시도해 주세요.');
    } finally {
      setSavingTitle(false);
    }
  }, [albumId, editTitleInput, title]);

  // 삭제
  const onDeleteAlbum = useCallback(
    async (navigation: NavGoBackOnly) => {
      if (!albumId) return;
      Alert.alert(
        '앨범 삭제',
        '이 사용자 정의 앨범을 삭제할까요?\n(사진 원본은 기기에서 삭제되지 않습니다.)',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAlbum(albumId);
                navigation.goBack();
              } catch {
                Alert.alert('삭제 실패', '잠시 후 다시 시도해 주세요.');
              }
            },
          },
        ]
      );
    },
    [albumId]
  );

  // 커밋
  const committingRef = useRef(false);
  const onCommitAll = useCallback(async () => {
    if (!albumId || committingRef.current) return;
    committingRef.current = true;
    try {
      if (title?.trim()) await renameAlbum(albumId, title.trim());

      const draftCover = await loadDraftCoverUri(albumId);
      if (draftCover) {
        const coversDir = FileSystem.documentDirectory + 'covers';
        await FileSystem.makeDirectoryAsync(coversDir, { intermediates: true });
        const ext = draftCover.split('.').pop() ?? 'jpg';
        const finalDest = `${coversDir}/${albumId}-${Date.now()}.${ext}`;
        try {
          await FileSystem.moveAsync({ from: draftCover, to: finalDest });
        } catch {
          await FileSystem.copyAsync({ from: draftCover, to: finalDest });
          try {
            await FileSystem.deleteAsync(draftCover, { idempotent: true });
          } catch {
            // 무시
          }
        }
        await saveCoverUri(albumId, finalDest);
        await AsyncStorage.removeItem(draftCoverUriKey(albumId));
        setCoverUri(finalDest);
      }

      const draftPicks = await loadDraftTrainPicks(albumId);
      if (draftPicks.length > 0) {
        const finalDir = FileSystem.documentDirectory + `train/${albumId}`;
        await FileSystem.makeDirectoryAsync(finalDir, { intermediates: true });

        const moved: DraftPicked[] = [];
        for (const p of draftPicks) {
          const ext = p.uri.split('.').pop() ?? 'jpg';
          const to = `${finalDir}/${p.id}.${ext}`;
          try {
            await FileSystem.moveAsync({ from: p.uri, to });
            moved.push({ ...p, uri: to });
          } catch {
            try {
              await FileSystem.copyAsync({ from: p.uri, to });
              try {
                await FileSystem.deleteAsync(p.uri, { idempotent: true });
              } catch {
                // 무시
              }
              moved.push({ ...p, uri: to });
            } catch {
              // 무시
            }
          }
        }
        await saveTrainPicks(albumId, moved as DraftPicked[]);
        await clearDraftTrain(albumId);
        setTrainImageCount(moved.length);
        setThumbUris(moved.slice(-itemCount).map((x) => x.uri));
      }

      await publishAlbum(albumId);
      Alert.alert('저장됨', '변경사항이 저장되었습니다.');
      router.replace(`/albums/custom/${albumId}`);
    } catch {
      Alert.alert('저장 실패', '변경사항을 저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      committingRef.current = false;
    }
  }, [albumId, title, itemCount]);

  // 드래프트 취소 가드
  const isDirty = useCallback(async () => {
    const titleChanged = (title ?? '').trim() !== (initialTitle ?? '').trim();
    const draftCover = await AsyncStorage.getItem(`broom.draft.coverUri.${albumId}.v1`);
    const hasDraftCover = !!draftCover;
    const raw = await AsyncStorage.getItem(`broom.draft.trainImages.${albumId}.v1`);
    const draftPicks = raw ? (JSON.parse(raw) as DraftPicked[]) : [];
    return titleChanged || hasDraftCover || draftPicks.length > 0;
  }, [albumId, title, initialTitle]);

  const cleanupDraft = useCallback(async () => {
    try {
      await deleteDraftCoverFileIfExists(albumId);
    } catch {
      // 무시
    }
    try {
      await clearDraftTrain(albumId);
    } catch {
      // 무시
    }
    try {
      await deleteAlbum(albumId);
    } catch {
      // 무시
    }
  }, [albumId]);

  const onCancelDraftGuard = useCallback(
    (navigation: NavGoBackOnly) => {
      const poppingRef = { current: false as boolean };
      (async () => {
        const dirty = await isDirty();
        if (!dirty) {
          try {
            await deleteAlbum(albumId);
            await deleteDraftCoverFileIfExists(albumId);
            await clearDraftTrain(albumId);
          } catch {
            // 무시
          }
          if (!poppingRef.current) {
            poppingRef.current = true;
            navigation.goBack();
          }
          return;
        }

        Alert.alert(
          '변경사항이 저장되지 않았습니다',
          '뒤로가면 변경사항이 폐기됩니다. 계속할까요?',
          [
            { text: '계속 편집', style: 'cancel' },
            {
              text: '폐기',
              style: 'destructive',
              onPress: async () => {
                await cleanupDraft();
                if (!poppingRef.current) {
                  poppingRef.current = true;
                  navigation.goBack();
                }
              },
            },
          ]
        );
      })();
    },
    [albumId, cleanupDraft, isDirty]
  );

  const isProcessing = status === 'training' || status === 'inferring';
  const canStart = !isProcessing && trainImageCount >= 10;

  return {
    // state
    title,
    setTitle,
    coverUri,
    thumbUris,
    trainImageCount,

    // title modal
    TITLE_MAX,
    titleModalVisible,
    setTitleModalVisible,
    editTitleInput,
    setEditTitleInput,
    savingTitle,

    // actions
    onPickCover,
    onOpenEditTitle,
    onSaveTitle,
    onDeleteAlbum,
    onCommitAll,
    onCancelDraftGuard,

    // infer section
    isProcessing,
    canStart,
    renderStatusSectionProps: { status, progress, foundCount, start, reset },
  };
}
