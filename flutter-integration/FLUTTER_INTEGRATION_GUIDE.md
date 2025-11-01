# Flutter Integration Guide - We Spend Wise Backend API

This guide provides complete instructions and code examples for integrating the We Spend Wise Backend API with Flutter frontend for registration and login functionality.

## Table of Contents

1. [Setup Dependencies](#setup-dependencies)
2. [API Service Setup](#api-service-setup)
3. [Models](#models)
4. [Authentication Service](#authentication-service)
5. [Register Page Implementation](#register-page-implementation)
6. [Login Page Implementation](#login-page-implementation)
7. [Logout Implementation](#logout-implementation)
8. [Token Storage](#token-storage)
9. [Error Handling](#error-handling)

---

## Setup Dependencies

Add the following dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP Client
  dio: ^5.3.2
  
  # Local Storage
  shared_preferences: ^2.2.2
  
  # State Management (if using)
  provider: ^6.1.1
  # or
  # get: ^4.6.6
  
  # Form Validation
  flutter_form_builder: ^9.1.1
  form_builder_validators: ^9.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
```

Run:
```bash
flutter pub get
```

---

## API Service Setup

### 1. Create API Configuration

Create `lib/services/api_config.dart`:

```dart
class ApiConfig {
  static const String baseUrl = 'http://localhost:5000/api';
  // For production, use:
  // static const String baseUrl = 'https://your-domain.com/api';
  
  static const String authEndpoint = '/auth';
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
```

### 2. Create Dio Client

Create `lib/services/api_client.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_config.dart';

class ApiClient {
  late Dio _dio;
  
  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: ApiConfig.connectTimeout,
      receiveTimeout: ApiConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));
    
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Add token to requests
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('auth_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // Handle errors globally
        if (error.response?.statusCode == 401) {
          // Token expired, handle logout
          _handleUnauthorized();
        }
        return handler.next(error);
      },
    ));
  }
  
  Dio get dio => _dio;
  
  void _handleUnauthorized() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    await prefs.remove('refresh_token');
    // Navigate to login page
  }
}
```

---

## Models

### Create Response Models

Create `lib/models/api_response.dart`:

```dart
class ApiResponse<T> {
  final bool success;
  final String message;
  final T? data;
  final List<String>? errors;

  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.errors,
  });

  factory ApiResponse.fromJson(Map<String, dynamic> json, T Function(dynamic)? fromJsonT) {
    return ApiResponse<T>(
      success: json['success'] ?? false,
      message: json['message'] ?? '',
      data: json['data'] != null && fromJsonT != null ? fromJsonT(json['data']) : json['data'],
      errors: json['errors'] != null ? List<String>.from(json['errors']) : null,
    );
  }
}
```

### Create User Model

Create `lib/models/user_model.dart`:

```dart
class UserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String? phone;
  final String? avatar;
  final List<RoleModel> roles;
  final bool isEmailVerified;
  final bool isActive;
  final DateTime? lastLogin;
  final DateTime? createdAt;

  UserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    this.phone,
    this.avatar,
    required this.roles,
    required this.isEmailVerified,
    required this.isActive,
    this.lastLogin,
    this.createdAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['_id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'],
      avatar: json['avatar'],
      roles: json['roles'] != null
          ? (json['roles'] as List).map((role) => RoleModel.fromJson(role)).toList()
          : [],
      isEmailVerified: json['isEmailVerified'] ?? false,
      isActive: json['isActive'] ?? true,
      lastLogin: json['lastLogin'] != null ? DateTime.parse(json['lastLogin']) : null,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : null,
    );
  }

  String get fullName => '$firstName $lastName';
}

class RoleModel {
  final String id;
  final String name;
  final String displayName;
  final String? description;
  final int level;

  RoleModel({
    required this.id,
    required this.name,
    required this.displayName,
    this.description,
    required this.level,
  });

