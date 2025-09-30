interface ListAlbumType {
  title: string;
  description: string;
  imageUrl: string;
  hasToggle?: boolean;
  onPress: () => void;
  isEnabled: boolean;
  manageable?: boolean;
  settingsPath?: string;
}

export type { ListAlbumType };
