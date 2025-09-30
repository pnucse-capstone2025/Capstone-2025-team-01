import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import { Alert, FlatList, Share, TextInput, TouchableOpacity, View } from 'react-native';
import { Modal, Portal, Text, Divider, ActivityIndicator } from 'react-native-paper';

type Options = {
  selected: Set<string>;
  clearSelection: () => void;
  onCompleted?: (action: 'delete' | 'move' | 'share', count: number) => void;
  customShareHandler?: (assetIds: string[]) => Promise<void>;
};

type AlbumItem = { id: string; title: string; assetCount?: number };

async function ensureMediaPermissions() {
  const { status } = await MediaLibrary.getPermissionsAsync();
  if (status !== 'granted') {
    const req = await MediaLibrary.requestPermissionsAsync();
    if (req.status !== 'granted') throw new Error('사진 라이브러리 권한이 필요합니다.');
  }
}

export function useToolbarActions({
  selected,
  clearSelection,
  onCompleted,
  customShareHandler,
}: Options) {
  const ids = useMemo(() => Array.from(selected), [selected]);
  const guardEmpty = () => ids.length === 0;

  /** 삭제 */
  const deleteSelected = useCallback(async () => {
    if (guardEmpty()) return;
    try {
      await ensureMediaPermissions();
      const ok = await new Promise<boolean>((r) =>
        Alert.alert('삭제', `${ids.length}개 항목을 삭제할까요?`, [
          { text: '취소', style: 'cancel', onPress: () => r(false) },
          { text: '삭제', style: 'destructive', onPress: () => r(true) },
        ])
      );
      if (!ok) return;
      await MediaLibrary.deleteAssetsAsync(ids);
      Alert.alert('완료', `${ids.length}개 항목 삭제 완료`);
      onCompleted?.('delete', ids.length);
      clearSelection();
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '삭제 중 오류가 발생했습니다.');
    }
  }, [ids, clearSelection, onCompleted]);

  /** 공유 */
  const shareSelected = useCallback(async () => {
    if (guardEmpty()) return;
    try {
      await ensureMediaPermissions();
      if (customShareHandler) {
        await customShareHandler(ids);
        onCompleted?.('share', ids.length);
        return;
      }
      const first = await MediaLibrary.getAssetInfoAsync(ids[0]);
      await Share.share({
        url: (first as any).localUri ?? (first as any).uri,
        message: ids.length > 1 ? `${ids.length}개 중 첫 항목을 공유합니다.` : undefined,
      });
      onCompleted?.('share', 1);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '공유 중 오류가 발생했습니다.');
    }
  }, [ids, onCompleted, customShareHandler]);

  /** 이동 실행(타이틀 확정) */
  const moveSelectedTo = useCallback(
    async (targetTitle: string) => {
      if (guardEmpty()) return;
      try {
        await ensureMediaPermissions();
        let album = await MediaLibrary.getAlbumAsync(targetTitle);
        if (!album) {
          const firstInfo = await MediaLibrary.getAssetInfoAsync(ids[0]);
          album = await MediaLibrary.createAlbumAsync(
            targetTitle,
            firstInfo as MediaLibrary.Asset,
            false
          );
          const rest = ids.slice(1);
          if (rest.length) await MediaLibrary.addAssetsToAlbumAsync(rest, album, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync(ids, album, false);
        }
        Alert.alert('완료', `‘${targetTitle}’로 ${ids.length}개 이동 완료`);
        onCompleted?.('move', ids.length);
        clearSelection();
      } catch (e: unknown) {
        Alert.alert('오류', (e as Error)?.message ?? '이동 중 오류가 발생했습니다.');
      }
    },
    [ids, clearSelection, onCompleted]
  );

  // ===== 앨범 선택 모달 =====
  const [pickerOpen, setPickerOpen] = useState(false);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [query, setQuery] = useState('');

  const openMovePicker = useCallback(() => {
    if (guardEmpty()) {
      Alert.alert('안내', '먼저 이동할 사진을 선택해주세요.');
      return;
    }
    setPickerOpen(true);
  }, [guardEmpty]);

  const closeMovePicker = useCallback(() => {
    setPickerOpen(false);
    setCreating(false);
    setNewTitle('');
    setQuery('');
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    (async () => {
      setLoading(true);
      try {
        await ensureMediaPermissions();
        const list = await MediaLibrary.getAlbumsAsync();
        setAlbums(list.map((a) => ({ id: a.id, title: a.title, assetCount: a.assetCount })));
      } finally {
        setLoading(false);
      }
    })();
  }, [pickerOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? albums.filter((a) => a.title?.toLowerCase().includes(q)) : albums;
  }, [albums, query]);

  const handleSelectAlbum = useCallback(
    async (title: string) => {
      closeMovePicker();
      await moveSelectedTo(title);
    },
    [closeMovePicker, moveSelectedTo]
  );

  const handleCreateAndMove = useCallback(async () => {
    const title = newTitle.trim();
    if (!title) {
      Alert.alert('안내', '새 앨범 이름을 입력해주세요.');
      return;
    }
    closeMovePicker();
    await moveSelectedTo(title);
  }, [newTitle, closeMovePicker, moveSelectedTo]);

  const MovePicker = (
    <Portal>
      <Modal
        visible={pickerOpen}
        onDismiss={closeMovePicker}
        contentContainerStyle={{
          margin: 16,
          borderRadius: 12,
          backgroundColor: 'white',
          maxHeight: '76%',
        }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
          <Text variant="titleMedium">이동할 앨범 선택</Text>
        </View>
        <Divider />
        <View style={{ padding: 12, gap: 10 }}>
          <TextInput
            placeholder="앨범 검색"
            value={query}
            onChangeText={setQuery}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          />
          {creating ? (
            <View style={{ gap: 10 }}>
              <Text>새 앨범 이름</Text>
              <TextInput
                placeholder="예: Broom 정리"
                value={newTitle}
                onChangeText={setNewTitle}
                style={{
                  borderWidth: 1,
                  borderColor: '#ddd',
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }}>
                <TouchableOpacity
                  onPress={() => {
                    setCreating(false);
                    setNewTitle('');
                  }}>
                  <Text style={{ color: '#666' }}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateAndMove}>
                  <Text style={{ color: '#007aff', fontWeight: '600' }}>생성 후 이동</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setCreating(true)}>
              <Text style={{ color: '#007aff', fontWeight: '600' }}>+ 새 앨범 생성…</Text>
            </TouchableOpacity>
          )}
        </View>
        <Divider />
        {loading ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>불러오는 중…</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(a) => a.id}
            ItemSeparatorComponent={Divider}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelectAlbum(item.title)}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
                  <Text>
                    {item.title}
                    {typeof item.assetCount === 'number' ? ` (${item.assetCount})` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 16 }}>
                <Text>해당 이름의 앨범이 없습니다.</Text>
              </View>
            }
          />
        )}
      </Modal>
    </Portal>
  );

  return {
    deleteSelected,
    shareSelected,
    openMovePicker,
    MovePicker,
  };
}
