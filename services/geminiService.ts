
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { ImagePart } from '../types';

/**
 * Initializes the Gemini API client.
 * NOTE: The API key is assumed to be provided via process.env.API_KEY.
 * It is crucial to instantiate GoogleGenAI right before making an API call
 * to ensure the most up-to-date API key is used, especially after user selection.
 */
const getGeminiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY is not set. Please ensure it's configured.");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * Sends an image and a text prompt to the Gemini 2.5 Flash Image model for editing.
 * @param base64Image The base64 encoded string of the input image.
 * @param mimeType The MIME type of the input image (e.g., 'image/png', 'image/jpeg').
 * @param prompt The text instruction for the image editing.
 * @returns A promise that resolves to the base64 encoded string of the edited image.
 */
export const editImage = async (
  base64Image: string,
  mimeType: string,
  prompt: string,
): Promise<string> => {
  const ai = getGeminiClient(); // Instantiate client right before use

  const imagePart: ImagePart = {
    inlineData: {
      data: base64Image,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: prompt,
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imageDataPart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/'),
    );

    if (imageDataPart && imageDataPart.inlineData) {
      return imageDataPart.inlineData.data;
    } else {
      console.error('Gemini API response did not contain an image part:', response);
      throw new Error('No image found in the Gemini API response.');
    }
  } catch (error) {
    console.error('Error calling Gemini API for image editing:', error);
    throw new Error(`Failed to edit image: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Provides an alternative method for generating images from text only (not directly used for editing in this app,
 * but useful for understanding the model's capabilities).
 * @param prompt The text prompt to generate an image.
 * @returns A promise that resolves to the base64 encoded string of the generated image.
 */
export const generateImageFromText = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient(); // Instantiate client right before use

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Or 'imagen-4.0-generate-001' for higher quality
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const imageDataPart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData?.mimeType?.startsWith('image/'),
    );

    if (imageDataPart && imageDataPart.inlineData) {
      return imageDataPart.inlineData.data;
    } else {
      console.error('Gemini API response did not contain an image part:', response);
      throw new Error('No image found in the Gemini API response.');
    }
  } catch (error) {
    console.error('Error calling Gemini API for image generation:', error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : String(error)}`);
  }
};
