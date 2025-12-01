from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Flatten, Input
from tensorflow.keras.applications import VGG16
from tensorflow.keras.optimizers import Adam
from PIL import Image, ImageEnhance
import io
import base64
import logging
from typing import Dict, List
import uvicorn
import os
from pathlib import Path

from pydantic import BaseModel
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Brain Tumor Detection API",
    description="AI-powered brain tumor detection with LLM chatbot integration",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
IMAGE_SIZE = 128
UNIQUE_LABELS = ['glioma', 'meningioma', 'notumor', 'pituitary']
LABEL_MAPPING = {
    0: 'glioma',
    1: 'meningioma', 
    2: 'notumor',
    3: 'pituitary'
}

# Global model variable
model = None

# Gemini configuration
from dotenv import load_dotenv
load_dotenv()
import google.generativeai as genai

# Initialize Gemini client
# Initialize Gemini client
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    logger.info("Gemini API key found. Configuring client...")
    try:
        genai.configure(api_key=api_key)
        model_gemini = genai.GenerativeModel('models/gemini-2.5-flash')
        logger.info("Gemini model initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Gemini model: {e}")
        model_gemini = None
else:
    logger.warning("GEMINI_API_KEY not found in environment variables.")
    model_gemini = None

class ChatRequest(BaseModel):
    message: str
    context: str = ""

class ChatResponse(BaseModel):
    response: str
    timestamp: str

def get_medical_chatbot_response(user_message: str, context: str = "") -> str:
    """Generate medical chatbot response using Google Gemini API"""
    try:
        if not model_gemini:
            logger.warning("Gemini API key not configured. Using fallback response.")
            return """I am currently operating in offline mode as the medical knowledge base connection is not configured.
            
            However, based on general medical knowledge regarding brain tumors:
            - Brain tumors can be benign (non-cancerous) or malignant (cancerous).
            - Common symptoms include headaches, seizures, vision problems, and balance issues.
            - Diagnosis typically involves MRI scans, CT scans, and biopsies.
            - Treatment options often include surgery, radiation therapy, and chemotherapy.
            
            For specific advice about your condition or the uploaded MRI scan, please consult with a qualified neurologist or oncologist.
            
            ⚠️ **Important**: I am an AI assistant and cannot provide a medical diagnosis."""

        system_prompt = """You are a highly knowledgeable and empathetic medical expert specializing in brain tumors and neurology. 
        Your role is to answer questions strictly related to brain tumors, MRI scans, symptoms, treatments, and general brain health.
        
        Guidelines:
        1. **Scope Restriction**: You must ONLY answer questions related to medical topics, specifically neurology and brain tumors. If a user asks about non-medical topics (e.g., coding, general knowledge, sports), politely decline and remind them that you are a medical assistant.
        2. Provide accurate, medically-grounded information.
        3. Be empathetic and supportive in your tone.
        4. Explain complex medical terms in simple, understandable language.
        5. ALWAYS include a disclaimer that you are an AI and not a substitute for professional medical advice.
        6. If asked about a specific diagnosis based on text description, emphasize the need for medical imaging and professional evaluation.
        7. You can discuss:
           - Types of brain tumors (Glioma, Meningioma, Pituitary, etc.)
           - Symptoms and warning signs
           - Diagnostic procedures (MRI, CT scans, Biopsy)
           - Treatment options (Surgery, Radiation, Chemotherapy)
           - Recovery and support
        
        Context provided: {context}
        """
        
        chat = model_gemini.start_chat(history=[])
        prompt = f"{system_prompt}\n\nUser Question: {user_message}"
        
        response = chat.send_message(prompt)
        return response.text

    except Exception as e:
        logger.error(f"Error generating chatbot response: {str(e)}")
        return """I apologize, but I'm experiencing technical difficulties connecting to the medical knowledge base. 
        Please try again later. 
        
        ⚠️ **Important**: Always consult with a qualified healthcare provider for any medical concerns."""

def preprocess_image(image_bytes):
    """Preprocess image for model prediction"""
    try:
        # Open image
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
            
        # Resize image
        image = image.resize((IMAGE_SIZE, IMAGE_SIZE))
        
        # Convert to array and normalize
        img_array = np.array(image)
        img_array = img_array / 255.0
        
        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)
        
        return img_array, image
    except Exception as e:
        logger.error(f"Error preprocessing image: {str(e)}")
        return None, None

def get_prediction_text(classification, confidence):
    """Get human-readable prediction text"""
    label = LABEL_MAPPING[classification]
    
    if label == 'notumor':
        return "No Tumor Detected", "tumor-negative"
    else:
        return f"{label.capitalize()} Tumor Detected", "tumor-positive"

