 # Checklist: Frontend & Backend Integration (Data Sync)

This checklist outlines the steps to move from LocalStorage-based mocking to a real Backend (NestJS + MariaDB) integration for the Vehicle NFT Prototype.

## 1. Backend API Development (NestJS)
- [x] **Create Vehicle Module**:
  - [x] `VehicleController`: Endpoints for `GET /vehicles` and `GET /vehicles/:tokenId`.
  - [x] `VehicleService`: Logic to fetch from MariaDB using TypeORM.
- [x] **Create Event Module**:
  - [x] `EventController`: Endpoints for `GET /events` and `POST /events` (to record new actions).
  - [x] `EventService`: Logic to save events and update the `Vehicle` entity state accordingly.
- [x] **Enable CORS**: Ensure the backend allows requests from the frontend origin (typically `localhost:5173`).

## 2. Frontend API Layer Updates (`src/services/api.ts`)
- [x] **Implement Fetch Vehicles**: Add `getVehicles()` function using `fetch` or `axios`.
- [x] **Implement Fetch Events**: Add `getEvents()` function.
- [x] **Implement Post Event**: Add `createEvent(eventData)` function to send new actions to the backend.

## 3. Frontend Store Migration (`src/store/index.tsx`)
- [x] **Update `useEffect` (Initial Load)**:
  - [x] Replace `localStorage.getItem` with `api.getEvents()` and `api.getVehicles()`.
  - [x] Handle loading states and errors while fetching data.
- [x] **Update `addEvent` Function**:
  - [x] Instead of just `localStorage.setItem`, call `api.createEvent()`.
  - [x] Optionally implement "Optimistic UI" (update local state immediately while waiting for backend confirmation).

## 4. Authentication Integration (If applicable)
- [x] **Link Wallet to Backend**: Update backend to verify wallet addresses sent in requests.
- [x] **Filter by Owner**: Ensure `GET /vehicles` on the backend can filter by the authenticated user's address.

## 5. Verification & Testing
- [ ] **Swagger Validation**: Use the Swagger UI (if enabled) to test backend endpoints manually.
- [ ] **Network Tab Check**: Verify that the frontend is actually making XHR/Fetch requests to `localhost:3000`.
- [ ] **Persistence Test**: Refresh the page (or use a different browser) and verify if the data persists (since it's now in MariaDB).

---
> [!TIP]
> **Next Recommended Step**: Start by implementing the `GET /vehicles` endpoint on the backend and wire it up to the `VehicleProvider` initial load.
