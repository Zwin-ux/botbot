#!/usr/bin/env python3
"""
Launch script for Echo Tower Alpha-01 Virtual ATC Environment.

This script provides an easy way to start the military-style ATC simulation
with emoji-only visuals and AI automation.
"""

import sys
import os
import argparse
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    # Add the atc_environment directory to path
    atc_env_path = project_root / "atc_environment"
    sys.path.insert(0, str(atc_env_path))
    
    from echo_tower_server import EchoTowerServer
except ImportError as e:
    print(f"Error importing Echo Tower server: {e}")
    print("Make sure you're running this from the project root directory")
    print("Trying alternative import...")
    try:
        from atc_environment.echo_tower_server import EchoTowerServer
    except ImportError as e2:
        print(f"Alternative import also failed: {e2}")
        sys.exit(1)


def main():
    """Main launcher function."""
    parser = argparse.ArgumentParser(
        description="Launch Echo Tower Alpha-01 Virtual ATC Environment",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
🧩 Echo Tower Alpha-01 Virtual ATC Environment

Military-style automated simulation with emoji-only interface for:
- AI-automated ATC (Air Traffic Control) system
- Real-time aircraft routing and airspace control
- Weather impact simulation and conflict resolution
- Military priority hierarchies and mission coordination

Examples:
  python launch_echo_tower.py                    # Start with default settings
  python launch_echo_tower.py --no-browser       # Start without opening browser
  python launch_echo_tower.py --http-port 9001   # Use custom HTTP port
  python launch_echo_tower.py --ws-port 9766     # Use custom WebSocket port

The tactical dashboard will be available at:
  http://localhost:8001/echo_tower_dashboard.html (or your custom port)

Features:
  🏢 Military command & control interface
  ✈️ Multi-aircraft coordination with priority systems
  🛰️ Real-time radar tracking and conflict resolution
  🌩️ Dynamic weather system affecting operations
  🧠 AI-driven traffic scheduling and automation
  📊 Performance metrics and safety analysis
  📻 Military radio communications simulation
        """
    )
    
    parser.add_argument(
        "--http-port", 
        type=int, 
        default=8001,
        help="Port for HTTP server (default: 8001)"
    )
    
    parser.add_argument(
        "--ws-port", 
        type=int, 
        default=8767,
        help="Port for WebSocket server (default: 8767)"
    )
    
    parser.add_argument(
        "--no-browser", 
        action="store_true",
        help="Don't automatically open browser"
    )
    
    args = parser.parse_args()
    
    print("🏢 Echo Tower Alpha-01 Virtual ATC Environment")
    print("=" * 60)
    print()
    print("Military-style automated ATC simulation featuring:")
    print("  ✓ Emoji-only tactical display (🏢🧠🛰️✈️🛫🛬🌩️)")
    print("  ✓ AI-automated traffic control and conflict resolution")
    print("  ✓ Military priority hierarchies (MEDEVAC > SUPPLY > RECON > PATROL)")
    print("  ✓ Dynamic weather system with operational impact")
    print("  ✓ Real-time performance analysis and safety monitoring")
    print("  ✓ Radio communications with military brevity codes")
    print()
    
    print(f"🌐 Tactical Dashboard will be available at:")
    print(f"   http://localhost:{args.http_port}/echo_tower_dashboard.html")
    print()
    print(f"🔌 WebSocket server running on:")
    print(f"   ws://localhost:{args.ws_port}")
    print()
    
    if not args.no_browser:
        print("🚀 Browser will open automatically in 2 seconds...")
    else:
        print("📱 Open the URL above in your browser to view the tactical display")
    
    print()
    print("🎮 Interactive Controls:")
    print("  ▶️  Start/Pause Simulation")
    print("  ✈️  Spawn Aircraft (various mission types)")
    print("  🌩️ Generate Weather Events")
    print("  🚨 Trigger Emergency Scenarios")
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()
    
    try:
        # Create and run server
        server = EchoTowerServer(
            http_port=args.http_port,
            ws_port=args.ws_port
        )
        
        server.run(open_browser=not args.no_browser)
        
    except KeyboardInterrupt:
        print("\n👋 Echo Tower Alpha-01 shutdown complete. Mission accomplished!")
    except Exception as e:
        print(f"\n❌ Error starting Echo Tower: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure no other services are using the specified ports")
        print("2. Check that all dependencies are installed")
        print("3. Ensure you're running from the project root directory")
        print("4. Try different ports with --http-port and --ws-port flags")
        sys.exit(1)


if __name__ == "__main__":
    main()