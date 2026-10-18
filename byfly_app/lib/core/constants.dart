class AppConstants {
  // USB-connected Android phone: run `adb reverse tcp:8080 tcp:8080`.
  // Android emulator override:
  // --dart-define=BYFLY_API_BASE_URL=http://10.0.2.2:8080/api/v1
  static const String apiBaseUrl = String.fromEnvironment(
    'BYFLY_API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8080/api/v1',
  );
  static const String appName = 'ByFly Store';
  static const String appTagline = 'Fashion Jewellery & Gift Supply';
  static const String contactPhone = '+917407437378';
  static const List<String> adminEmails = [
    'anjankaran246@gmail.com',
    'bejbiswajit229@gmail.com',
  ];

  static const List<String> indianStates = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
  ];
}
