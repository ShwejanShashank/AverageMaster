# AverageMaster

A full-stack application built with Node.js (Express) and React (Vite).

## Project Structure

```
AverageMaster/
├── server/          # Node.js/Express backend
│   ├── package.json
│   └── index.js
├── client/          # React frontend
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── package.json     # Root package.json for workspace management
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository and navigate to the project directory
2. Install root dependencies:
   ```bash
   npm install
   ```

3. Install backend dependencies:
   ```bash
   cd server && npm install && cd ..
   ```

4. Install frontend dependencies:
   ```bash
   cd client && npm install && cd ..
   ```

### Development

To run both backend and frontend simultaneously:
```bash
npm run dev
```

Or run them separately:
- Backend: `npm run dev:server` (runs on http://localhost:5000)
- Frontend: `npm run dev:client` (runs on http://localhost:5173)

### Build for Production

```bash
npm run build
```

This will build both the server and client.

### Start Production Server

```bash
npm start
```

## Backend

- **Framework**: Express.js
- **Port**: 5000
- **API Routes**:
  - `GET /api/health` - Server health check
  - `GET /api/hello` - Sample endpoint

## Frontend

- **Framework**: React
- **Build Tool**: Vite
- **Port**: 5173
- **Proxy**: API requests to `/api/*` are proxied to `http://localhost:5000`

## Features

- Full-stack JavaScript/TypeScript development
- Frontend and backend can run concurrently
- Configured CORS for cross-origin requests
- Hot module reloading for development
- Optimized build for production
