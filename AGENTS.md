# Repository Guidelines

## Project Structure & Module Organization

This repository contains the QualityDoc Node API, a TypeScript Express service backed by MongoDB. Runtime code lives in `src/`: `src/index.ts` configures middleware, health/test routes, and route mounting; `src/routes/` defines API routes; `src/controllers/` contains request handlers. Database connection code is in `config/mongodb.ts`. Root-level files include Docker setup (`Dockerfile.dev`, `docker-compose.yml`), environment templates (`.env.example`), setup scripts (`setup.sh`, `setup.ps1`), SQL/reference material (`script.sql`), and API verification scripts (`test-api-document.js`, `test-api-search.js`).

## Build, Test, and Development Commands

- `pnpm install`: install dependencies from `pnpm-lock.yaml`.
- `pnpm dev`: run the API locally with `.env` loaded and `tsx`.
- `pnpm dev:watch`: run locally with Node watch mode.
- `docker compose up -d`: start MongoDB and the API development container.
- `docker compose down`: stop containers without deleting the MongoDB volume.
- `./setup.sh` or `.\setup.ps1`: bootstrap the full Docker environment. These scripts may run `docker compose down -v`, which deletes local MongoDB data.
- `pnpm exec tsc --noEmit`: type-check the project.

## Coding Style & Naming Conventions

Use TypeScript ES modules and keep imports explicit. Follow the existing four-space indentation in `src/`. Prefer named controller functions such as `syncDocument` and `searchDocuments`, and keep route files small by delegating logic to controllers. Use environment variables for configuration; do not hard-code secrets, ports, model names, or database credentials.

## Testing Guidelines

There is no formal test framework configured. Validate changes with `pnpm exec tsc --noEmit`, then run the service and exercise endpoints with `curl` or the existing scripts. Use `bun test-api-document.js` to post a sample document; set `TEST_FILE_PATH`, `TEST_DOCUMENT_ID`, and `TEST_DOCUMENT_CODE` when needed. Use `node test-api-search.js` for interactive search checks. Confirm key endpoints such as `/api/saludo`, `/api/test-db`, and `/api/documents/search?q=hola%20mundo`.

## Commit & Pull Request Guidelines

Recent history uses short, imperative Conventional Commit-style prefixes: `feat:`, `refactor:`, and `chore:`. Keep commits focused, for example `feat: add document metadata validation`. Pull requests should describe the API behavior changed, list verification commands, mention environment or Docker changes, and link related issues. Include example requests/responses or screenshots of logs when endpoint behavior changes.

## Security & Configuration Tips

Keep `.env` local and update `.env.example` when adding required variables. Treat `GEMINI_API_KEY`, `MONGO_USER`, and `MONGO_PASS` as secrets. Prefer Docker service networking (`mongodb:27017`) inside containers and `localhost:3000` from the host.
