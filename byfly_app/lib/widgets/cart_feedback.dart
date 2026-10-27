import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

import '../screens/cart_screen.dart';

void showCartFeedback(BuildContext context, {required bool added}) {
  final overlay = Overlay.of(context, rootOverlay: true);
  late final OverlayEntry entry;

  void close() {
    if (entry.mounted) entry.remove();
  }

  entry = OverlayEntry(
    builder: (_) => _CartDynamicIsland(
      added: added,
      onClose: close,
      onViewCart: () {
        close();
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const CartScreen()),
        );
      },
    ),
  );
  overlay.insert(entry);
}

class _CartDynamicIsland extends StatefulWidget {
  final bool added;
  final VoidCallback onClose;
  final VoidCallback onViewCart;

  const _CartDynamicIsland({
    required this.added,
    required this.onClose,
    required this.onViewCart,
  });

  @override
  State<_CartDynamicIsland> createState() => _CartDynamicIslandState();
}

class _CartDynamicIslandState extends State<_CartDynamicIsland>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _scale;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 420),
      reverseDuration: const Duration(milliseconds: 260),
    );
    _scale = CurvedAnimation(parent: _controller, curve: Curves.easeOutBack);
    _controller.forward();
    _dismissTimer = Timer(const Duration(milliseconds: 2200), _dismiss);
  }

  Future<void> _dismiss() async {
    if (!mounted) return;
    await _controller.reverse();
    if (mounted) widget.onClose();
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final top = MediaQuery.paddingOf(context).top + 4;
    return Positioned(
      top: top,
      left: 32,
      right: 32,
      child: IgnorePointer(
        ignoring: !widget.added,
        child: Center(
          child: ScaleTransition(
            scale: _scale,
            child: Material(
              color: Colors.transparent,
              child: Container(
                constraints: const BoxConstraints(minHeight: 46, maxWidth: 290),
                padding: const EdgeInsets.fromLTRB(6, 5, 6, 5),
                decoration: BoxDecoration(
                  color: const Color(0xFF071C16).withValues(alpha: .96),
                  borderRadius: BorderRadius.circular(30),
                  border:
                      Border.all(color: Colors.white.withValues(alpha: .16)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: .26),
                      blurRadius: 22,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: widget.added
                            ? const Color(0xFF43C979)
                            : const Color(0xFF5D6C64),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        widget.added ? LucideIcons.check : Icons.delete_outline,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        widget.added
                            ? 'Added to your cart'
                            : 'Removed from your cart',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    if (widget.added) ...[
                      const SizedBox(width: 5),
                      TextButton(
                        onPressed: widget.onViewCart,
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF9BE7B3),
                          padding: const EdgeInsets.symmetric(horizontal: 5),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: const Text(
                          'VIEW CART',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
