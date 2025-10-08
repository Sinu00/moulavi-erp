# API Reference

Complete API documentation for the Moulavi ERP backend.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require authentication. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Login

```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin"
  },
  "accessToken": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

**Errors:**
- `401 Unauthorized`: Invalid credentials
- `403 Forbidden`: Account deactivated

---

### Refresh Token

```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "new_jwt_access_token"
}
```

**Errors:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### Logout

```http
POST /auth/logout
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

```http
GET /auth/me
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

---

## Party Management

### Create Party

```http
POST /parties
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff

**Request Body:**
```json
{
  "party_name": "ABC Company",
  "email": "contact@abc.com",
  "contact_number": "+91 1234567890",
  "whatsapp_number": "+91 1234567890",
  "address": "123 Main St, City",
  "gst_number": "GST123456",
  "customer_type": "b2b",
  "account_currency": "INR",
  "is_supplier": false,
  "is_customer": true,
  "login_required": true
}
```

**Response (201 Created):**
```json
{
  "party": {
    "id": "uuid",
    "party_name": "ABC Company",
    "email": "contact@abc.com",
    "customer_type": "b2b",
    "account_currency": "INR",
    "login_required": true,
    "created_at": "2025-01-01T00:00:00Z"
  },
  "message": "Party created and credentials sent via email"
}
```

**Errors:**
- `400 Bad Request`: Party already exists or validation error
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Insufficient permissions

---

### List Parties

```http
GET /parties?page=1&limit=10&search=ABC&customer_type=b2b
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `search` (string): Search by name or email
- `customer_type` (string): Filter by customer type (direct, b2b)
- `is_supplier` (boolean): Filter by supplier status
- `is_customer` (boolean): Filter by customer status

**Response (200 OK):**
```json
{
  "parties": [
    {
      "id": "uuid",
      "party_name": "ABC Company",
      "email": "contact@abc.com",
      "contact_number": "+91 1234567890",
      "customer_type": "b2b",
      "account_currency": "INR",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

### Get Party by ID

```http
GET /parties/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff

**Response (200 OK):**
```json
{
  "party": {
    "id": "uuid",
    "party_name": "ABC Company",
    "email": "contact@abc.com",
    "contact_number": "+91 1234567890",
    "whatsapp_number": "+91 1234567890",
    "address": "123 Main St, City",
    "gst_number": "GST123456",
    "customer_type": "b2b",
    "account_currency": "INR",
    "is_supplier": false,
    "is_customer": true,
    "login_required": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

**Errors:**
- `404 Not Found`: Party not found

---

### Update Party

```http
PUT /parties/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff

**Request Body:**
```json
{
  "party_name": "Updated Company Name",
  "contact_number": "+91 9876543210"
}
```

**Response (200 OK):**
```json
{
  "party": {
    "id": "uuid",
    "party_name": "Updated Company Name",
    "contact_number": "+91 9876543210",
    "updated_at": "2025-01-02T00:00:00Z"
  }
}
```

---

### Delete Party

```http
DELETE /parties/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin only

**Response (200 OK):**
```json
{
  "message": "Party deleted successfully"
}
```

---

## Service Management

### Create Umrah Visa Request

```http
POST /services/umrah-visa
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff, Party (own services only)

**Request Body:**
```json
{
  "party_id": "uuid",
  "full_name": "John Doe",
  "passport_number": "AB1234567",
  "nationality": "Indian",
  "travel_date_from": "2025-03-01",
  "travel_date_to": "2025-03-15",
  "passport_expiry": "2030-12-31",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "phone_number": "+91 1234567890"
}
```

**Response (201 Created):**
```json
{
  "service": {
    "id": "uuid",
    "service_type": "umrah_visa",
    "party_id": "uuid",
    "status": "pending",
    "submitted_at": "2025-01-01T00:00:00Z"
  },
  "details": {
    "id": "uuid",
    "service_id": "uuid",
    "full_name": "John Doe",
    "passport_number": "AB1234567",
    "nationality": "Indian",
    "travel_date_from": "2025-03-01",
    "travel_date_to": "2025-03-15"
  },
  "message": "Umrah visa service created successfully"
}
```

---

### List Services

```http
GET /services?page=1&limit=10&status=pending
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** All roles (filtered by role)

**Query Parameters:**
- `page` (number, default: 1): Page number
- `limit` (number, default: 10): Items per page
- `status` (string): Filter by status (pending, processing, completed, cancelled)
- `service_type` (string): Filter by service type

**Response (200 OK):**
```json
{
  "services": [
    {
      "id": "uuid",
      "service_type": "umrah_visa",
      "party_id": "uuid",
      "party_name": "ABC Company",
      "party_email": "contact@abc.com",
      "status": "pending",
      "submitted_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### Get Service by ID

```http
GET /services/:id
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "service": {
    "id": "uuid",
    "service_type": "umrah_visa",
    "party_id": "uuid",
    "party_name": "ABC Company",
    "status": "pending",
    "submitted_at": "2025-01-01T00:00:00Z"
  },
  "details": {
    "full_name": "John Doe",
    "passport_number": "AB1234567",
    "nationality": "Indian",
    "travel_date_from": "2025-03-01",
    "travel_date_to": "2025-03-15"
  },
  "documents": [
    {
      "id": "uuid",
      "document_type": "passport",
      "file_name": "passport.pdf",
      "uploaded_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

### Update Service Status

```http
PATCH /services/:id/status
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Permissions:** Admin, Staff

**Request Body:**
```json
{
  "status": "processing"
}
```

**Valid Statuses:**
- `pending`
- `processing`
- `completed`
- `cancelled`

**Response (200 OK):**
```json
{
  "service": {
    "id": "uuid",
    "status": "processing",
    "updated_at": "2025-01-02T00:00:00Z"
  }
}
```

---

## Document Management

### Upload Document

```http
POST /upload/service/:serviceId
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `document` (file): The file to upload
- `document_type` (string): Type of document (e.g., "passport", "photo")

**Response (201 Created):**
```json
{
  "document": {
    "id": "uuid",
    "service_id": "uuid",
    "document_type": "passport",
    "file_name": "passport.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "uploaded_at": "2025-01-01T00:00:00Z"
  },
  "message": "Document uploaded successfully"
}
```

**File Restrictions:**
- Max size: 5MB
- Allowed types: JPEG, PNG, PDF, DOC, DOCX

---

### Download Document

```http
GET /upload/:documentId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
File download

---

### Delete Document

```http
DELETE /upload/:documentId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "message": "Document deleted successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required or token invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per IP
- **Response on exceed**: 
  ```json
  {
    "error": "Too many requests from this IP, please try again later."
  }
  ```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- UUIDs are version 4
- Pagination starts at page 1
- Default page size is 10 items

