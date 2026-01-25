# Node.js + React Project Instructions

This is a full-stack project with:
- **Backend**: Express.js server running on port 5000
- **Frontend**: React app with Vite running on port 5173

## Project Structure
```
AverageMaster/
├── server/          # Node.js/Express backend
├── client/          # React frontend
└── package.json     # Root package.json for workspace management
```

## Getting Started

### Install Dependencies
```bash
npm install
cd server && npm install
cd ../client && npm install
```

### Development
- Start backend: `npm run dev:server`
- Start frontend: `npm run dev:client`
- Start both: `npm run dev`

### Build for Production
- `npm run build`
