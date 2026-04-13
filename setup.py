#!/usr/bin/env python3
import subprocess
import sys
import os

def install_requirements():
    print("Installing Python packages...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-r', 'backend/requirements.txt'])
    print("✅ Packages installed!")

def check_openai_key():
    print("\n📌 IMPORTANT: You need an OpenAI API key for this to work!")
    print("Get your key from: https://platform.openai.com/api-keys")
    print("\nCreate a file called .env in the backend folder with:")
    print('OPENAI_API_KEY=your-api-key-here')
    print("\nExample: OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx")

if __name__ == "__main__":
    print("="*60)
    print("  TENDER ELIGIBILITY CHECKER - AI POWERED SETUP")
    print("="*60)
    
    install_requirements()
    check_openai_key()
    
    print("\n✅ Setup complete!")
    print("\nTo start the application, run: python start.py")