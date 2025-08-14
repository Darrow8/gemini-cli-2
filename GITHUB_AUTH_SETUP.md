# GitHub OAuth Authentication Setup

This guide walks you through setting up GitHub OAuth authentication for the Mainbase CLI, replacing the previous Google authentication system.

## Prerequisites

1. A GitHub account
2. Node.js 20+ installed
3. Access to create GitHub OAuth Apps

## Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name**: `Mainbase CLI`
   - **Homepage URL**: `https://your-company.com` (your main website)
   - **Authorization callback URL**: `http://localhost` (for device flow, this isn't used but required)
   - **Application description**: `Command line interface for Mainbase development`

4. Click "Register application"
5. Note down your **Client ID** and **Client Secret**
6. **Enable Device Flow**: In your OAuth app settings, check "Enable Device Flow"

## Step 2: Configure Environment Variables

### CLI Configuration
Create or update your environment variables:

```bash
# For CLI (only Client ID is needed for device flow)
export GITHUB_CLIENT_ID="your_github_client_id_here"
export MAINBASE_SERVER_URL="http://localhost:3000"  # or your production server
```

### Server Configuration
Copy the server environment template:

```bash
cd server
cp .env.example .env
```

Edit `.env`:
```bash
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# CHANGE THIS IN PRODUCTION!
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

## Step 3: Install Server Dependencies

```bash
cd server
npm install
```

## Step 4: Set up MongoDB

You need MongoDB running for the server to work. Choose one option:

### Option A: Local MongoDB
```bash
# macOS (with Homebrew)
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb/brew/mongodb-community

# Ubuntu/Debian
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### Option B: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in your `.env` file

See `server/mongodb-setup.md` for detailed setup instructions.

## Step 5: Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Or build and run production
npm run build
npm start
```

The server will start on `http://localhost:3000`

## Step 6: Build and Test the CLI

```bash
# From the root directory
npm run build

# Test the authentication
npm run start -- /auth login
```

## Authentication Flow

1. **Login**: `npm run start -- /auth login`
   - CLI initiates GitHub Device Flow
   - User opens the GitHub URL and enters the code
   - CLI polls GitHub for token
   - CLI exchanges GitHub token with your server
   - Server validates with GitHub, creates/updates user, returns JWT tokens
   - CLI stores tokens locally (`~/.config/mainbase-cli/credentials.json`)

2. **Check Status**: `npm run start -- /auth status`
   - Shows current authentication status
   - Validates stored tokens

3. **Logout**: `npm run start -- /auth logout`
   - Revokes tokens on server
   - Clears local credentials

## Security Features

✅ **Device Flow**: Perfect for CLI apps - no client secret needed on client  
✅ **Short-lived access tokens**: 15 minutes, automatically refreshed  
✅ **Secure storage**: Credentials stored with 0600 permissions  
✅ **Token refresh**: Automatic token renewal using refresh tokens  
✅ **Server-side validation**: All GitHub tokens validated server-side  
✅ **Minimal scopes**: Only requests `read:user` and `user:email`  

## Database Setup (Production)

The server now uses MongoDB with proper production features:

1. **MongoDB Atlas (Recommended)**: Set up a cloud cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. **Self-hosted MongoDB**: Install MongoDB on your server with authentication
3. **Environment**: Update `MONGODB_URI` with your production connection string
4. **Indexes**: Automatically created for optimal performance
5. **TTL**: Expired sessions are automatically cleaned up

See `server/mongodb-setup.md` for detailed production setup.

## Troubleshooting

### Common Issues

1. **"Client ID not found"**: Make sure `GITHUB_CLIENT_ID` is set
2. **"Device flow not enabled"**: Enable Device Flow in your GitHub OAuth app settings
3. **"Server exchange failed"**: Check server is running and `MAINBASE_SERVER_URL` is correct
4. **"Token refresh failed"**: Tokens may have expired, run `/auth logout` then `/auth login`

### Debug Mode

Set `DEBUG=1` to see detailed logs:
```bash
DEBUG=1 npm run start -- /auth login
```

## API Endpoints

The server exposes these endpoints:

- `POST /v1/auth/github/exchange` - Exchange GitHub token for JWT tokens
- `POST /v1/auth/refresh` - Refresh expired access token
- `POST /v1/auth/logout` - Logout and revoke tokens
- `GET /v1/user/profile` - Example protected route
- `GET /health` - Health check

## Next Steps

1. **Customize scopes**: If you need additional GitHub permissions, update the scopes in `github-auth.ts`
2. **Add database**: Replace in-memory storage with a real database
3. **Add rate limiting**: Implement rate limiting for production
4. **Add monitoring**: Set up logging and monitoring for the auth server
5. **SSL/TLS**: Configure HTTPS for production deployment

## Security Considerations

- Change the JWT secret in production
- Use environment variables for all secrets
- Implement rate limiting
- Set up proper CORS policies
- Use HTTPS in production
- Regularly rotate secrets
- Monitor for suspicious activity