# 3-Line Prompt: Flutter Logout Button Integration

## Quick Integration Prompt

I need to add a logout button to my Flutter app that calls the logout service from the We Spend Wise backend API. The logout button should call `AuthService().logout()` and navigate to the login page after successful logout. The backend API endpoint is `POST /api/auth/logout` with Bearer token authentication, and I need to clear both `auth_token` and `refresh_token` from SharedPreferences after logout.

---

## Expanded Details (For Reference)

### Backend API:
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer <token>`
- **Body:** `{ "refreshToken": "string" }` (optional - omit for logout from all devices)
- **Response:** `{ "success": true, "message": "Logout successful" }`

### Implementation:
```dart
ElevatedButton(
  onPressed: () async {
    final authService = AuthService(ApiClient());
    final response = await authService.logout();
    if (response.success) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginPage()),
        (route) => false,
      );
    }
  },
  child: const Text('Logout'),
)
```

See `FLUTTER_INTEGRATION_GUIDE.md` for complete logout implementation examples.
