import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'core/constants.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/product_provider.dart';
import 'providers/wishlist_provider.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  runApp(const ByFlyApp());
}

class ByFlyApp extends StatelessWidget {
  const ByFlyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
      ],
      child: MaterialApp(
        title: AppConstants.appName,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xFF064E3B), // ByFly dark green
            primary: const Color(0xFF064E3B),
            secondary: const Color(0xFFF43F5E), // Coral Accent
          ),
          textTheme: GoogleFonts.interTextTheme(),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF064E3B),
            foregroundColor: Colors.white,
            elevation: 0,
          ),
        ),
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate>
    with SingleTickerProviderStateMixin {
  late final AnimationController _progressController;
  bool _minimumSplashTimeFinished = false;
  bool _catalogFetchStarted = false;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1900),
    )..forward();
    Future<void>.delayed(const Duration(milliseconds: 1900), () {
      if (mounted) setState(() => _minimumSplashTimeFinished = true);
    });
  }

  @override
  void dispose() {
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer2<AuthProvider, ProductProvider>(
      builder: (context, auth, catalog, child) {
        if (auth.isAuthenticated && !_catalogFetchStarted) {
          _catalogFetchStarted = true;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) context.read<ProductProvider>().fetchProducts();
          });
        }
        final showSplash = auth.isLoading ||
            !_minimumSplashTimeFinished ||
            (auth.isAuthenticated && !catalog.hasLoadedProducts);
        if (showSplash) return _BrandedSplash(progress: _progressController);
        return auth.isAuthenticated ? const HomeScreen() : const LoginScreen();
      },
    );
  }
}

class _BrandedSplash extends StatelessWidget {
  final Animation<double> progress;

  const _BrandedSplash({required this.progress});

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF064E3B);
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFE5F4E9),
              Color(0xFFC7E9D0),
              Color(0xFFA7D7B5),
            ],
            stops: [0, .48, 1],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(28, 34, 28, 30),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withValues(alpha: .8)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF166534).withValues(alpha: .12),
                      blurRadius: 26,
                      offset: const Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox(
                      height: 96,
                      child: Image.asset(
                        'assets/images/newlogo.png',
                        fit: BoxFit.contain,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.store, size: 70, color: green),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'BYFLY',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        fontStyle: FontStyle.italic,
                        letterSpacing: 2.5,
                      ),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      'ByFly Store',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: .88),
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        letterSpacing: .4,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Fashion Jewellery & Gift Supply',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: .7),
                          fontSize: 12),
                    ),
                    const SizedBox(height: 32),
                    const _LoadingDots(),
                    const SizedBox(height: 12),
                    Text(
                      'Loading...',
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: .75),
                          fontSize: 12,
                          fontWeight: FontWeight.w500),
                    ),
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

class _LoadingDots extends StatefulWidget {
  const _LoadingDots();

  @override
  State<_LoadingDots> createState() => _LoadingDotsState();
}

class _LoadingDotsState extends State<_LoadingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(3, (index) {
          final phase = (_controller.value + index * .2) % 1;
          final opacity =
              .35 + (.65 * ((math.sin(phase * math.pi * 2) + 1) / 2));
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Opacity(
              opacity: opacity,
              child: const CircleAvatar(
                radius: 4,
                backgroundColor: Color(0xFFBDE8C9),
              ),
            ),
          );
        }),
      ),
    );
  }
}
