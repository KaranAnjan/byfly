import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/wishlist_provider.dart';
import '../widgets/product_card.dart';
import '../widgets/cart_icon_with_badge.dart';
import 'login_screen.dart';
import '../core/api_client.dart';

class OrdersWishlistScreen extends StatefulWidget {
  final bool wishlistOnly;
  final bool ordersOnly;

  const OrdersWishlistScreen({
    super.key,
    this.wishlistOnly = false,
    this.ordersOnly = false,
  });

  @override
  State<OrdersWishlistScreen> createState() => _OrdersWishlistScreenState();
}

class _OrdersWishlistScreenState extends State<OrdersWishlistScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _orders = [];
  bool _isLoadingOrders = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _fetchOrders();
  }

  Future<void> _fetchOrders() async {
    setState(() => _isLoadingOrders = true);
    try {
      final data = await ApiClient.getJson('/orders');

      if (mounted) {
        setState(() => _orders = List<Map<String, dynamic>>.from(data));
      }
    } catch (e) {
      debugPrint('Error fetching orders: $e');
    } finally {
      if (mounted) setState(() => _isLoadingOrders = false);
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Image.asset(
              'assets/images/newlogo.png',
              height: 26,
              errorBuilder: (context, error, stackTrace) =>
                  const Icon(LucideIcons.package),
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
        actions: widget.wishlistOnly || widget.ordersOnly
            ? null
            : const [CartIconWithBadge()],
        bottom: widget.wishlistOnly || widget.ordersOnly
            ? null
            : TabBar(
                controller: _tabController,
                indicatorColor: Colors.white,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white70,
                tabs: const [
                  Tab(
                      icon: Icon(LucideIcons.package, size: 20),
                      text: 'My Orders'),
                  Tab(
                      icon: Icon(LucideIcons.heart, size: 20),
                      text: 'Wishlist'),
                ],
              ),
      ),
      body: widget.wishlistOnly
          ? _buildWishlistTab()
          : widget.ordersOnly
              ? _buildOrdersTab(auth)
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _buildOrdersTab(auth),
                    _buildWishlistTab(),
                  ],
                ),
    );
  }

  Widget _buildOrdersTab(AuthProvider auth) {
    if (!auth.isAuthenticated) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.package, size: 70, color: Colors.grey),
            const SizedBox(height: 16),
            const Text('Login to view your orders',
                style: TextStyle(fontSize: 16, color: Colors.grey)),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const LoginScreen()),
              ).then((_) => _fetchOrders()),
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
              ),
              child: const Text('Login / Sign Up'),
            ),
          ],
        ),
      );
    }

    if (_isLoadingOrders) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_orders.isEmpty) {
      return RefreshIndicator(
        onRefresh: _fetchOrders,
        child: ListView(
          children: const [
            SizedBox(height: 120),
            Center(
              child: Column(
                children: [
                  Icon(LucideIcons.package_open, size: 70, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('No orders placed yet!',
                      style: TextStyle(fontSize: 16, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchOrders,
      child: ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: _orders.length,
        itemBuilder: (context, index) {
          final order = _orders[index];
          final createdAt = order['created_at'] != null
              ? DateFormat('dd MMM yyyy, hh:mm a')
                  .format(DateTime.parse(order['created_at']))
              : '';
          final items = order['order_items'] as List? ?? [];
          final status = order['status'] ?? 'pending';

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Order #${order['order_number'] ?? order['id'].toString().substring(0, 8)}',
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color:
                              _getStatusColor(status).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          status.toString().toUpperCase(),
                          style: TextStyle(
                            color: _getStatusColor(status),
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(createdAt,
                      style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  const Divider(height: 20),
                  ...items.map((item) {
                    final product = item['products'];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              "${product != null ? product['product_name'] : 'Item'} (x${item['quantity']})",
                              style: const TextStyle(fontSize: 14),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Text(
                              '₹${(item['price'] * item['quantity']).toStringAsFixed(0)}'),
                        ],
                      ),
                    );
                  }),
                  const Divider(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount:',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(
                        '₹${(order['total_amount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return Colors.green;
      case 'cancelled':
        return Colors.red;
      case 'processing':
      case 'shipped':
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  Widget _buildWishlistTab() {
    return Consumer<WishlistProvider>(
      builder: (context, wishlist, child) {
        if (wishlist.wishlistItems.isEmpty) {
          return const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(LucideIcons.heart, size: 70, color: Colors.grey),
                SizedBox(height: 16),
                Text('Your wishlist is empty!',
                    style: TextStyle(fontSize: 16, color: Colors.grey)),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisExtent: 300,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
          ),
          itemCount: wishlist.wishlistItems.length,
          itemBuilder: (context, index) {
            return ProductCard(product: wishlist.wishlistItems[index]);
          },
        );
      },
    );
  }
}
