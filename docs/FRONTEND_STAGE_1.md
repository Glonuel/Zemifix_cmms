# ZemiFix Frontend — Stage 1: Application shell and dashboard

This stage improves the existing frontend without replacing the colleague's backend, Prisma schema, API routes, or current feature pages.

## What changed

- Refined the global design tokens and neutral page background in `src/index.css`.
- Added consistent keyboard focus visibility, text selection styling, scrollbar styling, and reduced-motion support.
- Improved the shared application shell in `src/components/layout/Shell.tsx` with a keyboard-accessible skip link, a wider responsive content container, more consistent spacing, and a small footer.
- Kept the existing sidebar, top navigation, dashboard, authentication context, and API integration in place.

## Important project status

The existing dashboard deliberately labels its operational KPIs and several panels as demonstration data. Do not present those figures as live company data. The next integration stage should replace each mock value with data returned by the backend services/API routes.

The architecture specification also requires staff authentication to include a mandatory OTP step. The existing login flow should not be considered production-complete until that second factor is implemented and tested.

## Run the project in VS Code

1. Install Node.js (LTS) if it is not already installed.
2. Extract the ZIP folder.
3. Open the extracted `Zemifix_cmms-main` folder in VS Code.
4. Open **Terminal → New Terminal**.
5. Run `npm install`.
6. Copy `.env.example` to `.env` and fill in the required values supplied by your backend teammate. Do not commit real secrets.
7. Run `npm run dev`.
8. Open `http://localhost:3000` in your browser.

If the app reports a database connection error, ask the backend teammate for the correct PostgreSQL connection string and setup instructions. Do not invent credentials or change the Prisma schema to bypass the issue.

## Files changed in Stage 1

- `src/index.css`
- `src/components/layout/Shell.tsx`
- `docs/FRONTEND_STAGE_1.md` (this guide)

## Next stage

Review the login and authentication flow, then implement the mandatory OTP verification screen before connecting the remaining dashboard panels to live backend data.
