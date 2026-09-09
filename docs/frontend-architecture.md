# Frontend Architecture — Hospital Management System (HMS)

## 1. Frontend Stack

| Layer | Technology | Version / Specification |
|---|---|---|
| **Framework** | Next.js (App Router) | `16.3.4` |
| **Runtime / UI Library** | React | `19.2.8` |
| **Language** | TypeScript | `^5.0` (Strict Mode) |
| **Styling** | Tailwind CSS v4 | `@tailwindcss/postcss` & `@import "tailwindcss"` |
| **Font System** | Next Font (`next/font/google`) | Geist Sans & Geist Mono |
| **Module Resolution** | Bundler (`tsconfig.json`) | `@/*` mapped to `./src/*` |

---

## 2. Current Project Assessment

- **Router Architecture**: Next.js App Router located under `src/app`.
- **Directory Layout**: Migrated from initial root `/app` to industry-standard `/src` structure, keeping application code isolated from root configuration files (`package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`).
- **Styling Pipeline**: Modern Tailwind CSS v4 engine configured via PostCSS and imported via `@import "tailwindcss";` in `src/app/globals.css`.
- **Dependencies**: Minimal, high-performance base without bloated UI kits or redundant state management libraries.
- **Backend Alignment**: Architecture prepared to consume the Node.js/Express REST API backed by Supabase Auth with JWT Bearer authentication.

---

## 3. Folder Structure

