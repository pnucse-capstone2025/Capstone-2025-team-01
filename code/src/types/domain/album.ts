import type * as MediaLibrary from 'expo-media-library';

export interface UIAlbum {
  id: string;
  imageUrl?: string;
  title: string;
  quantity: number;
  _album?: MediaLibrary.Album;
}

export interface UICustomAlbum {
  id: string;
  title: string;
  quantity: number;
  imageUrl?: string | null;
  libraryAlbumId?: string;
}
