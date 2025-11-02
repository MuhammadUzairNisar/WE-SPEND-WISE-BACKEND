# Wallet API Reference

## Base URL
```
http://localhost:5000/api/wallets
```

## Authentication
All endpoints require Bearer token:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Create Wallets with Images

**POST** `/api/wallets`

**Content-Type:** `multipart/form-data`

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| wallets | JSON String | Yes | Array of wallet objects as JSON string |
| images | File[] | No | Image files (max 10, 5MB each) |

**Wallet Object:**
```json
{
  "name": "Cash",
  "initialAmount": 5000,
  "isDefault": true,
  "hasImage": false,
  "hasAppNotification": false,
  "notificationName": "",
  "hasSMSCode": false,
  "smsCode": ""
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | Yes | Wallet name (e.g., "Cash", "JazzCash") |
| initialAmount | Number | Yes | Starting balance (min: 0) |
| isDefault | Boolean | No | Mark as default wallet (default: false) |
| hasImage | Boolean | No | Flag to receive uploaded image (default: false) |
| hasAppNotification | Boolean | No | Has app notifications (default: false) |
| notificationName | String | No | Name in notifications |
| hasSMSCode | Boolean | No | Has SMS code (default: false) |
| smsCode | String | No | SMS code prefix |

**Image Matching:**
- Images are assigned to wallets with `hasImage: true`
- Upload images in order matching wallets with `hasImage: true`
- Example: If wallet[1] has `hasImage: true`, it gets images[0]

**cURL Example:**
```bash
curl -X POST http://localhost:5000/api/wallets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'wallets=[{"name":"Cash","initialAmount":5000,"isDefault":true,"hasImage":false},{"name":"JazzCash","initialAmount":2000,"hasImage":true}]' \
  -F 'images=@jazzcash-icon.png'
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Wallets created successfully",
  "data": [
    {
      "_id": "65abc123def456789",
      "name": "Cash",
      "initialAmount": 5000,
      "currentAmount": 5000,
      "isDefault": true,
      "hasAppNotification": false,
      "hasSMSCode": false,
      "image": null,
      "userId": "65abc123def456788",
      "isDeleted": false,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "_id": "65abc123def456790",
      "name": "JazzCash",
      "initialAmount": 2000,
      "currentAmount": 2000,
      "isDefault": false,
      "hasAppNotification": false,
      "hasSMSCode": false,
      "image": "/uploads/wallets/wallet-1234567890-123456789.png",
      "userId": "65abc123def456788",
      "isDeleted": false,
      "createdAt": "2024-01-20T10:30:00.000Z",
      "updatedAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Wallets data is required"
}
```

---

### 2. Get All Wallets

**GET** `/api/wallets`

**Success Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "65abc123def456789",
      "name": "Cash",
      "currentAmount": 5000,
      "isDefault": true,
      "image": null
    },
    {
      "_id": "65abc123def456790",
      "name": "JazzCash",
      "currentAmount": 2000,
      "isDefault": false,
      "image": "/uploads/wallets/wallet-1234567890-123456789.png"
    }
  ]
}
```

---

### 3. Get Single Wallet

**GET** `/api/wallets/:id`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "65abc123def456789",
    "name": "Cash",
    "currentAmount": 5000,
    "initialAmount": 5000,
    "isDefault": true,
    "image": null
  }
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Wallet not found"
}
```

---

### 4. Update Wallet

**PUT** `/api/wallets/:id`

**Content-Type:** `multipart/form-data`

**Body Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | String | No | Updated wallet name |
| currentAmount | Number | No | Updated balance |
| hasAppNotification | Boolean | No | Update notification setting |
| notificationName | String | No | Update notification name |
| hasSMSCode | Boolean | No | Update SMS code setting |
| smsCode | String | No | Update SMS code |
| isDefault | Boolean | No | Set as default |
| image | File | No | New wallet image |

**cURL Example:**
```bash
curl -X PUT http://localhost:5000/api/wallets/65abc123def456789 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'name=Updated Cash' \
  -F 'currentAmount=7500' \
  -F 'image=@new-icon.png'
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Wallet updated successfully",
  "data": {
    "_id": "65abc123def456789",
    "name": "Updated Cash",
    "currentAmount": 7500,
    "image": "/uploads/wallets/wallet-1234567892-111222333.png"
  }
}
```

---

### 5. Delete Wallet (Soft Delete)

**DELETE** `/api/wallets/:id`

**Success Response (200):**
```json
{
  "success": true,
  "message": "Wallet deleted successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Cannot delete default wallet"
}
```

---

## Image Upload Specifications

### Allowed Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

### File Size
- Maximum: 5MB per image
- Recommended: 512x512px, 85% quality

### Storage
- Location: `uploads/wallets/`
- Naming: `wallet-{timestamp}-{random}.{ext}`
- Access: `http://localhost:5000/uploads/wallets/filename.png`

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Wallets must be a non-empty array"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Wallet not found"
}
```

### 500 Server Error
```json
{
  "success": false,
  "message": "Failed to create wallets",
  "error": "Error details"
}
```

---

## Flutter Integration Example

```dart
// Create wallets with images
final wallets = [
  Wallet(name: 'Cash', initialAmount: 5000, isDefault: true),
  Wallet(name: 'JazzCash', initialAmount: 2000),
];

final images = [null, jazzcashImage]; // null for Cash, image for JazzCash

final formData = FormData();

// Add wallets with hasImage flags
final walletsWithFlags = wallets.asMap().entries.map((entry) {
  final wallet = entry.value.toJson();
  wallet['hasImage'] = images[entry.key] != null;
  return wallet;
}).toList();

formData.fields.add(MapEntry('wallets', jsonEncode(walletsWithFlags)));

// Add non-null images
for (var image in images) {
  if (image != null) {
    final file = await MultipartFile.fromFile(image.path);
    formData.files.add(MapEntry('images', file));
  }
}

await dio.post('/wallets', data: formData);
```

---

## Important Notes

1. **hasImage Flag**: Set to `true` for wallets that should receive images
2. **Image Order**: Upload images in order of wallets with `hasImage: true`
3. **Optional Images**: All images are optional
4. **Default Wallet**: Cannot be deleted
5. **Soft Delete**: Deleted wallets remain in database with `isDeleted: true`
6. **User Isolation**: Users can only access their own wallets
7. **Authentication**: All endpoints require valid JWT token

---

## Testing with Postman

1. Create POST request to `http://localhost:5000/api/wallets`
2. Set Authorization: `Bearer YOUR_TOKEN`
3. Select Body → form-data
4. Add `wallets` (Text): `[{"name":"Cash","initialAmount":5000,"isDefault":true,"hasImage":false}]`
5. Add `images` (File): Select image file
6. Send request
