# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LaunchTime is a macOS desktop application for managing launchd scheduled tasks with a clean, intuitive interface. Built with Electron, TypeScript, React, and Tailwind CSS.

## Common Development Commands

```bash
bun dev           # Start the app in development mode
bun build         # Build the app for production
bun start         # Preview the production build
bun dist:mac      # Build and package the app for macOS distribution
```

## Architecture

### Main Process (`src/main/`)
- `index.ts` - Entry point, window management, IPC handlers
- `services/launchdManager.ts` - Core launchd integration, plist management
- `services/plistBuilder.ts` - XML plist generation for launchd
- `store.ts` - Persistent preferences storage
- `menu.ts` - Application menu configuration

### Renderer Process (`src/renderer/`)
- React-based UI with TypeScript
- Tailwind CSS for styling with custom LaunchTime design tokens
- Component-based architecture:
  - `TaskList` - Sidebar with task list and toggle switches
  - `TaskEditor` - Main editor for creating/editing tasks
  - `ScheduleBuilder` - Advanced scheduling options UI
  - `Preferences` - App preferences including startup settings

### IPC Communication
- Preload script exposes safe API via `window.launchtime`
- Channels: launchd operations, preferences, file dialogs
- Event-based updates for task list synchronization

## Key Features

1. **Schedule Types**: Manual, Interval, Calendar, Startup, File Watch
2. **Task Management**: Create, edit, delete, enable/disable launchd tasks
3. **Menu Bar Integration**: System tray with quick access to all tasks
4. **Startup Launch**: Option to start LaunchTime at login
5. **Advanced Options**: Environment variables, working directory, log paths

## Testing

To test the application:
1. Run `bun dev` to start in development mode
2. Create test tasks with various schedule types
3. Verify plist files are created in `~/Library/LaunchAgents/`
4. Check launchctl integration with `launchctl list | grep com.launchtime`