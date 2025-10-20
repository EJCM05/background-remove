#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Instala las dependencias del sistema para OpenCV
apt-get update
apt-get install -y libgl1-mesa-glx libglib2.0-0

# 2. Instala las dependencias de Python
pip install -r requirements.txt