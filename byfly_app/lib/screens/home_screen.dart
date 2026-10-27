import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:shimmer/shimmer.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../providers/product_provider.dart';
import '../providers/wishlist_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/cart_icon_with_badge.dart';
import 'profile_screen.dart';
import 'product_detail_screen.dart';
import 'orders_wishlist_screen.dart';
import 'cart_screen.dart';
import 'search_screen.dart';
import '../models/product.dart';
import '../models/category.dart';
import '../core/api_client.dart';
import '../widgets/liquid_glass.dart';

// Retained for backwards-compatible category data handling.
// ignore: unused_element
String _getCategoryEmoji(String name) {
  final lowerName = name.toLowerCase();
  if (lowerName.contains('jewel')) return '💍';
  if (lowerName.contains('gift')) return '🎁';
  if (lowerName.contains('cosmetic')) return '💄';
  if (lowerName.contains('special')) return '✨';
  if (lowerName.contains('home')) return '🏠';
  if (lowerName.contains('fashion')) return '👕';
  if (lowerName.contains('all')) return '🛍️';
  return '📦';
}

IconData _getCategoryIcon(String name) {
  final lowerName = name.toLowerCase();
  if (lowerName.contains('jewel')) return LucideIcons.gem;
  if (lowerName.contains('gift')) return LucideIcons.gift;
  if (lowerName.contains('cosmetic') || lowerName.contains('beauty')) {
    return LucideIcons.sparkles;
  }
  if (lowerName.contains('home')) return LucideIcons.house;
  if (lowerName.contains('fashion')) return LucideIcons.shirt;
  if (lowerName.contains('all')) return LucideIcons.layout_grid;
  return LucideIcons.package;
}

String _toSentenceCase(String text) {
  if (text.isEmpty) return text;
  return text.split(' ').map((word) {
    if (word.isEmpty) return word;
    return word[0].toUpperCase() + word.substring(1).toLowerCase();
  }).join(' ');
}

