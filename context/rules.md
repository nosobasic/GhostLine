# GhostLine Coding Rules & Conventions

## Code Style & Architecture

### TypeScript Standards
- Use strict TypeScript with proper type definitions
- Prefer interfaces over types for object definitions
- Use explicit return types for functions
- Implement proper error handling with try-catch blocks

### React Patterns
- Use functional components with hooks
- Implement custom hooks for shared logic (useAuth, useMessages)
- Use React.FC type for components
- Implement proper loading states and error boundaries

### File Organization
- Components: `/src/components/` - Reusable UI components
- Pages: `/src/pages/` - Route-level components
- Hooks: `/src/hooks/` - Custom React hooks
- Lib: `/src/lib/` - Utility functions and API clients
- Types: Define interfaces inline or in separate type files

### State Management
- Use React hooks for local state
- Implement custom hooks for complex state logic
- Use context for global state when needed
- Avoid prop drilling by using appropriate patterns

## Database & Backend

### Supabase Integration
- Use Row Level Security (RLS) for all tables
- Implement proper authentication policies
- Use TypeScript types for database schemas
- Handle real-time subscriptions for chat functionality

### Data Structure
- Use UUID primary keys for all entities
- Implement proper foreign key relationships
- Use JSONB for flexible data storage (settings, preferences)
- Add proper indexes for performance

## Voice Processing

### Audio Standards
- Support WAV format for voice messages
- Implement proper audio context management
- Handle browser compatibility for audio APIs
- Process audio on the client side for performance

### Voice Cloning
- Use configurable voice settings (pitch, speed, clarity)
- Support multiple voice profiles per user
- Implement proper audio file storage and retrieval
- Handle audio compression and quality optimization

## Testing Strategy

### Unit Testing
- Test custom hooks with React Testing Library
- Test utility functions with Jest
- Mock external dependencies (Supabase, audio APIs)
- Achieve 80%+ code coverage

### Integration Testing
- Test complete user flows (authentication, messaging)
- Test voice recording and playback functionality
- Test real-time features with mock websockets
- Test error scenarios and edge cases

### E2E Testing
- Test critical user journeys
- Test cross-browser compatibility
- Test mobile responsiveness
- Test accessibility standards

## Performance & Security

### Performance
- Implement code splitting for large components
- Use React.memo for expensive re-renders
- Optimize audio processing for real-time usage
- Implement proper caching strategies

### Security
- Never expose Supabase service keys in frontend
- Implement proper input validation
- Use RLS policies for data access control
- Handle sensitive data (voice recordings) securely

## UI/UX Guidelines

### Design System
- Use Tailwind CSS for styling
- Implement consistent color palette and spacing
- Use responsive design principles
- Follow accessibility guidelines (WCAG 2.1)

### User Experience
- Provide clear loading states
- Implement proper error messages
- Use intuitive navigation patterns
- Optimize for mobile-first design

## Task Management

### Development Process
- Use feature branches for development
- Implement proper commit message conventions
- Use pull requests for code review
- Follow semantic versioning

### Issue Tracking
- Create detailed user stories
- Break down features into small tasks
- Use proper labeling for bug reports
- Implement proper testing before deployment