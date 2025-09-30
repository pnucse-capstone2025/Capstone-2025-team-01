import PhotoGridScreen from '@/src/components/Screen/PhotoGridScreen';
import { useLocalAlbumData } from '@/src/utils/albumData';
import { useLocalSearchParams } from 'expo-router';

export default function LocalAlbumPage() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const dataSource = useLocalAlbumData(id);

  return (
    <PhotoGridScreen
      title={title ?? '앨범'}
      dataSource={dataSource}
      viewerParams={(index) => ({
        source: 'local',
        path: String(id),
        index: String(index),
        albumId: String(id),
      })}
    />
  );
}
