# ExpenseTracker Makefile
# Simplifies common development tasks

.PHONY: install dev build-apk clean help

# Default target
help:
	@echo "ExpenseTracker - Available Commands:"
	@echo "  make install    - Install npm dependencies"
	@echo "  make dev        - Start Expo development server"
	@echo "  make build-apk  - Build Android release APK"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make help       - Show this help message"

# Install dependencies
install:
	@echo "Installing dependencies..."
	npm install

# Start local development server
dev:
	@echo "Starting Expo development server..."
	npx expo start

# Build Android APK
build-apk:
	@echo "Building Android release APK..."
	@echo "Step 1: Running Expo prebuild..."
	npx expo prebuild
	@echo "Step 2: Building release APK with Gradle..."
	cd android && .\gradlew.bat assembleRelease
	@echo "APK built successfully!"
	@echo "Location: android\app\build\outputs\apk\release\"

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@if exist android rmdir /s /q android
	@if exist .expo rmdir /s /q .expo
	@echo "Clean complete!"
