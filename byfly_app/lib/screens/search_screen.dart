import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/product.dart';
import '../core/api_client.dart';
import '../widgets/product_card.dart';

class SearchScreen extends StatefulWidget {
  final String initialQuery;

  const SearchScreen({super.key, this.initialQuery = ''});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  static const _recentKey = 'byfly_recent_searches';
  late final TextEditingController _controller;
  late final FocusNode _focusNode;
  late final ScrollController _resultsController;
  Timer? _debounce;
  List<String> _recentSearches = [];
  List<Product> _results = [];
  bool _isSearching = false;
  bool _hasMore = false;
  bool _loadingMore = false;
  int _page = 0;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: widget.initialQuery);
    _focusNode = FocusNode();
    _resultsController = ScrollController()..addListener(_onResultsScroll);
    _loadRecentSearches();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _focusNode.requestFocus();
      if (_controller.text.trim().isNotEmpty) {
        _searchProducts(_controller.text, reset: true);
      }
    });
  }

  void _onResultsScroll() {
    if (!_resultsController.hasClients || !_hasMore || _loadingMore) return;
    if (_resultsController.position.extentAfter < 500) {
      _searchProducts(_controller.text, reset: false);
    }
  }

  void _onQueryChanged(String value) {
    _debounce?.cancel();
    final query = value.trim();
    if (query.isEmpty) {
      setState(() {
        _results = [];
        _page = 0;
        _hasMore = false;
        _isSearching = false;
      });
      return;
    }
    setState(() => _isSearching = true);
    _debounce = Timer(const Duration(milliseconds: 400), () {
      _searchProducts(query, reset: true);
    });
  }

  Future<void> _searchProducts(String query, {required bool reset}) async {
    final term = query.trim();
    if (term.isEmpty || (!reset && (!_hasMore || _loadingMore))) return;
    if (reset) {
      setState(() {
        _isSearching = true;
        _results = [];
        _page = 0;
        _hasMore = false;
      });
    } else {
      setState(() => _loadingMore = true);
    }

    final nextPage = reset ? 1 : _page + 1;
    try {
      final data = await ApiClient.getJson(
          '/products/search?q=${Uri.encodeQueryComponent(term)}&page=$nextPage&limit=20');
      final items = (data['items'] as List? ?? [])
          .map((json) => Product.fromJson(json as Map<String, dynamic>))
          .toList();
      if (!mounted) return;
      setState(() {
        _results = reset ? items : [..._results, ...items];
        _page = nextPage;
        _hasMore = data['has_more'] == true;
        _isSearching = false;
        _loadingMore = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isSearching = false;
        _loadingMore = false;
      });
    }
  }

  Future<void> _loadRecentSearches() async {
    final preferences = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _recentSearches = preferences.getStringList(_recentKey) ?? [];
    });
  }

  Future<void> _saveSearch(String value) async {
    final query = value.trim();
    if (query.isEmpty) return;
    final preferences = await SharedPreferences.getInstance();
    final searches = [
      query,
      ..._recentSearches
          .where((item) => item.toLowerCase() != query.toLowerCase()),
    ].take(8).toList();
    await preferences.setStringList(_recentKey, searches);
    if (mounted) setState(() => _recentSearches = searches);
  }

  Future<void> _clearRecentSearches() async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.remove(_recentKey);
    if (mounted) setState(() => _recentSearches = []);
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _debounce?.cancel();
    _resultsController
      ..removeListener(_onResultsScroll)
      ..dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const cream = Color(0xFFF6F6EF);
    final green = Theme.of(context).colorScheme.primary;

    return Scaffold(
      backgroundColor: cream,
      body: Column(
        children: [
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(4, 10, 12, 10),
              child: Row(
                children: [
                  IconButton(
                    tooltip: 'Back',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: Icon(Icons.arrow_back, color: green),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      focusNode: _focusNode,
                      onChanged: _onQueryChanged,
                      onSubmitted: _saveSearch,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Search products or codes...',
                        prefixIcon: Icon(LucideIcons.search, color: green),
                        suffixIcon: _controller.text.isEmpty
                            ? null
                            : IconButton(
                                icon: const Icon(Icons.close),
                                onPressed: () {
                                  _controller.clear();
                                  _onQueryChanged('');
                                  _focusNode.requestFocus();
                                },
                              ),
                        filled: true,
                        fillColor: const Color(0xFFDCEBDD),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(18),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: _controller.text.trim().isEmpty
                ? _buildRecentSearches(context)
                : _isSearching && _results.isEmpty
                    ? const Center(child: CircularProgressIndicator())
                    : _results.isEmpty
                        ? const Center(
                            child: Text('No products found.'),
                          )
                        : GridView.builder(
                            controller: _resultsController,
                            padding: const EdgeInsets.fromLTRB(12, 8, 12, 24),
                            gridDelegate:
                                const SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: 2,
                              mainAxisExtent: 300,
                              crossAxisSpacing: 8,
                              mainAxisSpacing: 8,
                            ),
                            itemCount: _results.length + (_hasMore ? 1 : 0),
                            itemBuilder: (context, index) {
                              if (index >= _results.length) {
                                return const Center(
                                    child: CircularProgressIndicator());
                              }
                              return ProductCard(product: _results[index]);
                            },
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentSearches(BuildContext context) {
    if (_recentSearches.isEmpty) {
      return const Center(
        child: Text(
          'Search products by name or code',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Recent searches',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            TextButton(
              onPressed: _clearRecentSearches,
              child: const Text('Clear'),
            ),
          ],
        ),
        ..._recentSearches.map(
          (search) => ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.history, color: Colors.grey),
            title: Text(search),
            onTap: () {
              _controller
                ..text = search
                ..selection = TextSelection.collapsed(offset: search.length);
              setState(() {});
              _focusNode.requestFocus();
            },
          ),
        ),
      ],
    );
  }
}
