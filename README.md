# GhostLine

A modern AI-powered voice messaging and chat platform built with React, TypeScript, and Supabase.

## Features

- 🎤 **Voice Messaging**: Record and send voice messages with real-time processing
- 🤖 **AI Voice Cloning**: Clone and customize voice profiles for personalized communication
- 💬 **Real-time Chat**: Instant messaging with conversation management
- 🔐 **Authentication**: Secure user authentication with Supabase Auth
- 📱 **Responsive Design**: Modern UI that works on all devices
- 🎨 **Customizable**: Voice settings and user preferences
- 🔄 **Deadman Switch**: Connection monitoring and fallback mechanisms

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Voice Processing**: Web Audio API, Custom voice cloning
- **State Management**: React Hooks, Custom hooks
- **Routing**: React Router v6
- **Styling**: Tailwind CSS with custom components

## Project Structure

```
ghostline/
├── public/
│   ├── favicon.ico
│   └── index.html
├── src/
│   ├── assets/
│   │   └── ghost-logo.svg
│   ├── components/
│   │   ├── ChatList.tsx
│   │   ├── MessageBubble.tsx
│   │   └── VoiceRecorder.tsx
│   ├── pages/
│   │   ├── ChatHub.tsx
│   │   ├── Conversation.tsx
│   │   └── Profile.tsx
│   ├── lib/
│   │   ├── supabaseClient.ts
│   │   ├── voiceClone.ts
│   │   └── deadman.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useMessages.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── .env.example
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── supabase.sql
```

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ghostline
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**
   - Create a new Supabase project
   - Run the SQL commands from `supabase.sql` in your Supabase SQL editor
   - Configure authentication settings in Supabase dashboard

5. **Start the development server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3000`

## Key Components

### Voice Processing (`src/lib/voiceClone.ts`)
- Audio recording and playback
- Voice effect processing (pitch, speed, clarity)
- Voice profile management
- Audio format conversion

### Authentication (`src/hooks/useAuth.ts`)
- User registration and login
- Session management
- Profile management
- Secure authentication flow

### Chat System (`src/hooks/useMessages.ts`)
- Real-time messaging
- Conversation management
- Message history
- Voice message support

### Connection Monitoring (`src/lib/deadman.ts`)
- Network quality monitoring
- Connection health checks
- Fallback mechanisms
- Performance optimization

## Database Schema

The application uses the following main tables:

- **users**: User profiles and settings
- **conversations**: Chat conversations
- **messages**: Individual messages (text and voice)
- **voice_profiles**: Voice cloning profiles
- **user_settings**: User preferences

## API Endpoints

The application integrates with Supabase for:

- **Authentication**: Sign up, sign in, sign out
- **Real-time messaging**: Live message updates
- **File storage**: Voice message storage
- **Database operations**: CRUD operations for all entities

## Voice Features

### Voice Recording
- Browser-based audio recording
- Real-time audio processing
- Multiple audio format support
- Duration tracking

### Voice Cloning
- Voice profile creation
- Customizable voice settings
- Emotion and style control
- Quality optimization

### Voice Effects
- Pitch shifting
- Speed adjustment
- Clarity enhancement
- Background noise reduction

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Deploy to Netlify
1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Configure environment variables

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_SUPABASE_URL` | Supabase project URL | Yes |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `REACT_APP_VOICE_API_KEY` | Voice processing API key | No |
| `REACT_APP_DEBUG_MODE` | Enable debug mode | No |

## Troubleshooting

### Common Issues

1. **Voice recording not working**
   - Check browser permissions for microphone access
   - Ensure HTTPS is enabled (required for audio API)

2. **Supabase connection issues**
   - Verify environment variables are set correctly
   - Check Supabase project status and settings

3. **Build errors**
   - Clear node_modules and reinstall dependencies
   - Check TypeScript configuration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the Supabase documentation for backend issues

## Roadmap

- [ ] Advanced voice cloning with AI models
- [ ] Group conversations
- [ ] Voice message transcription
- [ ] Mobile app development
- [ ] Integration with external voice APIs
- [ ] Advanced audio effects and filters
- [ ] Real-time voice calling
- [ ] Voice message search and indexing 