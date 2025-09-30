export type DuplicatePhoto = {
  imageUrl: string;
  dateLabel: string;
};

export type DuplicateGroup = {
  size: string;
  photos: DuplicatePhoto[];
};
