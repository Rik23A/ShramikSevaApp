# Shramik Seva Mobile App (React Native / Expo) — Detailed Implementation Documentation

> **Last Updated:** 2026-03-05  
> **Stack:** React Native 0.81 · Expo SDK 54 · Expo Router 6 · Socket.io Client

---

## 1. Project Structure

```
ShramikSevaApp/
├── app/                        # Expo Router file-based routing
│   ├── _layout.js              # Root layout (AuthProvider, LanguageProvider, SocketProvider)
│   ├── index.js                # Entry redirect (auth check → dashboard or login)
│   ├── language-selection.js   # Initial language picker screen
│   ├── notifications.js        # Unified notifications page (28 KB)
│   ├── auth/                   # Login, Register, OTP verification screens
│   ├── (worker)/               # Worker-specific tab navigation (7 screens)
│   │   ├── _layout.js          # Bottom tab navigator for Worker
│   │   ├── dashboard.js        # Worker dashboard (15 KB)
│   │   ├── jobs.js             # Job listing & search (39 KB)
│   │   ├── my-work.js          # Active jobs, hiring requests, applications, history (50 KB)
│   │   ├── work-logs.js        # Centralized work log viewer with date picker (22 KB)
│   │   ├── messages.js         # Chat list (7 KB)
│   │   └── profile.js          # Worker profile editor (28 KB)
│   ├── (employer)/             # Employer-specific tab navigation (12 screens)
│   │   ├── _layout.js          # Bottom tab navigator for Employer
│   │   ├── dashboard.js        # Employer dashboard (27 KB)
│   │   ├── post-job.js         # Job creation form (39 KB)
│   │   ├── my-jobs.js          # Job management list (20 KB)
│   │   ├── hired-jobs.js       # Active hired workers (11 KB)
│   │   ├── workers.js          # Worker search & discovery (11 KB)
│   │   ├── subscription-plans.js # Plan selection (28 KB)
│   │   ├── billing.js          # Billing history (12 KB)
│   │   ├── payment.js          # Payment flow (7 KB)
│   │   ├── payment-status.js   # Payment result screen (4 KB)
│   │   ├── messages.js         # Chat list (7 KB)
│   │   └── profile.js          # Employer profile editor (37 KB)
│   ├── job/[id]/               # Dynamic job detail routes
│   │   └── applicants.js       # Applicant list for a specific job
│   ├── job-details/[id].js     # Public job detail view
│   ├── hired-job-details/[id].js # Active job management
│   ├── worker/[id].js          # Public worker profile view
│   └── chat/[id].js            # 1-on-1 chat screen
├── components/                 # Reusable UI components (36 files)
│   ├── ui/                     # Base UI primitives (14 files)
│   │   ├── AnimatedModal.js    # Generic animated modal wrapper
│   │   ├── Button.js           # Themed button
│   │   ├── Card.js             # Card container
│   │   ├── Input.js            # Text input with validation
│   │   ├── LoadingSpinner.js   # Animated loading indicator
│   │   ├── RatingModal.js      # Star rating selector
│   │   ├── SelectionModal.js   # Dropdown-style picker
│   │   └── Toast.js            # Toast notification
│   ├── worklog/                # Work verification components (7 files)
│   │   ├── StartWorkModal.js   # OTP entry + photo capture for starting work
│   │   ├── EndWorkModal.js     # OTP entry + photo capture for ending work
│   │   ├── PhotoCapture.js     # Camera integration with geo-tagging
│   │   ├── LocationTracker.js  # Real-time location tracking
│   │   ├── OtpDisplay.js       # OTP display for employers
│   │   ├── WorkLogHistoryModal.js # Full work log history with photo modal
│   │   └── WorklogAccessModal.js  # Subscription gate for worklog features
│   ├── profile/                # Profile-related components (6 files)
│   │   └── AvailabilityModal.js # Worker availability toggle
│   ├── employer/               # Employer-specific components
│   ├── JobCard.js              # Job listing card (12 KB)
│   ├── WorkerCard.js           # Worker listing card (8 KB)
│   ├── WorkerFilterModal.js    # Advanced worker search filters (14 KB)
│   ├── NotificationBell.js     # Tab bar notification badge (4 KB)
│   ├── LocationPicker.js       # Map-based location selector (9 KB)
│   └── OtpInput.js             # OTP digit input (2 KB)
├── services/                   # API service layer (15 files)
│   ├── api.js                  # Axios instance with JWT interceptor & base URL config
│   ├── authService.js          # Login, register, OTP flows
│   ├── jobService.js           # Job CRUD, search, hiring, completion (3.6 KB)
│   ├── worklogService.js       # Work log OTP, photo upload, history fetch (3.2 KB)
│   ├── applicationService.js   # Apply/fetch applications
│   ├── messageService.js       # Send/fetch messages & conversations
│   ├── userService.js          # Profile CRUD, worker search
│   ├── notificationService.js  # Notification fetch/read
│   ├── pushNotificationService.js # Expo push notification registration (3.6 KB)
│   ├── subscriptionService.js  # Plan management, worklog access purchase
│   ├── uploadService.js        # File/image upload to server
│   ├── ratingService.js        # Submit/fetch ratings
│   ├── disputeService.js       # Create/list disputes
│   ├── documentService.js      # Document management
│   └── geolocationService.js   # Reverse geocoding, address lookup
├── context/                    # React Context providers (5 files)
│   ├── AuthContext.js          # JWT storage, user session, login/logout (3.6 KB)
│   ├── LanguageContext.js      # i18n language switching, `t()` helper (2.1 KB)
│   ├── SocketContext.js        # Socket.io connection management (8.9 KB)
│   ├── SubscriptionContext.js  # Active subscription tracking (4.2 KB)
│   └── ToastContext.js         # Global toast notification state (1.6 KB)
├── constants/
│   ├── config.js               # API_URL, COLORS, app-wide constants
│   └── translations.js         # All translation keys for en, hi, bn
├── utils/
│   ├── dateUtils.js            # Date formatting helpers
│   ├── imageUtil.js            # getFullImageUrl() — resolves relative photo paths
│   └── storage.js              # AsyncStorage/SecureStore wrappers
└── package.json                # Dependencies and scripts
```

