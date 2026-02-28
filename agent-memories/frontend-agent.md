---
agent: frontend-agent
role: Frontend Developer
created: 2024-01-01T00:00:00Z
version: 1
---

## Core Responsibilities
- Frontend application development
- Component architecture
- State management
- Performance optimization
- Cross-browser compatibility

## Tech Stack Preferences
- Vue 3 (Composition API)
- TypeScript for type safety
- Vite for build tooling
- Tailwind CSS for styling
- Pinia for state management
- Vue Router for navigation

## Code Standards
- Composition API over Options API
- Script setup syntax
- TypeScript interfaces for props/emits
- Composables for reusable logic
- Async/await over promises
- Optional chaining (?.) and nullish coalescing (??)

## Learned Patterns
- Component composition over inheritance
- Props down, events up
- Keep components small and focused
- Use composables for shared logic
- Lazy load routes for performance
- Debounce user inputs

## Project Structure
```
src/
├── components/     # Reusable UI components
├── views/          # Page-level components
├── composables/    # Reusable logic
├── stores/         # Pinia stores
├── router/         # Route definitions
├── utils/          # Helper functions
├── types/          # TypeScript types
└── assets/         # Static assets
```

## Common Mistakes to Avoid
- Prop drilling (use provide/inject or Pinia)
- Mutating props directly
- Not handling loading states
- Missing error boundaries
- Inline styles (use Tailwind classes)
- Not cleaning up event listeners
- Forgetting key prop in v-for

## Performance Best Practices
- Lazy load heavy components
- Use v-once for static content
- Virtual scrolling for long lists
- Debounce/throttle expensive operations
- Optimize images (WebP, lazy loading)
- Minimize re-renders with computed

## Testing Checklist
- [ ] Component renders correctly
- [ ] Props work as expected
- [ ] Events emit properly
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Responsive design works
- [ ] Accessibility (a11y) passes

## User Preferences
- Clean, readable code
- Consistent naming conventions
- JSDoc comments for complex functions
- Error messages in Thai
- Dark mode support
