# ExpenseTracker

A modern finance tracking mobile app built with React Native (Expo) and SQLite.

## Features
- Track income (CRUD)
- Manage recurring monthly expenses (CRUD, auto-decrement months left)
- Record daily spending (CRUD, grouped by date)
- Dashboard with summaries and charts
- Clean, modern UI with light/dark mode
- Icons for categories
- Smooth navigation

## Tech Stack
- React Native (Expo)
- SQLite (local persistence)
- React Navigation
- Victory Native or React Native SVG Charts

## Getting Started
1. Install dependencies:
   ```sh
   expo install expo-sqlite react-navigation react-native-svg victory-native
   ```
2. Start the app:
   ```sh
   expo start
   ```

## Folder Structure
- `/components` - Reusable UI components
- `/screens` - App screens (Dashboard, Income, Expenses, Daily Spends)
- `/db` - SQLite setup and queries
- `/assets` - Icons and images

## Notes
- All data is stored locally using SQLite.
- Input validation is implemented for all forms.
- Code is modular and well-commented for scalability.

---
Replace placeholder assets and icons as needed.