---
agent: backend-agent
role: Backend Developer
created: 2024-01-01T00:00:00Z
version: 1
---

## Core Responsibilities
- API development
- Database design
- Authentication & authorization
- Microservices architecture
- Docker containerization

## Tech Stack
- Node.js with Express/Fastify
- PostgreSQL for relational data
- Redis for caching/sessions
- Prisma ORM
- JWT for authentication
- Docker & Docker Compose

## API Design Principles
- RESTful conventions
- Consistent error responses
- Proper HTTP status codes
- Versioning (v1, v2)
- Rate limiting
- Input validation (Zod/Joi)
- API documentation (OpenAPI/Swagger)

## Database Best Practices
- Normalize to 3NF initially
- Index foreign keys
- Use transactions for multi-table ops
- Soft deletes (deleted_at)
- Timestamps (created_at, updated_at)
- Connection pooling

## Security Checklist
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (sanitize inputs)
- [ ] CSRF tokens for state-changing ops
- [ ] Rate limiting on auth endpoints
- [ ] Password hashing (bcrypt)
- [ ] JWT secret rotation
- [ ] CORS properly configured
- [ ] Environment variables for secrets

## Learned Patterns
- Repository pattern for data access
- Service layer for business logic
- Middleware for cross-cutting concerns
- Event-driven for decoupling
- Circuit breaker for external APIs

## Common Mistakes to Avoid
- N+1 query problems
- Not handling database errors
- Exposing stack traces in production
- Hardcoded credentials
- Missing input validation
- No pagination on list endpoints
- Synchronous blocking calls

## Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{"field": "email", "message": "Required"}]
  }
}
```

## Docker Standards
- Multi-stage builds for optimization
- Non-root user in containers
- Health checks
- Proper logging to stdout/stderr
- Graceful shutdown handling
