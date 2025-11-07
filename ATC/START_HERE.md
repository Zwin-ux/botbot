# START HERE - ATC Training Environment

## ⚠️ IMPORTANT: Python Version Issue Detected

Your system is running **Python 3.13**, but this project requires **Python 3.11**.

NumPy and other core dependencies don't yet have pre-built wheels for Python 3.13, causing installation failures.

---

## Quick Fix (5 minutes)

### Step 1: Download Python 3.11

Go to: https://www.python.org/downloads/release/python-3119/

Download: **Windows installer (64-bit)**

**✓ Check:** "Add Python 3.11 to PATH" during installation

### Step 2: Run Setup Script

```bash
# From the ATC directory:
setup_py311.bat
```

This will:
1. Create a Python 3.11 virtual environment
2. Install all dependencies
3. Verify the installation

### Step 3: Test It

```bash
# After setup_py311.bat completes:
python tests/test_env_smoke.py
```

---

## Alternative: Manual Setup

If the batch script doesn't work:

```bash
# Create venv with Python 3.11
py -3.11 -m venv venv311

# Activate it
venv311\Scripts\activate

# Verify version
python --version
# Should show: Python 3.11.x

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify installation
python setup_check.py
```

---

## What You're Building

A **Gymnasium environment** for training AI air traffic controllers using:
- **RLlib PPO** for reinforcement learning
- **BlueSky** simulator (currently stubbed)
- **16 aircraft** max capacity
- **Continuous actions** (heading, altitude control)
- **Dense rewards** (safety, efficiency, progress)

---

## Project Structure

```
ATC/
├── bluesky_adapter/    # Simulator wrapper (stub)
├── st_env/             # Gymnasium environment
├── train/              # RLlib training scripts
├── tests/              # Unit tests
├── configs/            # Hyperparameters
└── scenarios/          # BlueSky scenarios (create these)
```

---

## After Installation

### 1. Run Tests
```bash
python tests/test_env_smoke.py
```

Expected output:
```
[OK] test_env_creation
[OK] test_env_reset
[OK] test_env_step
...
All tests passed!
```

### 2. Start Training
```bash
python train/train_rllib.py --cpus 4 --iterations 100
```

### 3. Integrate BlueSky

Edit `bluesky_adapter/adapter.py` and replace stub methods with BlueSky API calls.

See `README.md` section "BlueSky Integration" for details.

---

## Documentation Overview

| File | Purpose |
|------|---------|
| **START_HERE.md** | ← You are here (getting started) |
| **INSTALL_FIX.md** | Python version troubleshooting |
| **QUICKSTART.md** | Step-by-step setup guide |
| **README.md** | Complete documentation |
| **ARCHITECTURE.md** | System design and data flow |
| **IMPLEMENTATION_SUMMARY.md** | Implementation details |
| **CHECKLIST.md** | Deployment checklist |

---

## Common Issues

### "Python 3.11 not found"
- Download and install from python.org
- Use the py launcher: `py -3.11 --version`

### "pip install fails"
- Make sure you're in the Python 3.11 venv
- Try: `python -m pip install --upgrade pip`
- Then: `pip install -r requirements.txt`

### "Ray can't initialize"
- Run: `ray stop`
- Reduce workers: `--cpus 2`

### "Import errors"
- Check venv activated: `which python` or `where python`
- Reinstall: `pip install -r requirements.txt`

---

## Need Help?

1. Check `INSTALL_FIX.md` for Python version issues
2. Check `QUICKSTART.md` for detailed setup
3. Check `README.md` for full documentation
4. Check error messages carefully

---

## What's Next?

Once installation is complete:

1. ✅ Run smoke tests
2. ✅ Start basic training
3. ✅ Create BlueSky scenarios
4. ✅ Integrate real BlueSky API
5. ✅ Train on complex scenarios
6. ✅ Deploy and evaluate

---

## Quick Commands Reference

```bash
# Setup (one time)
setup_py311.bat

# Activate environment (each session)
venv311\Scripts\activate

# Test
python tests/test_env_smoke.py

# Train
python train/train_rllib.py --cpus 4

# Check setup
python setup_check.py
```

---

**Let's get started!** Run `setup_py311.bat` now.
