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
