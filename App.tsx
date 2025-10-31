
import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid'; // For unique IDs
import ImageUploader from './components/ImageUploader';
import GeneratedImageCard from './components/GeneratedImageCard';
import LoadingSpinner from './components/LoadingSpinner';
import { editImage } from './services/geminiService';
import { GeneratedImage } from './types';

function App() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]); // Fix: Removed trailing comma
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentProcessingStep, setCurrentProcessingStep] = useState<string>('');

  const imageTransformations = useCallback(
    async (
      base64Image: string,
      mimeType: string,
      updateGeneratedImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>
    ): Promise<void> => {
      let currentBase64 = base64Image;
      let currentMimeType = mimeType;
      let greenScreenBaseForTpose: string | null = null; // Store the initial green-screened image

      const steps = [
        {
          name: "Green Screen Background",
          description: "Original image with background removed and replaced with a green screen.",
          prompt: "Remove the background from this image and replace it with a solid, bright green screen (hex #00FF00). Ensure the subject is clearly visible.",
          isTposeStep: false,
        },
        {
          name: "Front View (Green Screen)",
          description: "A front view of the subject with a green screen background.",
          prompt: "Generate a clear front view of the person or caricature in this image. The background must be a solid, bright green screen (hex #00FF00). Do not change the pose from the original subject, just the camera angle.",
          isTposeStep: false,
        },
        {
          name: "Side View (Green Screen)",
          description: "A side view of the subject with a green screen background.",
          prompt: "Generate a clear side view of the person or caricature in this image. The background must be a solid, bright green screen (hex #00FF00). Do not change the pose from the original subject, just the camera angle.",
          isTposeStep: false,
        },
        {
          name: "Back View (Green Screen)",
          description: "A back view of the subject with a green screen background.",
          prompt: "Generate a clear back view of the person or caricature in this image. The background must be a solid, bright green screen (hex #00FF00). Do not change the pose from the original subject, just the camera angle.",
          isTposeStep: false,
        },
        {
          name: "T-Pose Front View (Green Screen)",
          description: "The subject in a T-pose, front view, with a green screen background.",
          prompt: "Transform the person or caricature in this image into a standard T-pose (arms outstretched horizontally, palms down, legs together), facing directly front. The background must be a solid, bright green screen (hex #00FF00). Remove any weapons or accessories the subject might be holding.",
          isTposeStep: true,
        },
        {
          name: "T-Pose Side View (Green Screen)",
          description: "The subject in a T-pose, side view, with a green screen background.",
          prompt: "Transform the person or caricature in this image into a standard T-pose (arms outstretched horizontally, palms down, legs together), facing directly side. The background must be a solid, bright green screen (hex #00FF00). Remove any weapons or accessories the subject might be holding.",
          isTposeStep: true,
        },
        {
          name: "T-Pose Back View (Green Screen)",
          description: "The subject in a T-pose, back view, with a green screen background.",
          prompt: "Transform the person or caricature in this image into a standard T-pose (arms outstretched horizontally, palms down, legs together), facing directly back. The background must be a solid, bright green screen (hex #00FF00). Remove any weapons or accessories the subject might be holding.",
          isTposeStep: true,
        },
      ];

      // Step 0: Process the initial green screen background removal.
      setCurrentProcessingStep('Removing background and applying green screen...');
      const greenScreenBase64 = await editImage(base64Image, mimeType, steps[0].prompt);
      updateGeneratedImages(prevImages => [
        ...prevImages,
        {
          id: uuidv4(),
          name: steps[0].name,
          description: steps[0].description,
          src: `data:${mimeType};base64,${greenScreenBase64}`,
        },
      ]);
      greenScreenBaseForTpose = greenScreenBase64; // This is the base for T-pose images
      currentBase64 = greenScreenBase64; // For chaining regular views
      currentMimeType = 'image/png'; // Assume output from background removal might be PNG for transparency

      // Process subsequent views and T-poses
      for (let i = 1; i < steps.length; i++) {
        const step = steps[i];
        setCurrentProcessingStep(`Generating ${step.name}...`);

        let inputImageForStep = currentBase64;
        if (step.isTposeStep && greenScreenBaseForTpose) {
          inputImageForStep = greenScreenBaseForTpose; // Use the initial green-screened image for T-poses
        }

        const editedImageBase64 = await editImage(inputImageForStep, currentMimeType, step.prompt);
        updateGeneratedImages(prevImages => [
          ...prevImages,
          {
            id: uuidv4(),
            name: step.name,
            description: step.description,
            src: `data:${currentMimeType};base64,${editedImageBase64}`,
          },
        ]);
        if (!step.isTposeStep) {
            currentBase64 = editedImageBase64; // Only chain if it's not a T-pose step
        }
      }
    },
    [],
  ); // Empty dependency array as `imageTransformations` itself doesn't depend on external state changing.

  const handleImageSelected = useCallback((file: File) => {
    setOriginalFile(file);
    setError(null);
    setGeneratedImages([]); // Clear previous results immediately upon new file selection
    const reader = new FileReader();
    reader.onloadend = () => {
      setOriginalImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const processImage = useCallback(async () => {
    if (!originalFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]); // Clear previous results at the start of processing as well

    try {
      const reader = new FileReader();
      reader.readAsDataURL(originalFile);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const mimeType = originalFile.type;

        await imageTransformations(base64Data, mimeType, setGeneratedImages); // Pass setGeneratedImages
      };
      reader.onerror = () => {
        throw new Error('Failed to read the image file.');
      };
    } catch (err) {
      console.error("Image processing failed:", err);
      setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
      setCurrentProcessingStep('');
    }
  }, [originalFile, imageTransformations]);

  const handleDownloadAll = useCallback(() => {
    generatedImages.forEach((image) => {
      const link = document.createElement('a');
      link.href = image.src;
      link.download = `${image.name.replace(/\s+/g, '_').toLowerCase()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, [generatedImages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-indigo-100 to-blue-100 p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-indigo-800 sm:text-5xl lg:text-6xl tracking-tight">
          Gemini Image Studio
        </h1>
        <p className="mt-3 text-lg text-gray-700 sm:text-xl max-w-2xl mx-auto">
          Upload an image to transform it into various views and poses with a green screen background.
        </p>
      </header>

      <main className="max-w-6xl mx-auto">
        <section className="mb-10 p-6 bg-white rounded-xl shadow-lg border border-gray-200">
          <ImageUploader
            onImageSelected={handleImageSelected}
            previewUrl={originalImagePreview}
            isLoading={isLoading}
          />
          {originalFile && (
            <div className="mt-6 text-center">
              <button
                onClick={processImage}
                disabled={isLoading}
                className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : 'Start Image Transformations'}
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative my-8" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {generatedImages.length > 0 && (
          <section className="mt-10">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Generated Images</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedImages.map((image) => (
                <GeneratedImageCard key={image.id} image={image} />
              ))}
            </div>
            {!isLoading && ( // Only show download all button if not loading
              <div className="mt-10 text-center">
                <button
                  onClick={handleDownloadAll}
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-200 text-lg"
                >
                  Download All Images
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-center p-6 bg-white rounded-lg shadow-xl flex flex-col items-center max-w-sm mx-auto">
            <LoadingSpinner />
            <p className="mt-4 text-indigo-700 font-bold text-xl">
              {currentProcessingStep || 'Please wait while Gemini generates your images...'}
            </p>
            <p className="text-sm text-indigo-500 mt-2">
              This might take a few moments as multiple images are being generated.
            </p>
          </div>
        </div>
      )}

      <footer className="mt-12 py-6 text-center text-gray-600 text-sm bg-gray-50 rounded-t-xl shadow-inner border-t border-gray-200">
        Powered by Gemini API
      </footer>
    </div>
  );
}

export default App;