```
hospital_management_frontend/
├── docs/
│   └── frontend-architecture.md          # Architecture & setup documentation
├── public/                               # Static assets (favicons, hospital logos)
├── src/
│   ├── app/                              # Next.js App Router (pages, layouts, routes)
│   │   ├── layout.tsx                    # Root HTML layout & font definitions
│   │   ├── page.tsx                      # Root landing page
│   │   ├── globals.css                   # Global styles & Tailwind v4 theme variables
│   │   ├── favicon.ico                   # Application favicon
│   │   └── login/                        # Admin Login route
│   │       └── page.tsx                  # /login page entry point
│   ├── components/                       # Shared, reusable UI & layout components
│   │   ├── ui/                           # Low-level primitive design system components
│   │   │   ├── button.tsx                # Accessible Button (variants, sizes, loading)
│   │   │   └── input.tsx                 # Accessible Form Input (labels, errors, slots)
│   │   └── common/                       # Composite shared components (Modals, Badges)
│   ├── features/                         # Domain-driven feature modules
│   │   └── auth/                         # Authentication feature module
│   │       ├── components/               # Feature-specific components
│   │       │   └── admin-login-form.tsx  # Admin Login form with validation & states
│   │       └── (future: hooks, api)
│   ├── services/                         # API service layer (HTTP requests & endpoints)
│   ├── lib/                              # Shared library code and helper utilities
│   │   └── utils.ts                      # Classname merging and string utilities
│   ├── hooks/                            # Global custom React hooks
│   ├── types/                            # Global TypeScript types and interfaces
│   │   └── auth.ts                       # Auth credentials, user, and form types
│   ├── utils/                            # Pure utility functions (formatting, dates)
│   └── constants/                        # Global system constants & branding info
│       └── index.ts                      # App title, branding, and contact constants
├── .gitignore
├── AGENTS.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## 4. Purpose of Each Important Folder

| Folder | Purpose |
|---|---|
| `src/app/` | Next.js App Router directory. Responsible exclusively for routing, layout hierarchy, page composition, metadata, and server-side route definitions. |
| `src/components/ui/` | Primitive, headless, reusable design tokens and form elements (Button, Input, Card, Badge, Spinner). Contains no business logic. |
| `src/components/common/` | Shared composite components used across multiple pages (e.g., HospitalHeader, ConfirmationModal, EmptyState). |
| `src/features/` | Feature-based modular architecture. Each domain feature encapsulates its own sub-components, feature hooks, schemas, and state. |
| `src/services/` | Centralized API communication layer. Handles HTTP requests, interceptors, headers, error normalization, and endpoints. |
| `src/lib/` | Third-party integrations and core library utilities (e.g., `utils.ts`, custom fetch wrappers). |
| `src/hooks/` | Cross-cutting custom React hooks (e.g., `useDebounce`, `useMediaQuery`, `useLocalStorage`). |
| `src/types/` | Shared TypeScript type definitions, domain interfaces, and API contracts. |
| `src/utils/` | Stateless utility functions (e.g., date formatters, currency formatters for billing, validation helpers). |
| `src/constants/` | Hardcoded configuration constants, navigation links, hospital branding information, and status codes. |

---

## 5. Naming Conventions

- **Directories**: `kebab-case` (e.g., `admin-login-form`, `components/ui`, `features/patient-records`)
- **React Components**: `PascalCase` for component functions and filenames (or `kebab-case` filenames with `PascalCase` exports, e.g., `button.tsx` exporting `Button`, `admin-login-form.tsx` exporting `AdminLoginForm`)
- **Hooks**: `camelCase` prefixed with `use` (e.g., `useAuth.ts`, `usePatients.ts`)
- **Types / Interfaces**: `PascalCase` (e.g., `AdminLoginCredentials`, `Doctor`, `PatientRecord`)
- **Constants**: `SCREAMING_SNAKE_CASE` (e.g., `HOSPITAL_NAME`, `DEFAULT_REDIRECT_PATH`)
- **Utilities / Services**: `camelCase` (e.g., `formatDate`, `authService.ts`)

---

## 6. Where Future Features Will Go

When new modules are developed, they will be organized modularly inside `src/features/` and mapped to routes inside `src/app/`:

| Hospital Module | App Route (`src/app/`) | Feature Module (`src/features/`) | API Service (`src/services/`) |
|---|---|---|---|
| **Dashboard** | `src/app/dashboard/page.tsx` | `src/features/dashboard/` | `src/services/dashboard.service.ts` |
| **Departments** | `src/app/dashboard/departments/` | `src/features/departments/` | `src/services/departments.service.ts` |
| **Doctors** | `src/app/dashboard/doctors/` | `src/features/doctors/` | `src/services/doctors.service.ts` |
| **Patients** | `src/app/dashboard/patients/` | `src/features/patients/` | `src/services/patients.service.ts` |
| **Nurses** | `src/app/dashboard/nurses/` | `src/features/nurses/` | `src/services/nurses.service.ts` |
| **Rooms** | `src/app/dashboard/rooms/` | `src/features/rooms/` | `src/services/rooms.service.ts` |
| **Admissions** | `src/app/dashboard/admissions/` | `src/features/admissions/` | `src/services/admissions.service.ts` |
| **Treatments** | `src/app/dashboard/treatments/` | `src/features/treatments/` | `src/services/treatments.service.ts` |
| **Billing** | `src/app/dashboard/billing/` | `src/features/billing/` | `src/services/billing.service.ts` |

---

## 7. Scope Status

### Currently Implemented Scope
- Clean, scalable frontend folder architecture (`src/` with `app`, `components`, `features`, `lib`, `types`, `constants`)
- Path alias configuration (`@/* -> ./src/*`)
- Core design tokens and primitive UI components (`Button`, `Input`)
- Backend API Integration for Administrator Authentication:
  - Environment variable setup (`NEXT_PUBLIC_API_URL=http://localhost:5000`)
  - Dedicated API client (`src/services/api-client.ts`)
  - Auth service (`src/services/auth.service.ts`) dispatching to `POST /api/auth/login`
  - Session persistence (`localStorage` and `hms_token` cookie)
  - Full TypeScript response typing (`AdminLoginResponse`, `AuthUser`, `AuthSession`)
- Admin Login page (`/` and `/login`) with live validation and authentication
- Admin Dashboard UI Shell (`/dashboard`):
  - Dashboard Layout (`src/app/dashboard/layout.tsx`)
  - Fixed Sidebar (`src/components/dashboard/sidebar.tsx`) with Overview, Management, and Operations sections
  - Mobile slide-over drawer navigation with hamburger trigger
  - Topbar (`src/components/dashboard/topbar.tsx`) with search bar, page title, and administrator profile pill
  - Reusable Stat Cards (`src/components/dashboard/stat-card.tsx`) for 6 key hospital metrics
  - Recent Admissions table with status badges (`Active`, `Observation`, `Discharged`)
  - Room & Bed Overview widget with live capacity progress bars
  - Client session guard (redirects unauthenticated visitors to login)
- Architecture documentation (`docs/frontend-architecture.md`)

### Not Implemented Yet (Deferred to Future Steps)
- Next.js Route Protection middleware
- Department CRUD page (`/dashboard/departments`)
- Doctor CRUD page (`/dashboard/doctors`)
- Patient CRUD page (`/dashboard/patients`)
- Nurse CRUD page (`/dashboard/nurses`)
- Room CRUD page (`/dashboard/rooms`)
- Admission CRUD page (`/dashboard/admissions`)
- Treatment CRUD page (`/dashboard/treatments`)
- Nurse-Room Assignment page (`/dashboard/nurse-assignments`)
- Billing CRUD page (`/dashboard/billing`)
- Module REST API integrations

---

## 8. Next Recommended Step

**Step 4: Departments Module Implementation**
1. Implement the Departments list and CRUD interface under `/dashboard/departments`.
2. Connect Departments REST API (`GET /api/departments`, `POST`, `PUT`, `DELETE`).
3. Add search, filter, and pagination.
4. Integrate the `/login` form with the auth service, handling genuine backend authentication responses, role verification (ensuring user has `admin` role), and redirection.
5. Create Next.js authentication middleware for route protection.