---

## 2. Navigation Architecture

### Root Layout (`_layout.js`)
Wraps the entire app in context providers:
```
<AuthProvider>
  <LanguageProvider>
    <SocketProvider>
      <SubscriptionProvider>
        <ToastProvider>
          <Stack Navigator>
```

### Worker Tab Navigation (`(worker)/_layout.js`)
5-tab bottom navigation:
| Tab         | Screen         | Icon               |
|-------------|----------------|---------------------|
| Dashboard   | `dashboard.js` | `home`              |
| Jobs        | `jobs.js`      | `briefcase`         |
| My Work     | `my-work.js`   | `hammer`            |
| Work Logs   | `work-logs.js` | `time`              |
| Profile     | `profile.js`   | `person`            |

Each tab includes a **NotificationBell** component for quick access to notifications.

### Employer Tab Navigation (`(employer)/_layout.js`)
7-tab bottom navigation:
| Tab           | Screen                | Icon                |
|---------------|-----------------------|---------------------|
| Dashboard     | `dashboard.js`        | `home`              |
| Post Job      | `post-job.js`         | `add-circle`        |
| My Jobs       | `my-jobs.js`          | `briefcase`         |
| Workers       | `workers.js`          | `people`            |
| Hired         | `hired-jobs.js`       | `checkmark-circle`  |
| Messages      | `messages.js`         | `chatbubbles`       |
| Profile       | `profile.js`          | `person`            |

---

## 3. Context Providers (Detailed)

### 3.1. AuthContext
- **State**: `user`, `token`, `isAuthenticated`, `loading`.
- **Methods**: `login(mobile, otp)`, `register(data)`, `logout()`, `refreshProfile()`.
- **Storage**: JWT token persisted in `expo-secure-store`. User data cached in `AsyncStorage`.

### 3.2. LanguageContext
- **State**: `language` (en/hi/bn), `translations`.
- **Methods**: `t(key)` — translation lookup with graceful fallback to key name, `setLanguage(lang)`.
- **Storage**: Language preference persisted in `AsyncStorage`.

### 3.3. SocketContext
- **State**: `socket`, `isConnected`, `onlineUsers`.
- **Features**: Auto-connects on auth, handles reconnection, emits/listens for `newMessage`, `notification`, `typing`, `onlineStatus`.

