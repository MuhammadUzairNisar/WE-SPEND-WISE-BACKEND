# Quick Start Prompt - Flutter Integration

Copy this prompt to get started quickly with Flutter integration:

---

## Flutter Integration Prompt

I need to integrate a Node.js backend API with Flutter for registration and login functionality. Here are the API details:

### Backend API Details:
- **Base URL:** `http://localhost:5000/api` (or your production URL)
- **Authentication:** JWT Bearer Token
- **Response Format:** JSON with `{ success, message, data, errors? }` structure

### API Endpoints:

#### Register:
```
POST /api/auth/register
Body: {
  "firstName": "string",
  "lastName": "string", 
  "email": "string",
  "password": "string",
  "phone": "string (optional)"
}
Response: {
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": { "id", "firstName", "lastName", "email", "phone", "roles" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
Error: {
  "success": false,
  "message": "User already exists with this email address",
  "field": "email"
}
```

#### Login:
```
POST /api/auth/login
Body: {
  "email": "string",
  "password": "string"
}
Response: {
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { "id", "firstName", "lastName", "email", "roles" },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
Error: {
  "success": false,
  "message": "Invalid credentials"
}
```

#### Logout:
```
POST /api/auth/logout
Headers: {
  "Authorization": "Bearer <token>"
}
Body: {
  "refreshToken": "string" (optional)
  - If provided: Logout from current device only
  - If omitted: Logout from all devices
}
Response: {
  "success": true,
  "message": "Logout successful"
}
```

### Requirements:
1. Use Dio for HTTP requests
2. Store tokens in SharedPreferences
3. Automatically add Bearer token to authenticated requests
4. Handle errors gracefully with user-friendly messages
5. Validate forms (email format, password strength, etc.)
6. Show loading states during API calls
7. Handle duplicate email errors during registration
8. Navigate to home page after successful login/register

### Password Requirements:
- Minimum 6 characters
- At least one uppercase letter
- At least one lowercase letter  
- At least one number

### Expected Features:
- Register page with form validation
- Login page with form validation
- Logout functionality (current device and all devices)
- Token storage and automatic inclusion in requests
- Error handling and display
- Loading indicators
- Navigation after successful auth/logout

Please provide:
1. Complete service class for API calls (register, login, logout)
2. Models for User, AuthResponse, ApiResponse
3. Register page implementation
4. Login page implementation
5. Logout service implementation with examples
6. Token storage and management

---

## Quick Copy Code Snippets

### pubspec.yaml Dependencies:
```yaml
dependencies:
  dio: ^5.3.2
  shared_preferences: ^2.2.2
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.0
```

### API Client Setup:
```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  late Dio _dio;
  
  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: 'http://localhost:5000/api',
      headers: {'Content-Type': 'application/json'},
    ));
    
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
    ));
  }
  
  Dio get dio => _dio;
}
```

### Auth Service Method (Register):
```dart
Future<ApiResponse<AuthResponse>> register({
  required String firstName,
  required String lastName,
  required String email,
  required String password,
  String? phone,
}) async {
  try {
    final response = await _apiClient.dio.post(
      '/auth/register',
      data: {
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'password': password,
        if (phone != null) 'phone': phone,
      },
    );
    
    final apiResponse = ApiResponse<AuthResponse>.fromJson(
      response.data,
      (data) => AuthResponse.fromJson(data),
    );
    
    if (apiResponse.success && apiResponse.data != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', apiResponse.data!.token);
      await prefs.setString('refresh_token', apiResponse.data!.refreshToken);
    }
    
    return apiResponse;
  } on DioException catch (e) {
    return _handleError(e);
  }
}
```

### Auth Service Method (Login):
```dart
Future<ApiResponse<AuthResponse>> login({
  required String email,
  required String password,
}) async {
  try {
    final response = await _apiClient.dio.post(
      '/auth/login',
      data: {
        'email': email,
        'password': password,
      },
    );
    
    final apiResponse = ApiResponse<AuthResponse>.fromJson(
      response.data,
      (data) => AuthResponse.fromJson(data),
    );
    
    if (apiResponse.success && apiResponse.data != null) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', apiResponse.data!.token);
      await prefs.setString('refresh_token', apiResponse.data!.refreshToken);
    }
    
    return apiResponse;
  } on DioException catch (e) {
    return _handleError(e);
  }
}
```

### Auth Service Method (Logout):
```dart
// Logout from current device only
Future<ApiResponse<void>> logout({bool logoutFromAllDevices = false}) async {
  try {
    final prefs = await SharedPreferences.getInstance();
    final refreshToken = prefs.getString('refresh_token');

    if (refreshToken != null && !logoutFromAllDevices) {
      // Logout from current device
      await _apiClient.dio.post(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } else if (logoutFromAllDevices) {
      // Logout from all devices (don't send refreshToken)
      await _apiClient.dio.post('/auth/logout');
    }

    // Clear tokens from local storage
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');

    return ApiResponse(
      success: true,
      message: logoutFromAllDevices
          ? 'Logged out from all devices successfully'
          : 'Logged out successfully',
    );
  } on DioException catch (e) {
    // Clear tokens even if API call fails
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');
    return _handleError(e);
  }
}
```

### Usage Example (Logout):
```dart
// Simple logout from current device
final authService = AuthService(ApiClient());
final response = await authService.logout();

if (response.success) {
  Navigator.of(context).pushAndRemoveUntil(
    MaterialPageRoute(builder: (_) => const LoginPage()),
    (route) => false,
  );
}

// Logout from all devices
final response = await authService.logout(logoutFromAllDevices: true);
```

---

See `FLUTTER_INTEGRATION_GUIDE.md` for complete implementation!
