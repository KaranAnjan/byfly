import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../models/product.dart';
import '../core/api_client.dart';
import '../providers/cart_provider.dart';
import '../providers/wishlist_provider.dart';
import '../screens/product_detail_screen.dart';
import 'heart_bubble.dart';
import 'cart_feedback.dart';

class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  String getImageUrl(dynamic path) {
    if (path == null) return '';
    final pathString = path.toString();
    if (pathString.isEmpty) return '';
    return ApiClient.imageUrl(pathString);
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context, rootNavigator: true).push(
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(product: product),
          ),
        );
      },
      child: Card(
        elevation: 0,
        color: Colors.white,
        margin: EdgeInsets.zero,
        shadowColor: Colors.black12,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 142,
              child: Stack(
                children: [
                  ClipRRect(
                    borderRadius:
                        const BorderRadius.vertical(top: Radius.circular(18)),
                    child: SizedBox.expand(
                      child: Hero(
                        tag: 'product-${product.id}',
                        child: product.imageUrl != null
                            ? CachedNetworkImage(
                                imageUrl: getImageUrl(product.imageUrl ?? ''),
                                fit: BoxFit.cover,
                                width: double.infinity,
                                height: double.infinity,
                                placeholder: (context, url) => Container(
                                  color: const Color(0xFFF0F3EB),
                                  child: const Center(
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2)),
                                ),
                                errorWidget: (context, url, error) =>
                                    const Center(
                                  child: Icon(Icons.broken_image,
                                      color: Colors.grey),
                                ),
                              )
                            : Container(
                                color: const Color(0xFFF0F3EB),
                                child: const Center(
                                  child: Icon(Icons.image,
                                      size: 40, color: Colors.grey),
                                ),
                              ),
                      ),
                    ),
                  ),
                  Consumer<WishlistProvider>(
                    builder: (context, wishlist, child) {
                      final isLiked = wishlist.isWishlisted(product.id);
                      return Positioned(
                        top: 6,
                        right: 6,
                        child: Builder(
                          builder: (iconContext) => GestureDetector(
                            onTap: () {
                              final wasLiked =
                                  wishlist.isWishlisted(product.id);
                              wishlist.toggleWishlist(product);
                              showHeartBubble(iconContext);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(wasLiked
                                      ? 'Removed from wishlist'
                                      : 'Added to wishlist'),
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.92),
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.1),
                                    blurRadius: 4,
                                  )
                                ],
                              ),
                              child: Icon(
                                isLiked
                                    ? Icons.favorite
                                    : Icons.favorite_border,
                                color: isLiked
                                    ? Theme.of(context).colorScheme.primary
                                    : Colors.grey,
                                size: 18,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 11, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.productName,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w600, height: 1.2),
                  ),
                  const SizedBox(height: 4),
                  const Text('Price',
                      style: TextStyle(
                          fontSize: 10,
                          color: Color(0xFF047857),
                          fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            if (product.wholesalePrice != null) ...[
                              Text(
                                '₹${product.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(width: 4),
                              if (product.mrp != null &&
                                  product.mrp! > product.price)
                                Text(
                                  '${((product.mrp! - product.price) / product.mrp! * 100).round()}% OFF',
                                  style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                  ).copyWith(
                                    color:
                                        Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                            ] else
                              const Text(
                                'Price unavailable',
                                style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                    fontWeight: FontWeight.w600),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 4),
                      Consumer<CartProvider>(
                        builder: (context, cart, child) {
                          final isInCart = cart.items.containsKey(product.id);
                          return GestureDetector(
                            onTap: () {
                              if (product.wholesalePrice != null &&
                                  product.stock >= product.minOrderQty) {
                                if (isInCart) {
                                  cart.removeItem(product.id);
                                  showCartFeedback(context, added: false);
                                } else {
                                  cart.addItem(product);
                                  showCartFeedback(context, added: true);
                                }
                              }
                            },
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: BoxDecoration(
                                color: isInCart
                                    ? Theme.of(context).colorScheme.primary
                                    : Colors.white,
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: isInCart
                                      ? Theme.of(context).colorScheme.primary
                                      : Colors.grey.shade300,
                                  width: 1.2,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.06),
                                    blurRadius: 3,
                                    offset: const Offset(0, 1),
                                  ),
                                ],
                              ),
                              child: Icon(
                                LucideIcons.shopping_cart,
                                color: isInCart
                                    ? Colors.white
                                    : Colors.grey.shade700,
                                size: 19,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    product.stock >= product.minOrderQty
                        ? 'In Stock (Min ${product.minOrderQty})'
                        : 'Out of Stock',
                    style: TextStyle(
                      fontSize: 10,
                      color: product.stock >= product.minOrderQty
                          ? Colors.green.shade700
                          : Colors.red,
                      fontWeight: FontWeight.bold,
                    ),
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
