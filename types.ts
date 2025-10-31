
export interface GeneratedImage {
  id: string;
  name: string;
  src: string;
  description: string;
}

export type ImagePart = {
  inlineData: {
    mimeType: string;
    data: string;
  };
};
