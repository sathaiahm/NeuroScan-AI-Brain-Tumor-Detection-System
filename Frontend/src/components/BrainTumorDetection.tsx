import React, { useState, useRef } from 'react';
import { Upload, Brain, AlertCircle, CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import Chatbot from './Chatbot.tsx';

interface PredictionResult {
  classification: number;
  label: string;
  confidence: number;
  prediction_text: string;
  box_class: string;
}

interface AnalysisResponse {
  success: boolean;
  prediction: PredictionResult;
  class_probabilities: Record<string, number>;
  image_base64: string;
  medical_disclaimer: string;
}

const BrainTumorDetection: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = 'http://localhost:8000';

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    setUploadedFile(file);
    setError(null);
    setAnalysisResult(null);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!uploadedFile) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AnalysisResponse = await response.json();
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-10 w-10 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">NeuroScan-AI</h1>
                <p className="text-gray-600">AI-Powered Medical Imaging Analysis</p>
              </div>
            </div>
            <button
              onClick={() => setShowChatbot(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <MessageCircle className="h-5 w-5" />
              <span>Ask AI Doctor</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Upload MRI Scan</h2>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
                }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Drag and drop your MRI scan here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or click to browse files
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {/* File Info */}
            {uploadedFile && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Selected:</strong> {uploadedFile.name}
                </p>
                <p className="text-sm text-gray-500">
                  Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Analyze Button */}
            {uploadedFile && (
              <button
                onClick={analyzeImage}
                disabled={isAnalyzing}
                className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Brain className="h-5 w-5" />
                    <span>Analyze Image</span>
                  </>
                )}
              </button>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analysis Results</h2>

            {analysisResult ? (
              <div className="space-y-6">
                {/* Main Prediction */}
                <div className={`p-6 rounded-lg border-2 ${analysisResult.prediction.box_class === 'tumor-positive'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-green-50 border-green-200'
                  }`}>
                  <div className="flex items-center space-x-3 mb-2">
                    {analysisResult.prediction.box_class === 'tumor-positive' ? (
                      <AlertCircle className="h-8 w-8 text-red-500" />
                    ) : (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    )}
                    <h3 className="text-xl font-semibold">
                      {analysisResult.prediction.prediction_text}
                    </h3>
                  </div>
                  <p className="text-lg font-medium">
                    Confidence: {analysisResult.prediction.confidence.toFixed(1)}%
                  </p>
                </div>

                {/* Class Probabilities */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Detailed Analysis</h4>
                  <div className="space-y-3">
                    {Object.entries(analysisResult.class_probabilities).map(([label, probability]) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{label}</span>
                          <span>{probability.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-500 ${label === analysisResult.prediction.label
                                ? 'bg-blue-600'
                                : 'bg-gray-400'
                              }`}
                            style={{ width: `${probability}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medical Disclaimer */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      {analysisResult.medical_disclaimer}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  Upload an MRI scan to see analysis results here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chatbot Component */}
      <Chatbot
        isOpen={showChatbot}
        onClose={() => setShowChatbot(false)}
        context={analysisResult ? `Current analysis shows: ${analysisResult.prediction.prediction_text} with ${analysisResult.prediction.confidence.toFixed(1)}% confidence.` : undefined}
      />
    </div>
  );
};

export default BrainTumorDetection;
