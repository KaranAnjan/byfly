import 'dart:ui';

import 'package:flutter/material.dart';

/// A translucent, blurred surface used for floating controls.
class LiquidGlass extends StatelessWidget {
  final Widget? child;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;
  final Color tint;
  final double blur;
  final double opacity;
  final double borderOpacity;

  const LiquidGlass({
    super.key,
    this.child,
    this.padding = EdgeInsets.zero,
    this.borderRadius = const BorderRadius.all(Radius.circular(26)),
    this.tint = const Color(0xFF064E3B),
    this.blur = 18,
    this.opacity = .56,
    this.borderOpacity = .18,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                tint.withValues(alpha: opacity + .04),
                tint.withValues(alpha: opacity),
                tint.withValues(alpha: opacity - .06),
              ],
            ),
            borderRadius: borderRadius,
            border: Border.all(
              color: Colors.white.withValues(alpha: borderOpacity),
              width: 1.1,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: .14),
                blurRadius: 26,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          child: child ?? const SizedBox.expand(),
        ),
      ),
    );
  }
}
