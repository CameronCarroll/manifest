# Commands for RTS Game Codebase

## Build & Test
- Run dev server: `npm run dev`
- Build for production: `npm run build`
- Run all tests: `npm run test`
- Run specific test: `npm run test -- tests/unit/entities/systems/AISystem.test.js`
- Run tests with watch mode: `npm run test:watch`
- Run tests with coverage: `npm run test:coverage`
- Lint code: `npm run lint`
- Lint and fix: `npm run lint:fix`

## Code Style Guidelines
- Indentation: 2 spaces
- Line endings: Unix
- Quotes: Single quotes, allow template literals
- Always use semicolons
- Always use strict equality (`===`)
- Use curly braces for all blocks
- Use modern ES6+ syntax (const/let, no var)
- Error handling: Use try/catch with specific error types and meaningful messages
- Classes: Single class per file, follow PascalCase naming
- Methods/Variables: Use camelCase
- Comments: Add JSDoc-style comments for public methods
- Components follow the Entity Component System pattern