String _getImageUrl(dynamic path) {
  if (path == null) return '';
  final pathString = path.toString();
  if (pathString.isEmpty) return '';
  return ApiClient.imageUrl(pathString);
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  static const _pageBackground = Color(0xFF064E3B);
  int _currentIndex = 0;
  String _searchTerm = '';
  String? _homeSelectedCategoryId;
  late final AnimationController _pageTransitionController;
  late final Animation<double> _pageOpacity;
  late final Animation<Offset> _pageOffset;
  final GlobalKey<NavigatorState> _categoriesNavigatorKey =
      GlobalKey<NavigatorState>();

  @override
  void initState() {
    super.initState();
    _pageTransitionController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 260),
    );
    final curve = CurvedAnimation(
      parent: _pageTransitionController,
      curve: Curves.easeOutCubic,
    );
    _pageOpacity = Tween<double>(begin: .72, end: 1).animate(curve);
    _pageOffset = Tween<Offset>(
      begin: const Offset(.035, 0),
      end: Offset.zero,
    ).animate(curve);
    _pageTransitionController.value = 1;
    context.read<ProductProvider>().fetchProducts();
  }

  @override
  void dispose() {
    _pageTransitionController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;

        if (_currentIndex == 1) {
          final navigator = _categoriesNavigatorKey.currentState;
          if (navigator != null && navigator.canPop()) {
            navigator.pop();
            return;
          }
        }

        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
        } else {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        extendBody: true,
        backgroundColor: _pageBackground,
        appBar: null,
        body: FadeTransition(
          opacity: _pageOpacity,
          child: SlideTransition(
            position: _pageOffset,
            child: IndexedStack(
              index: _currentIndex,
              children: [
                HomeContent(
                  searchTerm: _searchTerm,
                  selectedCategoryId: _homeSelectedCategoryId,
                  onSearchChanged: (value) =>
                      setState(() => _searchTerm = value),
                  onCategorySelected: (id) {
                    setState(() => _homeSelectedCategoryId = id);
                    context
                        .read<ProductProvider>()
                        .fetchProducts(categoryId: id);
                  },
                ),
                CategoriesTabNavigator(
                  navigatorKey: _categoriesNavigatorKey,
                ),
                const OrdersWishlistScreen(wishlistOnly: true),
                CartScreen(onBack: () => setState(() => _currentIndex = 0)),
                const ProfileScreen(),
              ],
            ),
          ),
        ),
        bottomNavigationBar: SafeArea(
          top: false,
          minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          child: SizedBox(
            height: 72,
            child: LiquidGlass(
              borderRadius: BorderRadius.circular(26),
              opacity: .82,
              borderOpacity: .12,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
              child: Row(
                children: [
                  _floatingNavItem(0, LucideIcons.house, 'Home'),
                  _floatingNavItem(1, LucideIcons.layout_grid, 'Categories'),
                  _floatingNavItem(2, LucideIcons.heart, 'Wishlist'),
                  _floatingNavItem(3, LucideIcons.shopping_cart, 'Cart'),
                  _floatingNavItem(4, LucideIcons.user, 'Account'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _floatingNavItem(int index, IconData icon, String label) {
    final selected = _currentIndex == index;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          if (index == 0) {
            _homeSelectedCategoryId = null;
          }
          if (_currentIndex != index) {
            if (index == 0) {
              context.read<ProductProvider>().fetchProducts();
            }
            setState(() => _currentIndex = index);
            _pageTransitionController.forward(from: 0);
          }
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          decoration: BoxDecoration(
            color: selected
                ? Colors.white.withValues(alpha: .16)
                : Colors.transparent,
            borderRadius: BorderRadius.circular(18),
          ),
          child: AnimatedScale(
            scale: selected ? 1 : .94,
            duration: const Duration(milliseconds: 220),
            curve: Curves.easeOutBack,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon,
                    size: 21, color: selected ? Colors.white : Colors.white70),
                const SizedBox(height: 4),
                Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                    color: selected ? Colors.white : Colors.white70,
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

class HomeContent extends StatelessWidget {
  final String searchTerm;
  final String? selectedCategoryId;
  final Function(String) onSearchChanged;
  final Function(String?) onCategorySelected;

  const HomeContent({
    super.key,
    required this.searchTerm,
    required this.selectedCategoryId,
    required this.onSearchChanged,
    required this.onCategorySelected,
  });

  @override
  Widget build(BuildContext context) {
    const cream = Color(0xFFF6F6EF);
    const darkGreen = Color(0xFF064E3B);
    return RefreshIndicator(
      onRefresh: () async {
        final products = context.read<ProductProvider>();
        await products.fetchCategories();
        await products.fetchProducts(force: true);
      },
      child: Container(
        color: cream,
        child: NotificationListener<ScrollNotification>(
          onNotification: (notification) {
            if (notification.metrics.extentAfter < 600) {
              context.read<ProductProvider>().loadMoreProducts(
                    categoryId: selectedCategoryId,
                  );
            }
            return false;
          },
          child: CustomScrollView(
            slivers: [
              SliverPersistentHeader(
                pinned: true,
                delegate: _PinnedHomeHeaderDelegate(
                  child: LayoutBuilder(
                    builder: (context, constraints) {
                      final progress =
                          ((130 - constraints.maxHeight) / 42).clamp(0.0, 1.0);
                      final topPadding = 32 - (progress * 22);
                      final bottomPadding = 18 - (progress * 10);
                      return Container(
                        color: darkGreen,
                        padding: EdgeInsets.fromLTRB(
                            20, topPadding, 20, bottomPadding),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            Expanded(
                              flex: 1,
                              child: Align(
                                alignment: Alignment.centerLeft,
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Image.asset(
                                      'assets/images/newlogo.png',
                                      height: 32,
                                      width: 38,
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, __, ___) => const Icon(
                                        LucideIcons.store,
                                        color: Colors.white,
                                        size: 26,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    const Text(
                                      'BYFLY',
                                      maxLines: 1,
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 14,
                                        fontWeight: FontWeight.w800,
                                        fontStyle: FontStyle.italic,
                                        letterSpacing: .8,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 3,
                              child: Hero(
                                tag: 'byfly-search-bar',
                                child: Material(
                                  color: Colors.transparent,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 14),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCEBDD),
                                      borderRadius: BorderRadius.circular(18),
                                    ),
                                    child: TextField(
                                      readOnly: true,
                                      onTap: () {
                                        Navigator.of(context).push(
                                          PageRouteBuilder(
                                            pageBuilder: (_, __, ___) =>
                                                SearchScreen(
                                              initialQuery: searchTerm,
                                            ),
                                            transitionDuration: const Duration(
                                                milliseconds: 260),
                                            reverseTransitionDuration:
                                                const Duration(
                                                    milliseconds: 220),
                                            transitionsBuilder:
                                                (_, animation, __, child) {
                                              final curved = CurvedAnimation(
                                                parent: animation,
                                                curve: Curves.easeOutCubic,
                                              );
                                              return FadeTransition(
                                                opacity: curved,
                                                child: ScaleTransition(
                                                  scale: Tween<double>(
                                                          begin: .985, end: 1)
                                                      .animate(curved),
                                                  child: child,
                                                ),
                                              );
                                            },
                                          ),
                                        );
                                      },
                                      decoration: const InputDecoration(
                                        hintText:
                                            'Search for products or codes...',
                                        hintStyle: TextStyle(
                                            color: Color(0xFF768277),
                                            fontSize: 13),
                                        border: InputBorder.none,
                                        icon: Icon(LucideIcons.search,
                                            color: Color(0xFF064E3B), size: 20),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            Expanded(
                              flex: 1,
                              child: Align(
                                alignment: Alignment.centerRight,
                                child: const CartIconWithBadge(
                                  color: Colors.white,
                                  compact: true,
                                  size: 30,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: Consumer<ProductProvider>(
                  builder: (context, provider, child) {
                    final heroProducts = provider.featuredProducts.isNotEmpty
                        ? provider.featuredProducts
                        : provider.products;
                    if (heroProducts.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    final Map<String, Product> highlightedProductsMap = {};
                    for (var product in heroProducts) {
                      if (product.categoryId != null &&
                          !highlightedProductsMap
                              .containsKey(product.categoryId)) {
                        highlightedProductsMap[product.categoryId!] = product;
                      }
                    }
                    final highlightedProducts =
                        highlightedProductsMap.values.toList();

                    return Container(
                      color: darkGreen,
                      padding: EdgeInsets.zero,
                      child:
                          FeaturedProductSlider(products: highlightedProducts),
                    );
                  },
                ),
              ),
              SliverToBoxAdapter(
                child: Consumer<ProductProvider>(
                  builder: (context, provider, child) {
                    if (provider.categories.isEmpty) {
                      return const SizedBox.shrink();
                    }
                    return SizedBox(
                      height: 145,
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: Column(
                              children: [
                                Expanded(
                                  child: Container(color: darkGreen),
                                ),
                                Expanded(
                                  child: Container(color: cream),
                                ),
                              ],
                            ),
                          ),
                          Positioned.fill(
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              padding: const EdgeInsets.fromLTRB(8, 32, 8, 4),
                              itemCount: provider.categories.length,
                              itemBuilder: (context, index) {
                                final category = provider.categories[index];
                                return _buildCategoryItem(
                                  context,
                                  id: category.id,
                                  name: category.categoryName,
                                  isSelected: selectedCategoryId == category.id,
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              Consumer<ProductProvider>(
                builder: (context, provider, child) {
                  if (provider.isLoading) {
                    return SliverPadding(
                      padding: const EdgeInsets.fromLTRB(12, 8, 12, 112),
                      sliver: SliverGrid(
                        gridDelegate:
                            const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisExtent: 300,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        delegate: SliverChildBuilderDelegate(
                          (context, index) => Shimmer.fromColors(
                            baseColor: Colors.grey[300]!,
                            highlightColor: Colors.grey[100]!,
                            child: Container(color: Colors.white),
                          ),
                          childCount: 6,
                        ),
                      ),
                    );
                  }

                  final filteredProducts = provider.products.where((p) {
                    final matchesSearch = p.productName
                            .toLowerCase()
                            .contains(searchTerm.toLowerCase()) ||
                        p.productCode
                            .toLowerCase()
                            .contains(searchTerm.toLowerCase());
                    final matchesCategory = selectedCategoryId == null ||
                        p.categoryId == selectedCategoryId;
                    return matchesSearch && matchesCategory;
                  }).toList();

                  if (filteredProducts.isEmpty) {
                    return const SliverFillRemaining(
                      child: Center(
                        child: Text('No products found.',
                            style: TextStyle(color: Colors.grey)),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.fromLTRB(12, 8, 12, 112),
                    sliver: SliverGrid(
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisExtent: 300,
                        crossAxisSpacing: 8,
                        mainAxisSpacing: 8,
                      ),
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          if (index >= filteredProducts.length) {
                            return const Center(
                                child: CircularProgressIndicator());
                          }
                          return ProductCard(product: filteredProducts[index]);
                        },
                        childCount: filteredProducts.length +
                            (provider.isLoadingMore ? 1 : 0),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryItem(BuildContext context,
      {required String? id, required String name, required bool isSelected}) {
    final displayName = _toSentenceCase(name);
    return GestureDetector(
      onTap: () => onCategorySelected(id),
      child: Container(
        width: 85,
        margin: const EdgeInsets.symmetric(horizontal: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: isSelected
                    ? const Color(0xFF0B6B4F)
                    : const Color(0xFF064E3B),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: Colors.white,
                  width: 1.2,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  )
                ],
              ),
              child: Center(
                child: Icon(
                  _getCategoryIcon(name),
                  size: 22,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              displayName,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                height: 1.0,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: const Color(0xFF33483A),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PinnedHomeHeaderDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _PinnedHomeHeaderDelegate({required this.child});

  @override
  double get minExtent => 88;

  @override
  double get maxExtent => 130;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final collapseRange = maxExtent - minExtent;
    final progress = (shrinkOffset / collapseRange).clamp(0.0, 1.0);
    final scale = 1.0 - (progress * 0.14);

    return Container(
      color: const Color(0xFF064E3B),
      child: ClipRect(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: Transform.scale(
            alignment: Alignment.bottomCenter,
            scale: scale,
            child: child,
          ),
        ),
      ),
    );
  }

  @override
  bool shouldRebuild(covariant _PinnedHomeHeaderDelegate oldDelegate) =>
      oldDelegate.child != child;
}

class FeaturedProductSlider extends StatefulWidget {
  final List<Product> products;
  const FeaturedProductSlider({super.key, required this.products});

  @override
  State<FeaturedProductSlider> createState() => _FeaturedProductSliderState();
}

class _FeaturedProductSliderState extends State<FeaturedProductSlider> {
  late PageController _pageController;
  Timer? _timer;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startTimer();
  }

  void _startTimer() {
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_pageController.hasClients && widget.products.isNotEmpty) {
        if (_currentPage < widget.products.length - 1) {
          _currentPage++;
        } else {
          _currentPage = 0;
        }
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.products.isEmpty) return const SizedBox.shrink();

    return SizedBox(
      height: 225,
      child: Column(
        children: [
          Expanded(
            child: PageView.builder(
              controller: _pageController,
              onPageChanged: (index) => setState(() => _currentPage = index),
              itemCount: widget.products.length,
              itemBuilder: (context, index) {
                final product = widget.products[index];
                return GestureDetector(
                  onTap: () {
                    Navigator.of(context, rootNavigator: true).push(
                      MaterialPageRoute(
                          builder: (context) =>
                              ProductDetailScreen(product: product)),
                    );
                  },
                  child: Container(
                    margin: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.white,
                      boxShadow: [
                        BoxShadow(
                            color: Colors.black.withValues(alpha: 0.08),
                            blurRadius: 8,
                            offset: const Offset(0, 4)),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          CachedNetworkImage(
                            imageUrl: _getImageUrl(product.imageUrl),
                            fit: BoxFit.cover,
                            placeholder: (context, url) =>
                                Container(color: Colors.grey[200]),
                            errorWidget: (context, url, error) =>
                                const Icon(Icons.image, size: 50),
                          ),
                          Container(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  Colors.black.withValues(alpha: 0.75),
                                  Colors.transparent
                                ],
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 16,
                            left: 16,
                            right: 16,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  product.categoryName?.toUpperCase() ??
                                      'FEATURED COLLECTION',
                                  style: const TextStyle(
                                      color: Colors.white70,
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 1),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  product.productName,
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          Consumer<WishlistProvider>(
                            builder: (context, wishlist, child) {
                              final isLiked = wishlist.isWishlisted(product.id);
                              return Positioned(
                                top: 12,
                                right: 12,
                                child: GestureDetector(
                                  onTap: () => wishlist.toggleWishlist(product),
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color:
                                          Colors.white.withValues(alpha: 0.9),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Icon(
                                      isLiked
                                          ? Icons.favorite
                                          : Icons.favorite_border,
                                      color: isLiked
                                          ? Theme.of(context)
                                              .colorScheme
                                              .primary
                                          : Colors.grey,
                                      size: 22,
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 5),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(
              widget.products.length,
              (index) => AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: index == _currentPage ? 16 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: index == _currentPage
                      ? Colors.white
                      : Colors.white.withValues(alpha: .45),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class CategoriesTabNavigator extends StatelessWidget {
  final GlobalKey<NavigatorState> navigatorKey;
  const CategoriesTabNavigator({super.key, required this.navigatorKey});

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: navigatorKey,
      onGenerateRoute: (settings) {
        return MaterialPageRoute(
          builder: (context) {
            if (settings.name == '/products') {
              final categoryId = settings.arguments as String;
              return CategoryProductsScreen(categoryId: categoryId);
            }
            return const CategoriesGridScreen();
          },
        );
      },
    );
  }
}

class CategoriesGridScreen extends StatelessWidget {
  const CategoriesGridScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/newlogo.png',
              height: 26,
              errorBuilder: (context, error, stackTrace) =>
                  const Icon(LucideIcons.layout_grid),
            ),
            const SizedBox(width: 8),
            const Text(
              'BYFLY',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontStyle: FontStyle.italic,
                fontSize: 18,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        centerTitle: false,
        actions: const [CartIconWithBadge()],
      ),
      body: Consumer<ProductProvider>(
        builder: (context, provider, child) {
          if (provider.categories.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: provider.categories.length,
            itemBuilder: (context, index) {
              final category = provider.categories[index];
              return _buildCategoryBanner(context, category);
            },
          );
        },
      ),
    );
  }

  Widget _buildCategoryBanner(BuildContext context, Category category) {
    return GestureDetector(
      onTap: () =>
          Navigator.of(context).pushNamed('/products', arguments: category.id),
      child: Container(
        height: 110,
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          gradient: const LinearGradient(
            colors: [Color(0xFF059669), Color(0xFF064E3B)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 6,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Stack(
          children: [
            Positioned(
              right: -15,
              bottom: -15,
              child: Opacity(
                opacity: 0.18,
                child: Icon(
                  _getCategoryIcon(category.categoryName),
                  color: Colors.white,
                  size: 90,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Container(
                    width: 54,
                    height: 54,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Icon(
                        _getCategoryIcon(category.categoryName),
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _toSentenceCase(category.categoryName),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Explore Collection',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.8),
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.arrow_forward_ios,
                    color: Colors.white,
                    size: 16,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class CategoryProductsScreen extends StatelessWidget {
  final String categoryId;
  const CategoryProductsScreen({super.key, required this.categoryId});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/newlogo.png',
              height: 26,
              errorBuilder: (context, error, stackTrace) =>
                  const Icon(LucideIcons.layout_grid),
            ),
            const SizedBox(width: 8),
            const Text(
              'BYFLY',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontStyle: FontStyle.italic,
                fontSize: 18,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        actions: const [CartIconWithBadge()],
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Consumer<ProductProvider>(
        builder: (context, provider, child) {
          final products = provider.products
              .where((p) => p.categoryId == categoryId)
              .toList();
          if (products.isEmpty) {
            return const Center(child: Text('No products in this category.'));
          }
          return GridView.builder(
            padding: const EdgeInsets.all(8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              mainAxisExtent: 300,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: products.length,
            itemBuilder: (context, index) =>
                ProductCard(product: products[index]),
          );
        },
      ),
    );
  }
}