  factory RoleModel.fromJson(Map<String, dynamic> json) {
    return RoleModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      displayName: json['displayName'] ?? '',
      description: json['description'],
      level: json['level'] ?? 1,
    );
  }
}
```

### Create Auth Response Model

Create `lib/models/auth_response.dart`:

```dart
import 'user_model.dart';

class AuthResponse {
  final UserModel user;
  final String token;
  final String refreshToken;

  AuthResponse({
    required this.user,
    required this.token,
    required this.refreshToken,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      user: UserModel.fromJson(json['user']),
      token: json['token'] ?? '',
      refreshToken: json['refreshToken'] ?? '',
    );
  }
}
```

---

## Authentication Service

Create `lib/services/auth_service.dart`:

```dart
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/api_response.dart';
import '../models/auth_response.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import 'api_config.dart';

class AuthService {
  final ApiClient _apiClient;

  AuthService(this._apiClient);

  // Register User
  Future<ApiResponse<AuthResponse>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '${ApiConfig.authEndpoint}/register',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'password': password,
          if (phone != null && phone.isNotEmpty) 'phone': phone,
        },
      );

      final apiResponse = ApiResponse<AuthResponse>.fromJson(
        response.data,
        (data) => AuthResponse.fromJson(data),
      );

      if (apiResponse.success && apiResponse.data != null) {
        // Save tokens
        await _saveTokens(
          apiResponse.data!.token,
          apiResponse.data!.refreshToken,
        );
      }

      return apiResponse;
    } on DioException catch (e) {
      return _handleError(e);
    }
  }

  // Login User
  Future<ApiResponse<AuthResponse>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        '${ApiConfig.authEndpoint}/login',
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
        // Save tokens
        await _saveTokens(
          apiResponse.data!.token,
          apiResponse.data!.refreshToken,
        );
      }

      return apiResponse;
    } on DioException catch (e) {
      return _handleError(e);
    }
  }

  // Get Current User
  Future<ApiResponse<UserModel>> getCurrentUser() async {
    try {
      final response = await _apiClient.dio.get(
        '${ApiConfig.authEndpoint}/me',
      );

      return ApiResponse<UserModel>.fromJson(
        response.data,
        (data) => UserModel.fromJson(data),
      );
    } on DioException catch (e) {
      return _handleError(e);
    }
  }

  // Refresh Token
  Future<ApiResponse<AuthResponse>> refreshToken(String refreshToken) async {
    try {
      final response = await _apiClient.dio.post(
        '${ApiConfig.authEndpoint}/refresh',
        data: {
          'refreshToken': refreshToken,
        },
      );

      final apiResponse = ApiResponse<AuthResponse>.fromJson(
        response.data,
        (data) => AuthResponse.fromJson(data),
      );

      if (apiResponse.success && apiResponse.data != null) {
        await _saveTokens(
          apiResponse.data!.token,
          apiResponse.data!.refreshToken,
        );
      }

      return apiResponse;
    } on DioException catch (e) {
      return _handleError(e);
    }
  }

  // Logout
  // If logoutFromAllDevices is true, logout from all devices (doesn't send refreshToken)
  // If false, logout only from current device (sends refreshToken)
  Future<ApiResponse<void>> logout({bool logoutFromAllDevices = false}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString('refresh_token');

      if (refreshToken != null && !logoutFromAllDevices) {
        // Logout from current device only
        try {
          await _apiClient.dio.post(
            '${ApiConfig.authEndpoint}/logout',
            data: {
              'refreshToken': refreshToken,
            },
          );
        } catch (e) {
          // Continue even if API call fails
        }
      } else if (logoutFromAllDevices) {
        // Logout from all devices (don't send refreshToken)
        try {
          await _apiClient.dio.post(
            '${ApiConfig.authEndpoint}/logout',
            // No refreshToken in body means logout from all devices
          );
        } catch (e) {
          // Continue even if API call fails
        }
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
      // Even if API call fails, clear local tokens
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('auth_token');
      await prefs.remove('refresh_token');

      return _handleError(e);
    }
  }

  // Save tokens to local storage
  Future<void> _saveTokens(String token, String refreshToken) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
    await prefs.setString('refresh_token', refreshToken);
  }

  // Handle API errors
  ApiResponse<T> _handleError<T>(DioException error) {
    if (error.response != null) {
      final data = error.response!.data;
      return ApiResponse<T>(
        success: false,
        message: data['message'] ?? 'An error occurred',
        errors: data['errors'] != null
            ? List<String>.from(data['errors'].map((e) => e.toString()))
            : null,
      );
    } else {
      return ApiResponse<T>(
        success: false,
        message: error.message ?? 'Network error. Please check your connection.',
      );
    }
  }
}
```

---

## Register Page Implementation

Create `lib/pages/register_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../models/api_response.dart';
import '../models/auth_response.dart';
import 'login_page.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({Key? key}) : super(key: key);

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _formKey = GlobalKey<FormBuilderState>();
  final AuthService _authService = AuthService(ApiClient());
  bool _isLoading = false;
  bool _obscurePassword = true;

  Future<void> _register() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      setState(() => _isLoading = true);

      final formData = _formKey.currentState!.value;
      
      final response = await _authService.register(
        firstName: formData['firstName'],
        lastName: formData['lastName'],
        email: formData['email'],
        password: formData['password'],
        phone: formData['phone'],
      );

      setState(() => _isLoading = false);

      if (!mounted) return;

      if (response.success) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to home or login page
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
      } else {
        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );

        // Show field-specific errors if any
        if (response.errors != null && response.errors!.isNotEmpty) {
          _formKey.currentState?.fields['email']?.invalidate(response.errors!.first);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Register'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: FormBuilder(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 32),
              const Text(
                'Create Account',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Fill in your details to create an account',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              
              // First Name
              FormBuilderTextField(
                name: 'firstName',
                decoration: const InputDecoration(
                  labelText: 'First Name',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                  FormBuilderValidators.minLength(2),
                  FormBuilderValidators.maxLength(50),
                ]),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 16),
              
              // Last Name
              FormBuilderTextField(
                name: 'lastName',
                decoration: const InputDecoration(
                  labelText: 'Last Name',
                  prefixIcon: Icon(Icons.person_outline),
                  border: OutlineInputBorder(),
                ),
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                  FormBuilderValidators.minLength(2),
                  FormBuilderValidators.maxLength(50),
                ]),
                textCapitalization: TextCapitalization.words,
              ),
              const SizedBox(height: 16),
              
              // Email
              FormBuilderTextField(
                name: 'email',
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                  FormBuilderValidators.email(),
                ]),
              ),
              const SizedBox(height: 16),
              
              // Phone (Optional)
              FormBuilderTextField(
                name: 'phone',
                decoration: const InputDecoration(
                  labelText: 'Phone (Optional)',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.phone,
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.numeric(),
                ]),
              ),
              const SizedBox(height: 16),
              
              // Password
              FormBuilderTextField(
                name: 'password',
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                  ),
                  border: const OutlineInputBorder(),
                ),
                obscureText: _obscurePassword,
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                  FormBuilderValidators.minLength(6),
                  FormBuilderValidators.match(
                    r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)',
                    errorText: 'Password must contain uppercase, lowercase, and number',
                  ),
                ]),
              ),
              const SizedBox(height: 24),
              
              // Register Button
              ElevatedButton(
                onPressed: _isLoading ? null : _register,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Register',
                        style: TextStyle(fontSize: 16),
                      ),
              ),
              const SizedBox(height: 16),
              
              // Login Link
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Already have an account? '),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const LoginPage()),
                      );
                    },
                    child: const Text('Login'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## Login Page Implementation

Create `lib/pages/login_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_form_builder/flutter_form_builder.dart';
import 'package:form_builder_validators/form_builder_validators.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../models/api_response.dart';
import 'register_page.dart';
import 'home_page.dart'; // Your home page

class LoginPage extends StatefulWidget {
  const LoginPage({Key? key}) : super(key: key);

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormBuilderState>();
  final AuthService _authService = AuthService(ApiClient());
  bool _isLoading = false;
  bool _obscurePassword = true;

  Future<void> _login() async {
    if (_formKey.currentState?.saveAndValidate() ?? false) {
      setState(() => _isLoading = true);

      final formData = _formKey.currentState!.value;
      
      final response = await _authService.login(
        email: formData['email'],
        password: formData['password'],
      );

      setState(() => _isLoading = false);

      if (!mounted) return;

      if (response.success) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to home page
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomePage()),
        );
      } else {
        // Show error message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );

        // Show field-specific errors if any
        if (response.errors != null && response.errors!.isNotEmpty) {
          _formKey.currentState?.fields['email']?.invalidate(response.errors!.first);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Login'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: FormBuilder(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 64),
              const Text(
                'Welcome Back',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Login to your account',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),
              
              // Email
              FormBuilderTextField(
                name: 'email',
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                  FormBuilderValidators.email(),
                ]),
              ),
              const SizedBox(height: 16),
              
              // Password
              FormBuilderTextField(
                name: 'password',
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility : Icons.visibility_off,
                    ),
                    onPressed: () {
                      setState(() => _obscurePassword = !_obscurePassword);
                    },
                  ),
                  border: const OutlineInputBorder(),
                ),
                obscureText: _obscurePassword,
                validator: FormBuilderValidators.compose([
                  FormBuilderValidators.required(),
                ]),
              ),
              const SizedBox(height: 24),
              
              // Login Button
              ElevatedButton(
                onPressed: _isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Login',
                        style: TextStyle(fontSize: 16),
                      ),
              ),
              const SizedBox(height: 16),
              
              // Register Link
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Don't have an account? "),
                  TextButton(
                    onPressed: () {
                      Navigator.of(context).pushReplacement(
                        MaterialPageRoute(builder: (_) => const RegisterPage()),
                      );
                    },
                    child: const Text('Register'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## Token Storage

The tokens are automatically saved using `SharedPreferences` when login/register is successful. The `ApiClient` automatically adds the token to all authenticated requests via the interceptor.

---

## Error Handling

The service handles errors and returns them in a user-friendly format:

```dart
// Example error response
ApiResponse(
  success: false,
  message: 'User already exists with this email address',
  errors: ['Email field error details'],
)
```

---

## Logout Implementation

### Logout Service Usage

The logout service supports two modes:

1. **Logout from current device** (default): Logs out only from the current device
2. **Logout from all devices**: Logs out from all devices where the user is logged in

### Example: Home/Profile Page with Logout

Create `lib/pages/home_page.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import 'login_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({Key? key}) : super(key: key);

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final AuthService _authService = AuthService(ApiClient());
  UserModel? _currentUser;
  bool _isLoading = true;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _loadUserData();
  }

  Future<void> _loadUserData() async {
    try {
      final response = await _authService.getCurrentUser();
      if (response.success && response.data != null) {
        setState(() {
          _currentUser = response.data;
          _isLoading = false;
        });
      } else {
        // User not authenticated, redirect to login
        if (mounted) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const LoginPage()),
          );
        }
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const LoginPage()),
        );
      }
    }
  }

  Future<void> _logout({bool logoutFromAllDevices = false}) async {
    // Show confirmation dialog
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(logoutFromAllDevices
            ? 'Logout from All Devices?'
            : 'Logout?'),
        content: Text(logoutFromAllDevices
            ? 'This will log you out from all devices. Are you sure?'
            : 'Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Logout', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _isLoggingOut = true);

    try {
      final response = await _authService.logout(
        logoutFromAllDevices: logoutFromAllDevices,
      );

      if (!mounted) return;

      if (response.success) {
        // Show success message
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.green,
          ),
        );

        // Navigate to login page
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const LoginPage()),
          (route) => false,
        );
      } else {
        setState(() => _isLoggingOut = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(response.message),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() => _isLoggingOut = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error during logout: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        centerTitle: true,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout_current') {
                _logout(logoutFromAllDevices: false);
              } else if (value == 'logout_all') {
                _logout(logoutFromAllDevices: true);
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'logout_current',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20),
                    SizedBox(width: 8),
                    Text('Logout'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout_all',
                child: Row(
                  children: [
                    Icon(Icons.logout_outlined, size: 20),
                    SizedBox(width: 8),
                    Text('Logout from All Devices'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            
            // Welcome Message
            Text(
              'Welcome, ${_currentUser?.fullName ?? 'User'}!',
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _currentUser?.email ?? '',
              style: const TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            
            // User Info Card
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Profile Information',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildInfoRow('First Name', _currentUser?.firstName ?? ''),
                    _buildInfoRow('Last Name', _currentUser?.lastName ?? ''),
                    _buildInfoRow('Email', _currentUser?.email ?? ''),
                    if (_currentUser?.phone != null)
                      _buildInfoRow('Phone', _currentUser!.phone!),
                    _buildInfoRow(
                      'Roles',
                      _currentUser?.roles.map((r) => r.displayName).join(', ') ?? 'User',
                    ),
                    _buildInfoRow(
                      'Email Verified',
                      _currentUser?.isEmailVerified == true ? 'Yes' : 'No',
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Logout Buttons
            ElevatedButton(
              onPressed: _isLoggingOut ? null : () => _logout(logoutFromAllDevices: false),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: Colors.red,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: _isLoggingOut
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Logout',
                      style: TextStyle(
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
            ),
            const SizedBox(height: 12),
            
            OutlinedButton(
              onPressed: _isLoggingOut
                  ? null
                  : () => _logout(logoutFromAllDevices: true),
              style: OutlinedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                side: const BorderSide(color: Colors.red),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text(
                'Logout from All Devices',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.red,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

### Simple Logout Button Example

For a simple logout button in any page:

```dart
ElevatedButton(
  onPressed: () async {
    final authService = AuthService(ApiClient());
    final response = await authService.logout();
    
    if (response.success) {
      // Navigate to login page
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (route) => false,
      );
    } else {
      // Show error message
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(response.message)),
      );
    }
  },
  child: const Text('Logout'),
)
```

### Logout from All Devices

```dart
ElevatedButton(
  onPressed: () async {
    final authService = AuthService(ApiClient());
    final response = await authService.logout(logoutFromAllDevices: true);
    
    if (response.success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (route) => false,
      );
    }
  },
  child: const Text('Logout from All Devices'),
)
```

---

## Quick Integration Checklist

- [ ] Add dependencies to `pubspec.yaml`
- [ ] Create API configuration files
- [ ] Create model classes
- [ ] Implement `AuthService`
- [ ] Create Register page
- [ ] Create Login page
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test error handling
- [ ] Update API base URL for production

---

## Production Considerations

1. **Update API Base URL:**
   ```dart
   static const String baseUrl = 'https://your-production-domain.com/api';
   ```

2. **Add Certificate Pinning** for HTTPS security

3. **Implement Token Refresh** automatically when token expires

4. **Add Loading States** and better error UI

5. **Add Form Validation** feedback

---

## API Endpoints Used

### Register
- **Endpoint:** `POST /api/auth/register`
- **Body:** `{ firstName, lastName, email, password, phone? }`
- **Response:** `{ success, message, data: { user, token, refreshToken } }`

### Login
- **Endpoint:** `POST /api/auth/login`
- **Body:** `{ email, password }`
- **Response:** `{ success, message, data: { user, token, refreshToken } }`

### Logout
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer <token>` (Required)
- **Body:** `{ refreshToken?: string }` (Optional)
  - If `refreshToken` is provided: Logout from current device only
  - If `refreshToken` is not provided: Logout from all devices
- **Response:** `{ success: true, message: "Logout successful" }`

---

## Need Help?

Refer to the backend API documentation in the main README.md for complete endpoint details.
