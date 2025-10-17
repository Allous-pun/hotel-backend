🏨 Roomie Explorer Backend API Documentation

**Version:** 1.0
**Base URL:** `http://localhost:5000/api`
**Auth:** JWT-based authentication (Bearer Token required for protected routes)

---

## 🔐 AUTHENTICATION

**Route Prefix:** `/api/auth`

### 1️⃣ Register User

**POST** `/api/auth/register`
Creates a new user account.

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "guest" // optional, defaults to guest
}
```

✅ **Response**

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "guest"
  }
}
```

---

### 2️⃣ Login

**POST** `/api/auth/login`
Authenticates user and returns JWT.

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

✅ **Response**

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "...",
    "name": "John Doe",
    "role": "guest"
  }
}
```

---

### 3️⃣ Get Profile

**GET** `/api/auth/profile`
Requires: `Authorization: Bearer <JWT>`
Returns logged-in user details.

---

## 🏠 ROOM MANAGEMENT

**Route Prefix:** `/api/rooms`

### 1️⃣ Get All Rooms

**GET** `/api/rooms` *(Public)*

### 2️⃣ Get Room by ID

**GET** `/api/rooms/:roomId` *(Public)*

### 3️⃣ Check Room Availability

**GET** `/api/rooms/:roomId/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` *(Public)*

✅ **Response**

```json
{ "available": true }
```

### 4️⃣ Create Room *(Admin/Staff)*

**POST** `/api/rooms`

```json
{
  "name": "Deluxe Suite",
  "type": "suite",
  "price": 250,
  "description": "Spacious and luxurious",
  "amenities": ["WiFi", "TV"],
  "images": ["https://..."]
}
```

### 5️⃣ Update Room *(Admin/Staff)*

**PUT** `/api/rooms/:roomId`

### 6️⃣ Delete Room *(Admin Only)*

**DELETE** `/api/rooms/:roomId`

---

## 🧾 BOOKING MANAGEMENT

**Route Prefix:** `/api/bookings`

### 1️⃣ Create Booking *(User)*

**POST** `/api/bookings`

```json
{
  "room": "roomId",
  "checkIn": "2025-12-20",
  "checkOut": "2025-12-25"
}
```

### 2️⃣ Get My Bookings *(User)*

**GET** `/api/bookings/my`

### 3️⃣ Get All Bookings *(Staff/Admin)*

**GET** `/api/bookings`

### 4️⃣ Get Booking by Code *(Staff/Admin)*

**GET** `/api/bookings/:code`

### 5️⃣ Update Booking Status *(Staff/Admin)*

**PUT** `/api/bookings/:code`

```json
{ "status": "confirmed" }
```

### 6️⃣ Cancel Booking *(Staff/Admin)*

**DELETE** `/api/bookings/:code`

---

## 🍽 FOOD & ORDER MANAGEMENT

**Route Prefix:** `/api/foods`

### 1️⃣ Get All Foods *(Public)*

**GET** `/api/foods`

### 2️⃣ Add Food *(Admin/Staff)*

**POST** `/api/foods`

```json
{
  "name": "Pasta Carbonara",
  "category": "Main Course",
  "price": 25,
  "description": "Italian classic",
  "image": "https://..."
}
```

### 3️⃣ Update Food *(Admin/Staff)*

**PUT** `/api/foods/:id`

### 4️⃣ Delete Food *(Admin)*

**DELETE** `/api/foods/:id`

### 5️⃣ Place Order *(User)*

**POST** `/api/foods/order`

```json
{
  "items": [
    { "food": "foodId1", "quantity": 2 },
    { "food": "foodId2", "quantity": 1 }
  ]
}
```

### 6️⃣ Get My Orders *(User)*

**GET** `/api/foods/orders/my`

### 7️⃣ Get All Orders *(Staff/Admin)*

**GET** `/api/foods/orders`

### 8️⃣ Get Order by Code *(Staff/Admin)*

**GET** `/api/foods/orders/code/:orderCode`

### 9️⃣ Update Order Status *(Staff/Admin)*

**PUT** `/api/foods/orders/code/:orderCode`

```json
{ "status": "ready" }
```

---

## 🎉 EVENT MANAGEMENT

**Route Prefix:** `/api/events`

### 1️⃣ Get All Events *(Public)*

**GET** `/api/events`

### 2️⃣ Get Event by Code *(Public)*

**GET** `/api/events/:eventCode`

### 3️⃣ Check Event Availability *(Public)*

**GET** `/api/events/:eventId/availability?startDate=2025-12-31&endDate=2026-01-01`

### 4️⃣ Create Event *(Admin/Staff)*

**POST** `/api/events`

```json
{
  "name": "New Year Party",
  "description": "Celebrate with us",
  "location": "Grand Hall",
  "date": "2025-12-31T20:00:00.000Z",
  "capacity": 200,
  "images": ["https://..."]
}
```

### 5️⃣ Update Event *(Admin/Staff)*

**PUT** `/api/events/:eventCode`

### 6️⃣ Delete Event *(Admin)*

**DELETE** `/api/events/:eventCode`

### 7️⃣ Book Event *(User)*

**POST** `/api/events/book`

```json
{
  "event": "eventId",
  "guestsCount": 4,
  "startDate": "2025-12-31T20:00:00.000Z",
  "endDate": "2026-01-01T02:00:00.000Z",
  "notes": "Celebrating with family"
}
```

### 8️⃣ Get My Event Bookings *(User)*

**GET** `/api/events/my`

### 9️⃣ Manage Event Bookings *(Staff/Admin)*

* **GET** `/api/events/bookings`
* **GET** `/api/events/bookings/:reservationCode`
* **PUT** `/api/events/bookings/:reservationCode`
* **DELETE** `/api/events/bookings/:reservationCode`

---

## ⚙️ SETTINGS (Admin Only)

**Route Prefix:** `/api/settings`

| Endpoint         | Method | Role         | Description                                       |
| ---------------- | ------ | ------------ | ------------------------------------------------- |
| `/`              | GET    | Admin, Staff | View current system settings                      |
| `/`              | PUT    | Admin        | Update all settings                               |
| `/info`          | PUT    | Admin        | Update restaurant info                            |
| `/hours`         | PUT    | Admin        | Update operating hours                            |
| `/notifications` | PUT    | Admin        | Update notification preferences                   |
| `/security`      | PUT    | Admin        | Toggle 2FA, update password policy                |
| `/system`        | PUT    | Admin        | Maintenance mode, self-registration, auto-confirm |
| `/password`      | PUT    | Admin        | Change admin password                             |

✅ **Example**

```json
{
  "notifications": {
    "preferences": { "newBookings": false, "foodOrders": true },
    "deliveryMethod": { "inApp": true },
    "enabled": true
  }
}
```

---

## 👥 USER MANAGEMENT

**Route Prefix:** `/api/users`

| Endpoint | Method | Role         | Description           |
| -------- | ------ | ------------ | --------------------- |
| `/`      | GET    | Admin        | Get all users         |
| `/:id`   | GET    | Admin, Staff | Get single user by ID |

---

## 🔒 ROLES

| Role    | Description                                        | Access Level |
| ------- | -------------------------------------------------- | ------------ |
| `guest` | Regular user (can book rooms, events, order food)  | Basic        |
| `staff` | Hotel staff (manage bookings, food, events)        | Elevated     |
| `admin` | System admin (full access, manage settings, users) | Full         |

---


# 🏨 **Roomie Explorer Backend Role Capabilities**

## 👑 **ADMIN CAPABILITIES**

Admins have **full system control**, including security, configuration, and user management.
They manage everything staff can, plus **system-level and sensitive operations**.

### ✅ **Admin Can:**

#### 🔐 Authentication & Users

* View all users → `GET /api/users`
* Get single user details → `GET /api/users/:id`
* Manage admin/staff accounts (via special secret keys)
* Change admin password → `PUT /api/settings/password`

#### 🏠 Rooms

* Create new rooms → `POST /api/rooms`
* Update room info → `PUT /api/rooms/:roomId`
* Delete a room → `DELETE /api/rooms/:roomId` 🚫 *(Staff cannot do this)*

#### 🧾 Bookings

* View all bookings → `GET /api/bookings`
* View a booking by code → `GET /api/bookings/:code`
* Update booking status → `PUT /api/bookings/:code`
* Cancel booking → `DELETE /api/bookings/:code`

#### 🍽 Food & Orders

* Create new menu items → `POST /api/foods`
* Update existing food → `PUT /api/foods/:id`
* Delete food → `DELETE /api/foods/:id` 🚫 *(Staff cannot do this)*
* View all orders → `GET /api/foods/orders`
* Manage order statuses → `PUT /api/foods/orders/code/:orderCode`

#### 🎉 Events

* Create new events → `POST /api/events`
* Update event → `PUT /api/events/:eventCode`
* Delete event → `DELETE /api/events/:eventCode` 🚫 *(Staff cannot do this)*
* View & manage event bookings →

  * `GET /api/events/bookings`
  * `GET /api/events/bookings/:reservationCode`
  * `PUT /api/events/bookings/:reservationCode`
  * `DELETE /api/events/bookings/:reservationCode`

#### ⚙️ System Settings

* Full access to system configuration:

  * `PUT /api/settings`
  * Update restaurant info → `/api/settings/info`
  * Update hours → `/api/settings/hours`
  * Update notifications → `/api/settings/notifications`
  * Update security policies → `/api/settings/security`
  * Toggle maintenance mode, registration → `/api/settings/system`
* Enable/disable **2FA**
* Configure **password policy**
* Toggle **booking auto-confirm**, **maintenance mode**, etc.

---

## 🧑‍💼 **STAFF CAPABILITIES**

Staff members handle **operational tasks** — bookings, food orders, events, and room updates.
They help run daily hotel activities but **don’t control system-wide or security settings**.

### ✅ **Staff Can:**

#### 🏠 Rooms

* View all rooms → `GET /api/rooms`
* Get room details → `GET /api/rooms/:roomId`
* Create new rooms → `POST /api/rooms`
* Update rooms → `PUT /api/rooms/:roomId`

❌ Cannot delete rooms.

---

#### 🧾 Bookings

* View all bookings → `GET /api/bookings`
* Get booking by code → `GET /api/bookings/:code`
* Update booking status → `PUT /api/bookings/:code`
* Cancel booking → `DELETE /api/bookings/:code`

---

#### 🍽 Food & Orders

* View all menu items → `GET /api/foods`
* Add food items → `POST /api/foods`
* Update food → `PUT /api/foods/:id`
* View all orders → `GET /api/foods/orders`
* Update order status → `PUT /api/foods/orders/code/:orderCode`

❌ Cannot delete food items.

---

#### 🎉 Events

* Create new events → `POST /api/events`
* Update events → `PUT /api/events/:eventCode`
* View and manage event bookings → same as admin:

  * `GET /api/events/bookings`
  * `PUT /api/events/bookings/:reservationCode`

❌ Cannot delete events.

---

#### ⚙️ Settings

* View current system settings → `GET /api/settings`

❌ Cannot modify settings or system configurations.

---

## 🚫 **Staff Cannot:**

| Area     | Restricted Action                               | Admin Only? |
| -------- | ----------------------------------------------- | ----------- |
| Rooms    | Delete rooms                                    | ✅           |
| Food     | Delete food items                               | ✅           |
| Events   | Delete events                                   | ✅           |
| Users    | View all users or manage accounts               | ✅           |
| Settings | Update restaurant info, hours, or notifications | ✅           |
| Security | Manage password policies or 2FA                 | ✅           |
| System   | Toggle maintenance mode or self-registration    | ✅           |
| Password | Change admin password                           | ✅           |

---

## 🤝 **Admin & Staff Shared Permissions**

| Function              | Endpoint                       | Notes                                      |
| --------------------- | ------------------------------ | ------------------------------------------ |
| Manage rooms          | `POST/PUT /api/rooms`          | Both can create/update rooms               |
| Manage bookings       | `GET/PUT/DELETE /api/bookings` | Both can view, confirm, or cancel bookings |
| Manage food menu      | `POST/PUT /api/foods`          | Both can add/update menu items             |
| Manage orders         | `GET/PUT /api/foods/orders`    | Both can process food orders               |
| Manage events         | `POST/PUT /api/events`         | Both can create and edit events            |
| Manage event bookings | `GET/PUT /api/events/bookings` | Both can confirm or update event bookings  |
| View settings         | `GET /api/settings`            | Read-only for staff                        |

---

## 🧭 Summary Table

| Feature                | Guest | Staff | Admin |
| ---------------------- | ----- | ----- | ----- |
| View rooms             | ✅     | ✅     | ✅     |
| Manage rooms           | ❌     | ✅     | ✅     |
| Delete rooms           | ❌     | ❌     | ✅     |
| Create bookings        | ✅     | ✅     | ✅     |
| Manage all bookings    | ❌     | ✅     | ✅     |
| Manage food menu       | ❌     | ✅     | ✅     |
| Delete food            | ❌     | ❌     | ✅     |
| Manage food orders     | ❌     | ✅     | ✅     |
| Manage events          | ❌     | ✅     | ✅     |
| Delete events          | ❌     | ❌     | ✅     |
| Manage settings        | ❌     | ❌     | ✅     |
| Manage users           | ❌     | ❌     | ✅     |
| Security configuration | ❌     | ❌     | ✅     |

---


