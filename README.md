# WA Multi-Account Desktop App

A desktop application for managing multiple WhatsApp accounts in one centralized dashboard. This application allows users to connect multiple WhatsApp accounts, separate group chats from personal chats, and utilize custom notification rules.

## Features
- **Multi-Account Support:** Connect and manage up to 3 WhatsApp numbers simultaneously.
- **Chat Segregation:** Automatically separates Group chats from Personal chats for a cleaner inbox.
- **Rule Engine & Notifications:** Set up keyword-based notification rules per account or globally to only get notified for important messages.
- **Local Database:** Stores message history locally using SQLite.
- **Electron & React:** Built with Electron for the desktop environment and React with Vite for a fast, responsive user interface.
- **Baileys Integration:** Uses `@whiskeysockets/baileys` for a lightweight, native WhatsApp Web socket connection.

## Tech Stack
- Electron
- React (Vite)
- Tailwind CSS
- SQLite (better-sqlite3)
- Baileys (WhatsApp Web API)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run dev
   ```

3. Build for production (Windows/Mac/Linux):
   ```bash
   npm run build
   npm run dist
   ```

## Setup & Pairing
The app will display a QR code or pairing code for each account instance. Scan it with your WhatsApp mobile app (Linked Devices) to connect. Sessions are saved locally and persist between restarts.
