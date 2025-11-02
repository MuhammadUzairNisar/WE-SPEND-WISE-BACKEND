# Complete Wallet Setup Guide - Flutter Integration

## 📋 Overview

This guide covers the complete implementation of wallet setup with image upload functionality for the We Spend Wise Flutter app.

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:5000/api
```

### 1. Create Wallets with Images

**POST** `/api/wallets`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `wallets` | JSON String | Yes | JSON array of wallet objects |
| `images` | File[] | No | Array of image files (max 10, 5MB each) |

**Wallet Object Structure:**
```json
{
  "name": "Cash",
  "initialAmount": 5000,
  "isDefault": true,
  "hasImage": true,
  "hasAppNotification": false,
  "notificationName": "",
  "hasSMSCode": false,
  "smsCode": ""
}
```

**Important:** 
- Set `hasImage: true` for wallets that should receive an uploaded image
- Upload images in order matching wallets with `hasImage: true`
- Images are assigned to wallets based on `hasImage` flag, not array index

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/wallets \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F 'wallets=[{"name":"Cash","initialAmount":5000,"isDefault":true,"hasImage":false},{"name":"JazzCash","initialAmount":2000,"hasImage":true}]' \
  -F 'images=@jazzcash-icon.png'
```

**Response (201):**
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
      "image": null,
      "userId": "65abc123def456788",
      "createdAt": "2024-01-20T10:30:00.000Z"
    },
    {
      "_id": "65abc123def456790",
      "name": "JazzCash",
      "initialAmount": 2000,
      "currentAmount": 2000,
      "isDefault": false,
      "image": "/uploads/wallets/wallet-1234567890-123456789.png",
      "userId": "65abc123def456788",
      "createdAt": "2024-01-20T10:30:00.000Z"
    }
  ]
}
```

### 2. Get All Wallets

**GET** `/api/wallets`

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [...]
}
```

### 3. Update Wallet with Image

**PUT** `/api/wallets/:id`

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
name: "Updated Name"
currentAmount: 3000
image: file.png
```

### 4. Delete Wallet

**DELETE** `/api/wallets/:id`

---

## 📱 Flutter Implementation

### 1. Dependencies

Add to `pubspec.yaml`:
```yaml
dependencies:
  dio: ^5.3.3
  image_picker: ^1.0.4
  http_parser: ^4.0.2
  flutter_secure_storage: ^9.0.0
```

### 2. Wallet Model

```dart
class Wallet {
  final String? id;
  final String name;
  final bool hasAppNotification;
  final String? notificationName;
  final bool hasSMSCode;
  final String? smsCode;
  final bool isDefault;
  final double initialAmount;
  final double currentAmount;
  final String? image;

  Wallet({
    this.id,
    required this.name,
    this.hasAppNotification = false,
    this.notificationName,
    this.hasSMSCode = false,
    this.smsCode,
    this.isDefault = false,
    required this.initialAmount,
    required this.currentAmount,
    this.image,
  });

  Map<String, dynamic> toJson() => {
    'name': name,
    'hasAppNotification': hasAppNotification,
    'notificationName': notificationName,
    'hasSMSCode': hasSMSCode,
    'smsCode': smsCode,
    'isDefault': isDefault,
    'initialAmount': initialAmount,
    'currentAmount': currentAmount,
  };

  factory Wallet.fromJson(Map<String, dynamic> json) => Wallet(
    id: json['_id'],
    name: json['name'],
    hasAppNotification: json['hasAppNotification'] ?? false,
    notificationName: json['notificationName'],
    hasSMSCode: json['hasSMSCode'] ?? false,
    smsCode: json['smsCode'],
    isDefault: json['isDefault'] ?? false,
    initialAmount: (json['initialAmount'] ?? 0).toDouble(),
    currentAmount: (json['currentAmount'] ?? 0).toDouble(),
    image: json['image'],
  );
}
```

### 3. Wallet Service

```dart
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http_parser/http_parser.dart';
import 'dart:convert';

class WalletService {
  final Dio _dio;
  WalletService(this._dio);

