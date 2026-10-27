import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/product.dart';
import '../core/constants.dart';
import '../core/api_client.dart';
import '../providers/cart_provider.dart';
import '../providers/wishlist_provider.dart';
import '../widgets/heart_bubble.dart';
import '../widgets/cart_feedback.dart';
import 'cart_screen.dart';
import '../widgets/liquid_glass.dart';

class ProductDetailScreen extends StatefulWidget {
  final Product product;

  const ProductDetailScreen({super.key, required this.product});

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  late int _quantity;

  Product get product => widget.product;

  int get totalQuantity => _quantity;

  @override
  void initState() {
    super.initState();
    _quantity = product.minOrderQty;
  }

  String getImageUrl(String path) {
    return ApiClient.imageUrl(path);
  }

  void _launchWhatsApp(BuildContext context) async {
    final phone = AppConstants.contactPhone.replaceAll(RegExp(r'[^0-9]'), '');
    final message =
        "Hi ByFly Store, I am interested in:\n\nProduct: ${product.productName}\nCode: ${product.productCode}\nPrice: ₹${product.price.toStringAsFixed(0)}";

    final url =
        Uri.parse("https://wa.me/$phone?text=${Uri.encodeComponent(message)}");

    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } else {
        final whatsappUrl = Uri.parse(
            "whatsapp://send?phone=$phone&text=${Uri.encodeComponent(message)}");
        await launchUrl(whatsappUrl);
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Could not launch WhatsApp")),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    const cream = Color(0xFFF5F1E7);
    return Scaffold(
      backgroundColor: cream,
      extendBodyBehindAppBar: true,
      extendBody: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.maybePop(context),
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Back',
        ),
        actions: [
          Consumer<WishlistProvider>(
            builder: (context, wishlist, child) {
              final isLiked = wishlist.isWishlisted(product.id);
              return IconButton(
                onPressed: () {
                  final wasLiked = wishlist.isWishlisted(product.id);
                  wishlist.toggleWishlist(product);
                  showHeartBubble(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(wasLiked
                          ? 'Removed from wishlist'
                          : 'Added to wishlist'),
                      duration: const Duration(seconds: 1),
                    ),
                  );
                },
                icon: Icon(
                  isLiked ? Icons.favorite : Icons.favorite_border,
                  color: Colors.white,
                  size: 27,
                ),
                tooltip: 'Wishlist',
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 150),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                Container(
                  height: 510,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius:
                        BorderRadius.vertical(bottom: Radius.circular(28)),
                  ),
                  child: Hero(
                    tag: 'product-${product.id}',
                    child: _ProductGallery(product: product),
                  ),
                ),
              ],
            ),
            Transform.translate(
              offset: const Offset(0, -24),
              child: Container(
                padding: const EdgeInsets.fromLTRB(20, 26, 20, 30),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (product.categoryName != null)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5F2E9),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          product.categoryName!,
                          style: const TextStyle(
                              color: Color(0xFF047857),
                              fontSize: 12,
                              fontWeight: FontWeight.bold),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(
                      product.productName,
                      style: const TextStyle(
                          fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Product Code: ${product.productCode}',
                      style: TextStyle(color: Colors.grey[600], fontSize: 14),
                    ),
                    const SizedBox(height: 16),
                    const Text('Price',
                        style: TextStyle(
                            fontSize: 13,
                            color: Color(0xFF047857),
                            fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    if (product.wholesalePrice != null)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            '₹${product.price.toStringAsFixed(0)}',
                            style: const TextStyle(
                                fontSize: 28, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(width: 12),
                          if (product.mrp != null &&
                              product.mrp! > product.price) ...[
                            Text(
                              '₹${product.mrp!.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 16,
                                color: Colors.grey,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${((product.mrp! - product.price) / product.mrp! * 100).round()}% OFF',
                              style: TextStyle(
                                fontSize: 14,
                                color: Theme.of(context).colorScheme.primary,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ],
                      )
                    else
                      const Text('Price on request',
                          style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey,
                              fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: product.stock >= product.minOrderQty
                            ? Colors.green[50]
                            : Colors.red[50],
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        product.stock >= product.minOrderQty
                            ? '✓ In Stock'
                            : '✗ Out of Stock',
                        style: TextStyle(
                          color: product.stock >= product.minOrderQty
                              ? Colors.green[800]
                              : Colors.red[800],
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE5F2E9),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Order quantity (Min ${product.minOrderQty})',
                                      style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700),
                                    ),
                                    SizedBox(height: 3),
                                    Text('Select the number of pieces',
                                        style: TextStyle(
                                            color: Color(0xFF718078),
                                            fontSize: 11)),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: _quantity > product.minOrderQty
                                    ? () => setState(() => _quantity--)
                                    : null,
                                icon: const Icon(Icons.remove),
                                visualDensity: VisualDensity.compact,
                              ),
                              Text('$_quantity',
                                  style: const TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800)),
                              IconButton(
                                onPressed: () => setState(() => _quantity++),
                                icon: const Icon(Icons.add),
                                visualDensity: VisualDensity.compact,
                              ),
                            ],
                          ),
                          if (product.wholesalePrice != null) ...[
                            const Divider(height: 18),
                            Row(
                              children: [
                                const Text(
                                  'Order total',
                                  style: TextStyle(
                                    color: Color(0xFF31513E),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                                const Spacer(),
                                Text(
                                  '₹${(product.price * _quantity).toStringAsFixed(0)}',
                                  style: TextStyle(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                    fontSize: 20,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (product.wholesalePrice == null &&
                        product.price < 0) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE5F2E9),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFB7C9BD)),
                        ),
                        child: Row(
                          children: [
                            const Text(
                              'Order total',
                              style: TextStyle(
                                color: Color(0xFF31513E),
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '₹${(product.price * _quantity).toStringAsFixed(0)}',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.primary,
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (product.description != null &&
                        product.description!.trim().isNotEmpty) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Description',
                        style: TextStyle(
                            fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        product.description!.trim(),
                        style: TextStyle(
                            fontSize: 14, color: Colors.grey[800], height: 1.4),
                      ),
                    ],
                    const SizedBox(height: 24),
                    const Text(
                      'Customer Support & Enquiry',
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => _launchWhatsApp(context),
                        icon: const Icon(LucideIcons.message_circle),
                        label: const Text('WhatsApp Enquiry'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              Colors.green.shade700.withValues(alpha: .62),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          elevation: 0,
                          side: BorderSide(
                            color: Colors.white.withValues(alpha: .55),
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
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
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: LiquidGlass(
          tint: const Color(0xFF064E3B),
          opacity: .82,
          borderOpacity: .14,
          borderRadius: BorderRadius.circular(26),
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: Consumer<CartProvider>(
                  builder: (context, cart, child) {
                    final isInCart = cart.items.containsKey(product.id);
                    return OutlinedButton(
                      onPressed: product.stock >= product.minOrderQty
                          ? () {
                              if (isInCart) {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (context) => const CartScreen()),
                                );
                              } else {
                                cart.addItem(product, quantity: totalQuantity);
                                showCartFeedback(context, added: true);
                              }
                            }
                          : null,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        side: const BorderSide(
                          color: Color(0xFF064E3B),
                          width: 1.2,
                        ),
                        backgroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16)),
                      ),
                      child: Text(
                        isInCart ? 'GO TO CART' : 'ADD TO CART',
                        style: const TextStyle(
                            color: Colors.black, fontWeight: FontWeight.bold),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: product.stock >= product.minOrderQty
                      ? () {
                          final cart = context.read<CartProvider>();
                          if (!cart.items.containsKey(product.id)) {
                            cart.addItem(product, quantity: totalQuantity);
                          }
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => const CartScreen()),
                          );
                        }
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    side: const BorderSide(
                      color: Colors.white,
                      width: 1.2,
                    ),
                    elevation: 0,
                  ),
                  child: const Text('BUY NOW',
                      style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductGallery extends StatefulWidget {
  final Product product;
  const _ProductGallery({required this.product});

  @override
  State<_ProductGallery> createState() => _ProductGalleryState();
}

class _ProductGalleryState extends State<_ProductGallery> {
  int selected = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.product.imageUrls.isNotEmpty
        ? widget.product.imageUrls
        : (widget.product.imageUrl == null
            ? <String>[]
            : [widget.product.imageUrl ?? '']);
    final active =
        images.isEmpty ? null : images[selected.clamp(0, images.length - 1)];
    return Stack(
      fit: StackFit.expand,
      children: [
        active == null
            ? const Icon(Icons.image, size: 80, color: Colors.grey)
            : CachedNetworkImage(
                imageUrl: ApiClient.imageUrl(active),
                fit: BoxFit.cover,
                width: double.infinity,
                height: double.infinity,
                placeholder: (context, url) =>
                    const Center(child: CircularProgressIndicator()),
                errorWidget: (context, url, error) => const Icon(
                    Icons.broken_image,
                    size: 60,
                    color: Colors.grey),
              ),
        if (images.length > 1)
          Positioned(
            left: 16,
            right: 16,
            bottom: 18,
            child: SizedBox(
              height: 68,
              child: ListView.separated(
                padding: EdgeInsets.zero,
                scrollDirection: Axis.horizontal,
                itemCount: images.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) => GestureDetector(
                  onTap: () => setState(() => selected = index),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(9),
                      child: CachedNetworkImage(
                          imageUrl: ApiClient.imageUrl(images[index]),
                          fit: BoxFit.cover),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
