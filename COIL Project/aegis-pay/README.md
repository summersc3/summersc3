# Aegis Pay

Aegis Pay is a comprehensive full-stack application featuring a mobile frontend built with React Native (Expo) and a robust backend powered by Node.js and Express.

## Project Structure

This repository is organized into a monorepo-style structure:
- `/backend`: Node.js, Express, MySQL backend API.
- `/frontend`: React Native (Expo) mobile application.

## Prerequisites

Before running the project locally, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [MySQL Database](https://www.mysql.com/) or an Aiven MySQL instance
- A [Twilio](https://www.twilio.com/) account (for SMS verification)
- iOS Simulator (Mac only) or Android Studio Emulator for local mobile testing

## Getting Started

### 1. Backend Setup

Navigate to the backend directory and install the required dependencies:

```bash
cd backend
npm install
```

#### Environment Configuration

Create a `.env` file based on the provided example:

```bash
cp .env.example .env
```

Open the `.env` file and configure the following required variables:
- `PORT`: API port (default: `3000`).
- `FRONTEND_URL`: URL of the frontend app for CORS (default: `http://localhost:8081`).
- `JWT_SECRET`: Secret key for JWT authentication.
- `DATABASE_URI`: Connection string for your MySQL database.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID`: Credentials for Twilio SMS verification.

#### Database Initialization (Optional)

If you need to initialize your database tables, you can run the provided database script:

```bash
node src/scripts/init_db.js
```

#### Running the Backend

You can start the backend server in development mode (with hot-reloading) or production mode:

```bash
# Development mode
npm run dev

# Production mode
npm run start
```

### 2. Frontend Setup

In a new terminal window, navigate to the frontend directory and install the dependencies:

```bash
cd frontend
npm install
```

#### Environment Configuration

Create a `.env` file based on the provided example:

```bash
cp .env.example .env
```

Open the `.env` file and configure the API endpoint to point to your local backend:
- `EXPO_PUBLIC_API_URL`: Your backend API base URL (default: `http://localhost:3000/api`).

#### Running the Frontend

Start the Expo development server:

```bash
npm start
```

Once the Expo server is running, you can:
- Press `i` to open the iOS simulator
- Press `a` to open the Android emulator
- Press `w` to open it in a web browser
- Scan the QR code with the Expo Go app on your physical device

## Available Scripts

### Backend (`/backend`)
- `npm run dev`: Starts the server with Nodemon for hot reloading.
- `npm run start`: Starts the server normally using Node.

### Frontend (`/frontend`)
- `npm start` / `npm run start`: Starts the Expo development server.
- `npm run ios`: Runs the app on an iOS simulator.
- `npm run android`: Runs the app on an Android emulator.
- `npm run web`: Runs the app in a web browser.
- `npm run lint`: Runs ESLint to check for code issues.

## License

ISC License. See `package.json` for details.