### 3.4. SubscriptionContext
- **State**: `subscription`, `planType`, `limits`.
- **Methods**: `checkFeatureAccess(feature)`, `refreshSubscription()`.

### 3.5. ToastContext
- **State**: `toastMessage`, `toastType`.
- **Methods**: `showToast(message, type)` — displays success/error/info toasts.

---

## 4. Key Feature Implementations

### 4.1. Work Verification Flow (Worker Side)
1. Worker opens an assigned job from "My Work" → clicks "Start Work".
2. `StartWorkModal` opens → Worker enters the 6-digit OTP from employer.
3. `PhotoCapture` activates the camera → captures a geo-tagged photo.
4. App calls `worklogService.verifyStartOTP()` with OTP + photo + location.
5. Backend validates OTP, stores the photo, updates WorkLog status.
6. Same flow runs for "End Work" with `EndWorkModal`.

### 4.2. Work Logs Screen (`work-logs.js`)
- **Search**: Real-time filtering by job title, employer name, company name, or status.
- **Date Filtering**: Native `@react-native-community/datetimepicker` for Start and End date bounds. Smart auto-adjustment prevents invalid ranges. Clear button resets filters.
- **Dismissal Handling**: `event.type === 'dismissed'` check prevents cancelled pickers from defaulting to current date.
- **Photo Modal**: Full-screen image modal with dark overlay and close button (same pattern as `WorkLogHistoryModal`).
- **Grouping**: Logs grouped by `workDate`, sorted descending. Each group shows all logs for that day.

### 4.3. Context-Aware Hiring
When navigating to a worker's profile from the **applicants list**, the app passes `{ jobId, context: 'applicant' }`. The profile screen detects this and:
- Shows a streamlined "Hire" button instead of "Direct Hire Modal".
- Calls the backend hire API directly, bypassing the normal modal flow.

### 4.4. Subscription & Payment
- `subscription-plans.js` displays plan cards (Free, Basic, Pro, Premium) with feature comparison.
- Payment flow: Select plan → `payment.js` (creates order) → opens payment gateway → `payment-status.js` (shows result).
- `SubscriptionContext` enforces plan limits on features like worker database unlocks and worklog access.

### 4.5. Real-Time Messaging
- `SocketContext` maintains a persistent Socket.io connection.
- Chat screens (`chat/[id].js`) display messages in real-time.
- `NotificationBell` shows unread count from the notification service.

---

## 5. Key Dependencies

| Package                                    | Version   | Purpose                              |
|--------------------------------------------|-----------|--------------------------------------|
| `expo`                                     | ~54.0.33  | Core Expo SDK                        |
| `expo-router`                              | ~6.0.23   | File-based routing                   |
| `expo-camera`                              | ~17.0.10  | Photo capture for work verification  |
| `expo-location`                            | ~19.0.8   | Geo-tagging coordinates              |
| `expo-notifications`                       | ~0.32.16  | Push notification support            |
| `expo-secure-store`                        | ^15.0.8   | Secure JWT storage                   |
| `expo-image-picker`                        | ~17.0.10  | Gallery image selection              |
| `react-native-reanimated`                 | ~4.1.1    | Smooth animations                    |
| `react-native-maps`                        | 1.20.1    | Map views for location picking       |
| `socket.io-client`                         | ^4.8.3    | Real-time messaging                  |
| `axios`                                    | ^1.13.4   | HTTP client                          |
| `@react-native-community/datetimepicker`   | (latest)  | Native date picker for filters       |

---

## 6. Translation System

Translations are stored in `constants/translations.js` as a single object with three top-level keys: `en`, `hi`, `bn`. Each contains 400+ keys covering:
- Navigation labels, button texts, form labels
- Status strings (pending, approved, completed, etc.)
- Error messages and empty states
- All work log, job, and profile related UI strings

The `LanguageContext.t(key)` function performs a simple key lookup with fallback.

---

## 7. API Service Layer

All services use a shared `api.js` Axios instance that:
1. Reads `API_URL` from `constants/config.js` (sourced from `EXPO_PUBLIC_API_URL` env var).
2. Attaches `Authorization: Bearer <token>` header from `AuthContext`.
3. Handles 401 responses by triggering logout.

Each service file exports named functions mapping to backend endpoints (e.g., `getAssignedJobs()`, `verifyStartOTP(jobId, workerId, data)`).