def image_to_base64(image):
    """Convert PIL image to base64 string"""
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode('utf-8')

def load_model():
    """Load and reconstruct the VGG16-based model"""
    try:
        logger.info("Loading model architecture...")
        
        # Reconstruct the model architecture from the notebook
        base_model = VGG16(
            input_shape=(IMAGE_SIZE, IMAGE_SIZE, 3), 
            include_top=False, 
            weights='imagenet'
        )
        
        # Freeze base model layers
        for layer in base_model.layers:
            layer.trainable = False
            
        # Unfreeze last 3 layers (as per notebook)
        base_model.layers[-2].trainable = True
        base_model.layers[-3].trainable = True
        base_model.layers[-4].trainable = True
        
        model = Sequential()
        model.add(Input(shape=(IMAGE_SIZE, IMAGE_SIZE, 3)))
        model.add(base_model)
        model.add(Flatten())
        model.add(Dropout(0.3))
        model.add(Dense(128, activation='relu'))
        model.add(Dropout(0.2))
        model.add(Dense(len(UNIQUE_LABELS), activation='softmax'))
        
        # Compile model
        model.compile(
            optimizer=Adam(learning_rate=0.0001),
            loss='sparse_categorical_crossentropy',
            metrics=['sparse_categorical_accuracy']
        )
        
        # Load weights
        weights_path = "model.weights.h5"
        if os.path.exists(weights_path):
            logger.info(f"Loading weights from {weights_path}")
            model.load_weights(weights_path)
            logger.info("Model loaded successfully")
            return model
        else:
            logger.error(f"Weights file not found at {weights_path}")
            return None
            
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        return None

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    global model
    model = load_model()
    if model is None:
        logger.error("Failed to load model on startup")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Brain Tumor Detection API is running", "status": "healthy"}

@app.get("/health")
async def health_check():
    """Detailed health check"""
    model_status = "loaded" if model is not None else "not_loaded"
    return {
        "status": "healthy",
        "model_status": model_status,
        "api_version": "2.0.0",
        "chatbot_enabled": bool(model_gemini)
    }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """Analyze uploaded brain MRI image"""
    try:
        if model is None:
            raise HTTPException(status_code=500, detail="Model not loaded")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        image_bytes = await file.read()
        
        # Preprocess image
        processed_image, original_image = preprocess_image(image_bytes)
        
        if processed_image is None:
            raise HTTPException(status_code=400, detail="Failed to preprocess image")
        
        # Make prediction
        predictions = model.predict(processed_image, verbose=0)
        classification = np.argmax(predictions, axis=-1)[0]
        confidence = np.max(predictions) * 100
        
        # Get prediction text
        prediction_text, box_class = get_prediction_text(classification, confidence)
        
        # Create detailed results
        class_probabilities = {}
        for i, label in enumerate(UNIQUE_LABELS):
            class_probabilities[label] = float(predictions[0][i] * 100)
        
        # Convert original image to base64 for frontend display
        image_base64 = image_to_base64(original_image)
        
        return {
            "success": True,
            "prediction": {
                "classification": int(classification),
                "label": LABEL_MAPPING[classification],
                "confidence": float(confidence),
                "prediction_text": prediction_text,
                "box_class": box_class
            },
            "class_probabilities": class_probabilities,
            "image_base64": image_base64,
            "medical_disclaimer": "This is an AI-based screening tool and should not replace professional medical diagnosis. Please consult with a qualified healthcare provider for proper medical evaluation."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during image analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """Chat with AI medical assistant"""
    try:
        response_text = get_medical_chatbot_response(request.message, request.context)
        
        from datetime import datetime
        return ChatResponse(
            response=response_text,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate response")

@app.get("/model-info")
async def get_model_info():
    """Get model information"""
    return {
        "architecture": "VGG16 + Custom Dense Layers",
        "input_size": f"{IMAGE_SIZE}x{IMAGE_SIZE} pixels",
        "classes": UNIQUE_LABELS,
        "total_params": int(model.count_params()) if model else 0,
        "trainable_params": int(sum([tf.keras.backend.count_params(w) for w in model.trainable_weights])) if model else 0
    }

@app.get("/classes")
async def get_classes():
    """Get available tumor classes"""
    return {
        "classes": UNIQUE_LABELS,
        "descriptions": {
            "glioma": "A type of tumor that occurs in the brain and spinal cord",
            "meningioma": "A tumor that forms on membranes that cover the brain and spinal cord",
            "notumor": "No tumor detected in the brain scan",
            "pituitary": "A tumor that forms in the pituitary gland"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)