  Future<List<Wallet>> createWalletsWithImages(
    List<Wallet> wallets,
    List<XFile?> images,
  ) async {
    try {
      final formData = FormData();
      
      // Add hasImage flag to wallets
      final walletsWithFlags = wallets.asMap().entries.map((entry) {
        final wallet = entry.value.toJson();
        wallet['hasImage'] = images[entry.key] != null;
        return wallet;
      }).toList();
      
      // Add wallets as JSON string
      formData.fields.add(MapEntry('wallets', jsonEncode(walletsWithFlags)));
      
      // Add only non-null images
      for (var image in images) {
        if (image != null) {
          final file = await MultipartFile.fromFile(
            image.path,
            filename: image.name,
            contentType: MediaType('image', image.path.split('.').last),
          );
          formData.files.add(MapEntry('images', file));
        }
      }
      
      final response = await _dio.post('/wallets', data: formData);
      
      if (response.data['success']) {
        return (response.data['data'] as List)
            .map((json) => Wallet.fromJson(json))
            .toList();
      }
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Failed to create wallets: $e');
    }
  }

  Future<List<Wallet>> getWallets() async {
    final response = await _dio.get('/wallets');
    if (response.data['success']) {
      return (response.data['data'] as List)
          .map((json) => Wallet.fromJson(json))
          .toList();
    }
    throw Exception(response.data['message']);
  }

