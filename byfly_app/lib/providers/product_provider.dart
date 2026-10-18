import 'package:flutter/material.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../core/api_client.dart';

class ProductProvider extends ChangeNotifier {
  List<Product> _products = [];
  List<Product> _featuredProducts = [];
  List<Category> _categories = [];
  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasMoreProducts = true;
  int _productPage = 0;
  String? _error;

  List<Product> get products => _products;
  List<Product> get featuredProducts => _featuredProducts;
  List<Category> get categories => _categories;
  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasMoreProducts => _hasMoreProducts;
  String? get error => _error;

  Future<void> fetchCategories() async {
    try {
      final data = await ApiClient.getJson('/categories');
      _categories =
          (data as List).map((json) => Category.fromJson(json)).toList();
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
    }
  }

  Future<void> fetchProducts({String? categoryId}) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      if (_categories.isEmpty) await fetchCategories();

      final data = await ApiClient.getJson(
          '/products?paginated=true&page=1&limit=50${categoryId == null ? '' : '&category_id=${Uri.encodeQueryComponent(categoryId)}'}');
      final items =
          data is Map ? (data['items'] as List? ?? []) : (data as List);
      _products = items.map((json) => Product.fromJson(json)).toList();
      // Keep the unfiltered catalogue for the home hero. Category browsing
      // must not replace the products used by the hero carousel.
      if (categoryId == null) {
        _featuredProducts = [..._products];
      }
      _productPage = 1;
      _hasMoreProducts = data is Map ? data['has_more'] == true : false;
      debugPrint('ByFly App: Fetched ${_products.length} products');
    } catch (e) {
      debugPrint('ByFly App Fetch Error: $e');
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadMoreProducts({String? categoryId}) async {
    if (_isLoading || _isLoadingMore || !_hasMoreProducts) return;
    _isLoadingMore = true;
    notifyListeners();
    try {
      final nextPage = _productPage + 1;
      final data = await ApiClient.getJson(
          '/products?paginated=true&page=$nextPage&limit=50${categoryId == null ? '' : '&category_id=${Uri.encodeQueryComponent(categoryId)}'}');
      final items = (data['items'] as List? ?? [])
          .map((json) => Product.fromJson(json))
          .toList();
      _products = [..._products, ...items];
      _productPage = nextPage;
      _hasMoreProducts = data['has_more'] == true;
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoadingMore = false;
      notifyListeners();
    }
  }

  Future<Product?> fetchProductById(String id) async {
    try {
      final data =
          await ApiClient.getJson('/products/${Uri.encodeComponent(id)}');
      return Product.fromJson(data);
    } catch (e) {
      return null;
    }
  }
}
