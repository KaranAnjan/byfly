import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import '../screens/cart_screen.dart';

void showCartFeedback(BuildContext context, {required bool added}) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  final toast = messenger.showSnackBar(
    SnackBar(
      behavior: SnackBarBehavior.floating,
      // Scaffold automatically places SnackBars above its bottom bar.
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      backgroundColor:
          added ? const Color(0xFF064E3B) : const Color(0xFF33483A),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      duration: const Duration(milliseconds: 1300),
      content: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: .14),
              shape: BoxShape.circle,
            ),
            child: Icon(
              added ? LucideIcons.check : Icons.delete_outline,
              color: Colors.white,
              size: 16,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              added ? 'Added to your cart' : 'Removed from your cart',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
          ),
        ],
      ),
      action: added
          ? SnackBarAction(
              label: 'VIEW CART',
              textColor: const Color(0xFFDCEBDD),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const CartScreen()),
                );
              },
            )
          : null,
    ),
  );
  Future.delayed(const Duration(milliseconds: 1300), () => toast.close());
}
