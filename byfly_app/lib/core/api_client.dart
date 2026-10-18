import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'constants.dart';

class ApiClient {
  static const _timeout = Duration(seconds: 15);

  static Future<Map<String, String>> _headers() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'Content-Type': 'application/json',
      if (prefs.getString('byfly_user_id') != null) 'X-User-ID': prefs.getString('byfly_user_id')!,
      if (prefs.getString('byfly_user_email') != null) 'X-User-Email': prefs.getString('byfly_user_email')!,
      if (prefs.getString('byfly_token') != null) 'Authorization': 'Bearer ${prefs.getString('byfly_token')}',
    };
  }

  static Future<dynamic> getJson(String path) async {
    late final http.Response response;
    try {
      response = await http
          .get(Uri.parse('${AppConstants.apiBaseUrl}$path'), headers: await _headers())
          .timeout(_timeout);
    } on http.ClientException catch (e) {
      throw Exception('Cannot connect to ByFly backend. Check the phone API connection: ${e.message}');
    } on TimeoutException {
      throw Exception('ByFly backend connection timed out. Check that the backend is running.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception('API request failed (${response.statusCode})');
    }
    return jsonDecode(response.body);
  }

  static Future<dynamic> sendJson(String path, {String method = 'POST', Map<String, dynamic>? body}) async {
    late final http.Response response;
    try {
      response = method == 'PUT'
          ? await http.put(Uri.parse('${AppConstants.apiBaseUrl}$path'), headers: await _headers(), body: body == null ? null : jsonEncode(body)).timeout(_timeout)
          : await http.post(Uri.parse('${AppConstants.apiBaseUrl}$path'), headers: await _headers(), body: body == null ? null : jsonEncode(body)).timeout(_timeout);
    } on http.ClientException catch (e) {
      throw Exception('Cannot connect to ByFly backend. Check the phone API connection: ${e.message}');
    } on TimeoutException {
      throw Exception('ByFly backend connection timed out. Check that the backend is running.');
    }
    if (response.statusCode < 200 || response.statusCode >= 300) throw Exception('API request failed (${response.statusCode})');
    return response.body.isEmpty ? null : jsonDecode(response.body);
  }

  static String imageUrl(String? value) {
    if (value == null || value.isEmpty) return '';
    final uri = Uri.tryParse(value);
    if (uri != null && uri.hasScheme && uri.host.isNotEmpty) {
      if (uri.host.contains('.s3.') || uri.host.startsWith('s3.')) {
        return '${AppConstants.apiBaseUrl}/images/${uri.pathSegments.map(Uri.encodeComponent).join('/')}';
      }
      return value;
    }
    return '${AppConstants.apiBaseUrl}/images/${value.replaceFirst(RegExp(r'^/+'), '')}';
  }
}