  String getImageUrl(String? imagePath) {
    if (imagePath == null || imagePath.isEmpty) return '';
    return 'http://localhost:5000$imagePath';
  }
}
```

### 4. Welcome Screen

```dart
import 'package:flutter/material.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({Key? key}) : super(key: key);

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).primaryColor,
              Theme.of(context).primaryColor.withOpacity(0.7),
            ],
          ),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                FadeTransition(
                  opacity: _fadeAnimation,
                  child: Icon(
                    Icons.account_balance_wallet,
                    size: 120,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 40),
                SlideTransition(
                  position: _slideAnimation,
                  child: FadeTransition(
                    opacity: _fadeAnimation,
                    child: Column(
                      children: [
                        Text(
                          'Welcome to We Spend Wise! 🎉',
                          style: Theme.of(context)
                              .textTheme
                              .headlineMedium
                              ?.copyWith(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Let\'s set up your wallets to start managing your finances smartly',
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(
                                color: Colors.white.withOpacity(0.9),
                              ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 48),
                        ElevatedButton(
                          onPressed: () {
                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (context) => const WalletSetupScreen(),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: Theme.of(context).primaryColor,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 48,
                              vertical: 16,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(30),
                            ),
                          ),
                          child: const Text(
                            'Get Started',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

### 5. Wallet Setup Screen

```dart
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class WalletSetupScreen extends StatefulWidget {
  const WalletSetupScreen({Key? key}) : super(key: key);

  @override
  State<WalletSetupScreen> createState() => _WalletSetupScreenState();
}

class _WalletSetupScreenState extends State<WalletSetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cashController = TextEditingController();
  final _walletNameController = TextEditingController();
  final _walletAmountController = TextEditingController();
  final _notificationNameController = TextEditingController();
  final _smsCodeController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  XFile? _cashWalletImage;
  XFile? _paymentWalletImage;
  bool _hasAppNotification = false;
  bool _hasSMSCode = false;
  bool _isLoading = false;
  int _currentStep = 0;

  @override
  void dispose() {
    _cashController.dispose();
    _walletNameController.dispose();
    _walletAmountController.dispose();
    _notificationNameController.dispose();
    _smsCodeController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(bool isCashWallet) async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 512,
      maxHeight: 512,
      imageQuality: 85,
    );
    
    if (image != null) {
      setState(() {
        if (isCashWallet) {
          _cashWalletImage = image;
        } else {
          _paymentWalletImage = image;
        }
      });
    }
  }

  Future<void> _submitWallets() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final wallets = [
        Wallet(
          name: 'Cash',
          initialAmount: double.parse(_cashController.text),
          currentAmount: double.parse(_cashController.text),
          isDefault: true,
        ),
        Wallet(
          name: _walletNameController.text,
          initialAmount: double.parse(_walletAmountController.text),
          currentAmount: double.parse(_walletAmountController.text),
          hasAppNotification: _hasAppNotification,
          notificationName: _hasAppNotification ? _notificationNameController.text : null,
          hasSMSCode: _hasSMSCode,
          smsCode: _hasSMSCode ? _smsCodeController.text : null,
          isDefault: false,
        ),
      ];

      final images = [_cashWalletImage, _paymentWalletImage];

      await walletService.createWalletsWithImages(wallets, images);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Wallets created successfully!')),
        );
        Navigator.pushReplacementNamed(context, '/dashboard');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Widget _buildImagePicker(bool isCashWallet) {
    final image = isCashWallet ? _cashWalletImage : _paymentWalletImage;
    
    return GestureDetector(
      onTap: () => _pickImage(isCashWallet),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300, width: 2),
          borderRadius: BorderRadius.circular(12),
          color: Colors.grey.shade50,
        ),
        child: image != null
            ? ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.file(File(image.path), fit: BoxFit.cover),
              )
            : Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_photo_alternate, size: 40, color: Colors.grey.shade400),
                  SizedBox(height: 8),
                  Text('Add Wallet Icon (Optional)', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setup Your Wallets'),
      ),
      body: Form(
        key: _formKey,
        child: Stepper(
          currentStep: _currentStep,
          onStepContinue: () {
            if (_currentStep == 0) {
              if (_formKey.currentState!.validate()) {
                setState(() => _currentStep = 1);
              }
            } else {
              _submitWallets();
            }
          },
          onStepCancel: () {
            if (_currentStep > 0) {
              setState(() => _currentStep -= 1);
            }
          },
          controlsBuilder: (context, details) {
            return Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Row(
                children: [
                  ElevatedButton(
                    onPressed: _isLoading ? null : details.onStepContinue,
                    child: _isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_currentStep == 1 ? 'Finish' : 'Continue'),
                  ),
                  if (_currentStep > 0) ...[
                    const SizedBox(width: 12),
                    TextButton(
                      onPressed: _isLoading ? null : details.onStepCancel,
                      child: const Text('Back'),
                    ),
                  ],
                ],
              ),
            );
          },
          steps: [
            Step(
              title: const Text('Cash Wallet'),
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildImagePicker(true),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _cashController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Cash Amount',
                      prefixIcon: const Icon(Icons.attach_money),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter cash amount';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Please enter a valid number';
                      }
                      return null;
                    },
                  ),
                ],
              ),
              isActive: _currentStep >= 0,
            ),
            Step(
              title: const Text('Payment Wallet'),
              content: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildImagePicker(false),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _walletNameController,
                    decoration: InputDecoration(
                      labelText: 'Wallet Name',
                      hintText: 'e.g., JazzCash, Easypaisa',
                      prefixIcon: const Icon(Icons.account_balance_wallet),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter wallet name';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _walletAmountController,
                    keyboardType: TextInputType.number,
                    decoration: InputDecoration(
                      labelText: 'Initial Amount',
                      prefixIcon: const Icon(Icons.attach_money),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Please enter initial amount';
                      }
                      if (double.tryParse(value) == null) {
                        return 'Please enter a valid number';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Has App Notifications'),
                    value: _hasAppNotification,
                    onChanged: (value) => setState(() => _hasAppNotification = value),
                  ),
                  if (_hasAppNotification) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notificationNameController,
                      decoration: InputDecoration(
                        labelText: 'Notification Name',
                        prefixIcon: const Icon(Icons.notifications),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SwitchListTile(
                    title: const Text('Has SMS Code'),
                    value: _hasSMSCode,
                    onChanged: (value) => setState(() => _hasSMSCode = value),
                  ),
                  if (_hasSMSCode) ...[
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _smsCodeController,
                      decoration: InputDecoration(
                        labelText: 'SMS Code',
                        hintText: 'e.g., JC-, EP-',
                        prefixIcon: const Icon(Icons.sms),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              isActive: _currentStep >= 1,
            ),
          ],
        ),
      ),
    );
  }
}
```

### 6. Update Login Flow

```dart
// After successful login
if (response.data['success']) {
  await storage.write(key: 'access_token', value: response.data['token']);
  
  final wallets = await walletService.getWallets();
  
  if (wallets.isEmpty) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const WelcomeScreen()),
    );
  } else {
    Navigator.pushReplacementNamed(context, '/dashboard');
  }
}
```

---

## 🎨 Image Specifications

- **Formats**: jpeg, jpg, png, gif, webp
- **Max Size**: 5MB per image
- **Recommended**: 512x512px, 85% quality
- **Storage**: `uploads/wallets/`
- **Access**: `http://localhost:5000/uploads/wallets/filename.png`

---

## ✅ Testing

1. Login with new user
2. Welcome screen appears
3. Complete Step 1 (Cash wallet with optional image)
4. Complete Step 2 (Payment wallet with optional image)
5. Submit creates both wallets
6. Images saved and accessible
7. Navigate to dashboard
8. Logout and login again
9. Goes directly to dashboard

---

## 🔑 Key Points

- `hasImage` flag determines which wallets receive images
- Images uploaded in order of wallets with `hasImage: true`
- Images are optional for all wallets
- Default "Cash" wallet cannot be deleted
- All endpoints require authentication
- Soft delete preserves data

---

## 📞 Support

For issues, check:
- Backend logs for upload errors
- Network requests in Flutter DevTools
- Image file sizes and formats
- Authentication token validity
