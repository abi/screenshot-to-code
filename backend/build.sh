#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing the latest version of uv..."
pip install --upgrade pip
pip install uv

rm uv.lock
uv lock
uv pip install .
