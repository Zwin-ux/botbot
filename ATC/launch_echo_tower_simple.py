#!/usr/bin/env python3
"""
Simple launcher for Echo Tower Alpha-01 that handles import issues.
"""

import sys
import os
import webbrowser
import time
from pathlib import Path

# Add current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir / "atc_environment"))

def main():
    print("🏢 Echo Tower Alpha-01 Virtual ATC Environment")
    print("=" * 60)
    print()
    
    try:
        # Try to import and run the demo
        print("Loading Echo Tower Alpha-01...")
        
        # Import the demo function directly
        from atc_environment.echo_tower_alpha01 import run_echo_tower_demo, EchoTowerAlpha01
        
        print("✓ Echo Tower Alpha-01 loaded successfully")
        print()
        
        # Open the static HTML file
        html_path = current_dir / "atc_environment" / "web" / "echo_tower_dashboard.html"
        if html_path.exists():
            print(f"🌐 Opening tactical dashboard...")
            webbrowser.open(f"file://{html_path.absolute()}")
            print(f"   Dashboard: file://{html_path.absolute()}")
        
        print()
        print("🎮 Running Echo Tower Alpha-01 demo...")
        print("=" * 40)
        
        # Run the demo
        run_echo_tower_demo()
        
        print()
        print("✅ Demo completed successfully!")
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print()
        print("🔧 Trying to fix dependencies...")
        
        # Try to install numpy if missing
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "numpy", "scipy"])
            print("✓ Dependencies installed")
            
            # Try again
            from atc_environment.echo_tower_alpha01 import run_echo_tower_demo
            run_echo_tower_demo()
            
        except Exception as e2:
            print(f"❌ Still having issues: {e2}")
            print()
            print("📋 Manual steps:")
            print("1. Install dependencies: pip install numpy scipy")
            print("2. Run from project root directory")
            print("3. Check Python path includes atc_environment/")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        print()
        print("🔧 Troubleshooting:")
        print("1. Make sure you're in the project root directory")
        print("2. Install dependencies: pip install numpy scipy websockets")
        print("3. Try: python fix_demo.py")

if __name__ == "__main__":
    main()