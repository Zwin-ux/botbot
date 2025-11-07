# Installation Fix for Python 3.13 Issue

## Problem

NumPy doesn't have pre-built wheels for Python 3.13 yet, causing installation failures.

## Solution 1: Use Python 3.11 (Recommended)

### Step 1: Install Python 3.11

Download from: https://www.python.org/downloads/release/python-3119/

Choose: "Windows installer (64-bit)"

### Step 2: Create Virtual Environment with Python 3.11

```bash
# Use py launcher to select Python 3.11
py -3.11 -m venv venv311

# Activate the environment
venv311\Scripts\activate

# Verify correct Python version
python --version
# Should show: Python 3.11.x

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt
```

### Step 3: Verify Installation

```bash
python setup_check.py
```

## Solution 2: Use Compatible Package Versions (Less Reliable)

If you must use Python 3.13, try installing compatible versions:

```bash
# Activate your current venv
venv\Scripts\activate

# Install numpy from nightly builds (may have 3.13 support)
pip install numpy>=1.26.0

# Or try installing from conda-forge
# (requires conda/miniconda installed)
conda install numpy
```

## Solution 3: Wait for Package Updates

Python 3.13 is very new (released Oct 2024). Wait a few months for all packages to catch up.

## Recommended Action

**Use Solution 1** - Python 3.11 is stable and fully supported by all our dependencies.
