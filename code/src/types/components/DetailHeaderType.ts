interface DetailHeaderActionType {
  label: string;
  onPress: () => void;
  color?: string;
}

interface DetailHeaderType {
  children: string;
  onPressBack: () => void;
  actions?: DetailHeaderActionType[];
}

export type { DetailHeaderActionType, DetailHeaderType };
