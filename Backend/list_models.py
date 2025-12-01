import google.generativeai as genai
import os
from dotenv import load_dotenv

def list_available_models():
    load_dotenv()
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Error: GEMINI_API_KEY not found in environment variables.")
        return

    try:
        genai.configure(api_key=api_key)
        print("Fetching available Gemini models...")
        print("-" * 50)
        
        found_models = False
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"Model Name: {m.name}")
                print(f"Display Name: {m.display_name}")
                print(f"Description: {m.description}")
                print("-" * 50)
                found_models = True
        
        if not found_models:
            print("No models found that support content generation.")
            
    except Exception as e:
        print(f"Error listing models: {e}")

if __name__ == "__main__":
    list_available_models()
