import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:badges/badges.dart' as badges;
import 'package:flutter_lucide/flutter_lucide.dart';
import '../providers/cart_provider.dart';
import '../screens/cart_screen.dart';

class CartIconWithBadge extends StatelessWidget {
  final Color color;
  final bool compact;
  final double size;

  const CartIconWithBadge(
      {super.key,
      this.color = Colors.white,
      this.compact = false,
      this.size = 22});

  @override
  Widget build(BuildContext context) {
    return Consumer<CartProvider>(
      builder: (context, cart, child) {
        return Padding(
          padding:
              compact ? EdgeInsets.zero : const EdgeInsets.only(right: 12.0),
          child: GestureDetector(
            onTap: () {
              Navigator.of(context, rootNavigator: true).push(
                MaterialPageRoute(builder: (context) => const CartScreen()),
              );
            },
            child: badges.Badge(
              showBadge: cart.itemCount > 0,
              badgeContent: Text(
                '${cart.itemCount}',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.bold),
              ),
              badgeStyle: const badges.BadgeStyle(
                badgeColor: Color(0xFFF43F5E), // Coral Pink badge
                padding: EdgeInsets.all(5),
              ),
              position: badges.BadgePosition.topEnd(top: -4, end: -4),
              child: Icon(
                LucideIcons.shopping_cart,
                color: color,
                size: size,
              ),
            ),
          ),
        );
      },
    );
  }
}
