"""
Setup verification script.
Checks if required packages are installed.
"""
import sys

def check_package(package_name, import_name=None):
    """Check if a package is installed."""
    if import_name is None:
        import_name = package_name

    try:
        __import__(import_name)
        print(f"[OK] {package_name} is installed")
        return True
    except ImportError:
        print(f"[MISSING] {package_name} is NOT installed")
        return False

def main():
    """Check all required packages."""
    print("Checking required packages...")
    print("-" * 50)

    packages = [
        ("gymnasium", "gymnasium"),
        ("numpy", "numpy"),
        ("ray[rllib]", "ray"),
        ("torch", "torch"),
        ("pyyaml", "yaml"),
    ]

    all_installed = True
    for pkg_name, import_name in packages:
        if not check_package(pkg_name, import_name):
            all_installed = False

    print("-" * 50)

    if all_installed:
        print("\n[OK] All required packages are installed!")
        print("\nYou can now run:")
        print("  python tests/test_env_smoke.py")
        print("  python train/train_rllib.py --cpus 4")
        return 0
    else:
        print("\n[MISSING] Some packages are missing.")
        print("\nTo install all dependencies, run:")
        print("  pip install -r requirements.txt")
        return 1

if __name__ == "__main__":
    sys.exit(main())
