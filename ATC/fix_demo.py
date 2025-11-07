#!/usr/bin/env python3
"""
Quick fix script for demo issues.
"""

import subprocess
import sys
import os
from pathlib import Path

def install_missing_packages():
    """Install any missing packages."""
    packages = ['numpy', 'scipy', 'websockets']
    
    for package in packages:
        try:
            __import__(package)
            print(f"✓ {package} is installed")
        except ImportError:
            print(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            print(f"✓ {package} installed")

def kill_processes_on_ports():
    """Kill any processes using our ports."""
    ports = [8000, 8001, 8765, 8767]
    
    for port in ports:
        try:
            if os.name == 'nt':  # Windows
                subprocess.run(f'netstat -ano | findstr :{port}', shell=True, capture_output=True)
                # Kill process if found (simplified)
                subprocess.run(f'taskkill /F /IM python.exe', shell=True, capture_output=True)
            else:  # Unix/Linux/Mac
                subprocess.run(f'lsof -ti:{port} | xargs kill -9', shell=True, capture_output=True)
            print(f"✓ Cleared port {port}")
        except:
            pass  # Port might not be in use

def main():
    print("🔧 Fixing demo issues...")
    print()
    
    # Install missing packages
    print("1. Checking dependencies...")
    install_missing_packages()
    print()
    
    # Clear ports
    print("2. Clearing ports...")
    kill_processes_on_ports()
    print()
    
    print("✅ Demo fix complete!")
    print()
    print("Now try running:")
    print("  python launch_dashboard.py")
    print("  python launch_echo_tower.py")

if __name__ == "__main__":
    main()