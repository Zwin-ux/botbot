#!/usr/bin/env python3
"""
Launch script for the AI Controller Automated Reasoning Dashboard.

This script provides an easy way to start the dashboard server and view
the automated reasoning engine capabilities in a web browser.
"""

import sys
import os
import argparse
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from visualization.examples.dashboard_server import DashboardServer
except ImportError as e:
    print(f"Error importing dashboard server: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)


def main():
    """Main launcher function."""
    parser = argparse.ArgumentParser(
        description="Launch the AI Controller Automated Reasoning Dashboard",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python launch_dashboard.py                    # Start with default settings
  python launch_dashboard.py --no-browser      # Start without opening browser
  python launch_dashboard.py --http-port 9000  # Use custom HTTP port
  python launch_dashboard.py --ws-port 9765    # Use custom WebSocket port

The dashboard will be available at:
  http://localhost:8000/reasoning_dashboard.html (or your custom port)

Features:
  🧠 Real-time safety analysis and violation tracking
  📊 Performance pattern detection and trend analysis  
  🚨 Automated alerts for performance degradation
  💡 AI-generated recommendations for improvement
  📈 Interactive charts and visualizations
  📋 Automated report generation
        """
    )
    
    parser.add_argument(
        "--http-port", 
        type=int, 
        default=8000,
        help="Port for HTTP server (default: 8000)"
    )
    
    parser.add_argument(
        "--ws-port", 
        type=int, 
        default=8765,
        help="Port for WebSocket server (default: 8765)"
    )
    
    parser.add_argument(
        "--no-browser", 
        action="store_true",
        help="Don't automatically open browser"
    )
    
    parser.add_argument(
        "--demo-mode", 
        action="store_true", 
        default=True,
        help="Run in demo mode with simulated data (default: True)"
    )
    
    args = parser.parse_args()
    
    print("🧠 AI Controller Automated Reasoning Dashboard")
    print("=" * 60)
    print()
    print("This dashboard showcases the automated reasoning engine capabilities:")
    print("  ✓ Safety violation analysis with root cause identification")
    print("  ✓ Performance pattern detection and anomaly identification")
    print("  ✓ Automated report generation with actionable recommendations")
    print("  ✓ Real-time alerts for performance degradation")
    print("  ✓ Interactive visualizations and trend analysis")
    print()
    
    if args.demo_mode:
        print("🎮 Running in DEMO MODE with simulated training data")
        print("   - Simulated AI controller training episodes")
        print("   - Realistic safety violations and performance patterns")
        print("   - Live updates every few seconds")
        print()
    
    print(f"🌐 Dashboard will be available at:")
    print(f"   http://localhost:{args.http_port}/reasoning_dashboard.html")
    print()
    print(f"🔌 WebSocket server running on:")
    print(f"   ws://localhost:{args.ws_port}")
    print()
    
    if not args.no_browser:
        print("🚀 Browser will open automatically in 2 seconds...")
    else:
        print("📱 Open the URL above in your browser to view the dashboard")
    
    print()
    print("Press Ctrl+C to stop the server")
    print("=" * 60)
    print()
    
    try:
        # Create and run server
        server = DashboardServer(
            http_port=args.http_port,
            ws_port=args.ws_port
        )
        
        server.demo_mode = args.demo_mode
        server.run(open_browser=not args.no_browser)
        
    except KeyboardInterrupt:
        print("\n👋 Dashboard server stopped. Thank you for using the reasoning engine!")
    except Exception as e:
        print(f"\n❌ Error starting dashboard: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure no other services are using the specified ports")
        print("2. Check that all dependencies are installed (pip install -r requirements.txt)")
        print("3. Ensure you're running from the project root directory")
        sys.exit(1)


if __name__ == "__main__":
    main()