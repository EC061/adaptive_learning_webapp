# Changelog

All notable changes to this project will be documented in this file.

## v0.0.8 - 2026-03-20

- Added version modal and version management.
- Updated CI workflow to trigger deployment on push to `dev` branch.
- Added permissions for deployment job in CI workflow.

## v0.0.7 - 2026-03-18

- Enhanced benchmarking script with Cloudflare response handling.
- Improved Prisma client configuration for database connection pooling.

## v0.0.6 - 2026-03-18

- Updated prisma command in Docker entrypoint to use direct node execution for database schema application.
- Added Prisma engines to Dockerfile for improved database functionality.
- Simplified Prisma client and engines copy in Dockerfile.

## v0.0.5 - 2026-03-18

- Updated environment configuration.
- Enhanced Docker deployment with new EC2 copy step.

## v0.0.4 - 2026-03-13

- Added comprehensive benchmarking suite.
- Refactored Docker database setup to use explicit PostgreSQL configuration.
- Removed obsolete benchmark files and updated Dockerfile to create public directory before build.

## v0.0.3 - 2026-03-06

- Fixed sign-out callback URL to be absolute using `window.location.origin`.
- Updated sign-out logic to explicitly redirect client-side after awaiting signOut.

## v0.0.2 - 2026-03-06

- Updated Dockerfile to modify the build and runtime environment for application environment setup and dependency management.

## v0.0.1 - 2026-03-06

- Implemented Docker-based deployment with updated build scripts and dynamic URL generation.
- Updated Docker build configuration and GitHub Actions deployment workflow.

## v0.0.0 - 2026-02-21

- Refactored `my_app` directory to the project root and integrated new ML models and utilities.
- Added URL pattern for favicon.ico redirect.
