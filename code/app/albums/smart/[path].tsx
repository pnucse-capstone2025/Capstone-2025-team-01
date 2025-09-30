import PhotoGridScreen from '@/src/components/Screen/PhotoGridScreen';
import { ALBUM_TITLES } from '@/src/constants/albums';
import { useSmartAlbumData } from '@/src/utils/albumData';
import { useLocalSearchParams } from 'expo-router';

export default function SmartAlbumPage() {
  const { path } = useLocalSearchParams<{ path?: string }>();
  const title = (path && ALBUM_TITLES[path as keyof typeof ALBUM_TITLES]) || '없는 앨범';
  const dataSource = useSmartAlbumData(path ?? null);

  return (
    <PhotoGridScreen
      title={title}
      dataSource={dataSource}
      viewerParams={(index) => ({ source: 'smart', path: String(path), index: String(index) })}
    />
  );
}
