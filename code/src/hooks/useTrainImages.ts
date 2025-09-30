import {
  deleteFileIfExists,
  loadDraftTrainPicks,
  loadTrainPicks,
  persistDraftPickedToAppStorage,
  persistPickedToAppStorage,
  Picked,
  saveDraftTrainPicks,
  saveTrainPicks,
} from '@/src/utils/customAlbum';
import { makeFingerprint } from '@/src/utils/fingerprint';
import { upsertFpRecords } from '@/src/utils/fingerprintIndex';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

type Params = {
  albumId: string;
  isDraft: boolean;
  min: number;
  max: number;
};

export function useTrainImages({ albumId, isDraft, min, max }: Params) {
  const [selected, setSelected] = useState<Picked[]>([]);

  // 최초 로드 + 누락된 md5(sig) 보정 저장
  useEffect(() => {
    if (!albumId) return;
    (async () => {
      const picks = isDraft ? await loadDraftTrainPicks(albumId) : await loadTrainPicks(albumId);

      const enriched = await Promise.all(
        picks.map(async (p) => {
          if (p.sig) return p;
          try {
            const info = await FileSystem.getInfoAsync(p.uri, { md5: true });
            return {
              ...p,
              sig:
                info.exists && 'md5' in info
                  ? (info as FileSystem.FileInfo & { md5?: string }).md5
                  : undefined,
            };
          } catch {
            return p;
          }
        })
      );

      setSelected(enriched);

      const changed = enriched.some((p, i) => p.sig !== picks[i]?.sig);
      if (changed) {
        if (isDraft) await saveDraftTrainPicks(albumId, enriched);
        else await saveTrainPicks(albumId, enriched);
      }
    })();
  }, [albumId, isDraft]);

  const data = useMemo<Picked[]>(
    () => [{ id: '__add__', uri: '' } as Picked, ...selected],
    [selected]
  );

  // 추가
  const openPicker = useCallback(async () => {
    if (!albumId) return;

    if (selected.length >= max) {
      Alert.alert('최대 개수 초과', `이미 ${max}장을 선택했습니다.`);
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 0,
      quality: 1,
      exif: true,
      allowsEditing: false,
    });
    if (res.canceled) return;

    try {
      const prev = isDraft ? await loadDraftTrainPicks(albumId) : await loadTrainPicks(albumId);

      const prevFpKeys = new Set(prev.map((p) => p.fpKey).filter(Boolean) as string[]);
      const existingSigs = new Set(selected.map((p) => p.sig).filter(Boolean) as string[]);
      const existingFpKeys = new Set(selected.map((p) => p.fpKey).filter(Boolean) as string[]);

      let remaining = max - selected.length;
      const candidate: Array<{
        asset: ImagePicker.ImagePickerAsset;
        sig?: string;
        fpKey?: string;
        fp?: { md5?: string; size?: number; width?: number; height?: number; takenAt?: string };
      }> = [];

      let skippedDup = 0;
      let skippedOverflow = 0;

      // 1차 선별
      for (const a of res.assets) {
        if (remaining <= 0) {
          skippedOverflow++;
          continue;
        }

        const { md5, size, width, height, takenAt, fpKey } = await makeFingerprint(a);
        const sig = md5;

        const isDup =
          (fpKey && (prevFpKeys.has(fpKey) || existingFpKeys.has(fpKey))) ||
          (sig && existingSigs.has(sig));

        if (isDup) {
          skippedDup++;
          continue;
        }

        candidate.push({ asset: a, sig, fpKey, fp: { md5, size, width, height, takenAt } });
        remaining--;
      }

      if (selected.length === 0 && candidate.length < min) {
        Alert.alert('최소 개수 미달', `처음 추가할 때는 최소 ${min}장을 한 번에 선택해 주세요.`);
        return;
      }
      if (candidate.length === 0) {
        if (skippedDup > 0 || skippedOverflow > 0) {
          const parts = [];
          if (skippedDup > 0) parts.push(`중복 ${skippedDup}장`);
          if (skippedOverflow > 0) parts.push(`최대 초과 ${skippedOverflow}장`);
          Alert.alert('추가되지 않았습니다', parts.join(', ') + ' 제외되었습니다.');
        }
        return;
      }

      // 영구 저장 및 Picked 레코드 구성
      const newPicks: Picked[] = [];
      for (const { asset, sig, fpKey, fp } of candidate) {
        const persisted = isDraft
          ? await persistDraftPickedToAppStorage({
              albumId,
              srcUri: asset.uri,
              fileName: asset.fileName ?? undefined,
              mimeType: asset.mimeType,
            })
          : await persistPickedToAppStorage({
              albumId,
              srcUri: asset.uri,
              fileName: asset.fileName ?? undefined,
              mimeType: asset.mimeType,
            });

        const assetId = (asset as ImagePicker.ImagePickerAsset & { assetId?: string }).assetId as
          | string
          | undefined;

        newPicks.push({
          id: persisted.id,
          uri: persisted.uri,
          sig,
          assetId,
          fpKey,
          size: fp?.size,
          width: fp?.width,
          height: fp?.height,
          takenAt: fp?.takenAt,
        });

        if (sig) existingSigs.add(sig);
        if (fpKey) existingFpKeys.add(fpKey);
      }

      // 저장/머지
      const merged = Array.from(new Map([...selected, ...newPicks].map((p) => [p.id, p])).values());

      if (isDraft) await saveDraftTrainPicks(albumId, merged);
      else await saveTrainPicks(albumId, merged);

      setSelected(merged);

      // 지문 인덱스 upsert
      await upsertFpRecords(
        albumId,
        newPicks
          .filter((p) => !!p.fpKey)
          .map((p) => ({
            fpKey: p.fpKey!,
            uri: p.uri,
            assetId: p.assetId,
            size: p.size,
            width: p.width,
            height: p.height,
            takenAt: p.takenAt,
          }))
      );

      const parts = [`${newPicks.length}장 추가됨`];
      if (skippedDup > 0) parts.push(`중복 ${skippedDup}장 제외`);
      if (skippedOverflow > 0) parts.push(`최대 초과 ${skippedOverflow}장 제외`);
      Alert.alert('추가 결과', parts.join(' · '));
    } catch {
      Alert.alert('오류', '이미지를 저장하는 중 문제가 발생했습니다.');
    }
  }, [albumId, isDraft, max, min, selected]);

  // 삭제(최소 개수 보호)
  const confirmRemove = useCallback(
    (item: Picked) => {
      if (!albumId || item.id === '__add__') return;

      if (selected.length <= min) {
        Alert.alert('삭제 불가', `최소 ${min}장은 유지해야 해요.`);
        return;
      }

      Alert.alert('삭제', '이 이미지를 목록에서 제거할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFileIfExists(item.uri);
            } catch {
              // 무시
            }
            const next = selected.filter((p) => p.id !== item.id);

            if (next.length < min) {
              Alert.alert('삭제 불가', `최소 ${min}장은 유지해야 해요.`);
              return;
            }

            if (isDraft) await saveDraftTrainPicks(albumId, next);
            else await saveTrainPicks(albumId, next);

            setSelected(next);
          },
        },
      ]);
    },
    [albumId, isDraft, min, selected]
  );

  return { selected, data, openPicker, confirmRemove };
}
