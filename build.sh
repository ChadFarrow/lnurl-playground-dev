#!/bin/bash
# Simple build script for static HTML site
echo "Building static site..."
# Copy files to build directory if needed
mkdir -p build
cp -r public/* build/
echo "Build complete!" 