
import React from 'react';
import { GeneratedImage } from '../types';

interface GeneratedImageCardProps {
  image: GeneratedImage;
}

const GeneratedImageCard: React.FC<GeneratedImageCardProps> = ({ image }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.src;
    link.download = `${image.name.replace(/\s+/g, '_').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="w-full h-48 bg-gray-50 flex items-center justify-center p-2">
        <img src={image.src} alt={image.name} className="max-w-full max-h-full object-contain" />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg text-gray-800 mb-2">{image.name}</h3>
        <p className="text-sm text-gray-600 mb-4">{image.description}</p>
        <button
          onClick={handleDownload}
          className="w-full px-4 py-2 bg-indigo-500 text-white font-medium rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 text-sm"
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default GeneratedImageCard;
