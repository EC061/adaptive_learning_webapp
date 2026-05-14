# Changelog

All notable changes to this project will be documented in this file.

## v0.0.14 - 2026-05-14

- Added /admin-register to the list of public routes in proxy middleware.
- Implemented admin registration, dashboard, user management, and authorization system.
- Added enrollment status tracking and filtering to student roster and migrated classes list to client-side data fetching.
- Implemented class roster management with CSV upload support and student list synchronization.

## v0.0.13 - 2026-05-08

- Increased max completion tokens for quiz review and enhanced message handling in Chatbot.
- Enhanced chat API to support max_tokens for local provider.
- Enhanced local chat model selection and API integration.

## v0.0.12 - 2026-04-30

- Implemented QTI ZIP file import functionality for question management.
- Normalized inline block scalar headers in YAML parsing.
- Added YAML support and enhanced question handling in quiz functionality.
- Enhanced authentication and chat functionality with local API support.

## v0.0.11 - 2026-04-17

- Updated dependencies and enhanced chat functionality.
- Enhanced chat API and UI for quiz review functionality.
- Added prebuilt seeding functionality and updated deployment workflow.

## v0.0.10 - 2026-04-03

- Updated default OpenAI service tier to flex and model to gpt-5.4.
- Added debug logging for OpenAI API configuration in chat route.
- Implemented streaming responses with retry logic and performance metrics in chat API and UI.
- Implemented AI chatbot component with OpenAI API integration.
- Enhanced dashboard layout and UI components for improved responsiveness.

## v0.0.9 - 2026-03-27

- Added folder support to learning materials and enhanced UI for organization.
- Improved error handling in MaterialUploadForm and API routes.
- Enhanced MaterialUploadForm with file size validation and cleanup logic.
- Implemented learning materials upload feature with S3 integration.

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
