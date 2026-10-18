import 'package:flutter/material.dart';

void showHeartBubble(BuildContext context) {
  final overlay = Overlay.of(context);
  final renderBox = context.findRenderObject() as RenderBox?;
  if (renderBox == null) return;

  final position = renderBox.localToGlobal(Offset.zero);
  final size = renderBox.size;

  late OverlayEntry entry;
  entry = OverlayEntry(
    builder: (context) => _HeartBubbleWidget(
      position: position,
      size: size,
      onComplete: () => entry.remove(),
    ),
  );

  overlay.insert(entry);
}

class _HeartBubbleWidget extends StatefulWidget {
  final Offset position;
  final Size size;
  final VoidCallback onComplete;

  const _HeartBubbleWidget({
    required this.position,
    required this.size,
    required this.onComplete,
  });

  @override
  State<_HeartBubbleWidget> createState() => _HeartBubbleWidgetState();
}

class _HeartBubbleWidgetState extends State<_HeartBubbleWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;
  late Animation<double> _opacity;
  late Animation<double> _translateY;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _scale = Tween<double>(begin: 0.5, end: 1.4).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _opacity = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.5, 1.0, curve: Curves.easeIn)),
    );

    _translateY = Tween<double>(begin: 0, end: -40).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _controller.forward().then((_) => widget.onComplete());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned(
      left: widget.position.dx + (widget.size.width / 2) - 15,
      top: widget.position.dy + (widget.size.height / 2) - 15,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(0, _translateY.value),
            child: Transform.scale(
              scale: _scale.value,
              child: Opacity(
                opacity: _opacity.value,
                child: const Icon(
                  Icons.favorite,
                  color: Color(0xFFF43F5E),
                  size: 30,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
