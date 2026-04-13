#!/usr/bin/env python3
import subprocess
import time
import webbrowser
import os
import sys
import threading
import socket

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "127.0.0.1"

def print_banner():
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║     TENDER ELIGIBILITY CHECKER - AI POWERED VERSION          ║
    ║              Powered by OpenAI GPT                          ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def print_urls(ip, frontend_port=3000, backend_port=8000):
    print("\n" + "="*60)
    print("✅ SERVERS STARTED SUCCESSFULLY!")
    print("="*60)
    print("\n🌐 FRONTEND ACCESS URLs:")
    print(f"   • Local:     http://localhost:{frontend_port}")
    print(f"   • Network:   http://{ip}:{frontend_port}")
    print("\n🔧 BACKEND API URLs:")
    print(f"   • API:       http://localhost:{backend_port}")
    print(f"   • Docs:      http://localhost:{backend_port}/docs")
    print("\n🤖 AI Features:")
    print(f"   • OpenAI powered PDF extraction")
    print(f"   • AI-generated explanations and suggestions")
    print("\n" + "="*60)

def start_servers():
    print_banner()
    
    ip = get_local_ip()
    frontend_port = 3000
    backend_port = 8000
    
    # Start Backend
    print("\n🚀 Starting Backend Server with OpenAI...")
    backend_process = subprocess.Popen(
        [sys.executable, '-m', 'uvicorn', 'main:app', '--reload', '--port', str(backend_port)],
        cwd='backend',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(3)
    
    # Start Frontend
    print("🚀 Starting Frontend Server...")
    frontend_process = subprocess.Popen(
        [sys.executable, '-m', 'http.server', str(frontend_port)],
        cwd='frontend',
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    time.sleep(2)
    
    print_urls(ip, frontend_port, backend_port)
    
    # Open browser
    webbrowser.open(f'http://localhost:{frontend_port}')
    
    print("\n⚠️  Press Ctrl+C to stop servers\n")
    
    try:
        while True:
            if backend_process.poll() is not None:
                print("\n❌ Backend server stopped!")
                break
            if frontend_process.poll() is not None:
                print("\n❌ Frontend server stopped!")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down servers...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Servers stopped!")

if __name__ == "__main__":
    start_servers()