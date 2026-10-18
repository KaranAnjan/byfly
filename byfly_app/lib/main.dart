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
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        final showSplash = auth.isLoading || !_minimumSplashTimeFinished;
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
              Color(0xFF0B6B4F),
              Color(0xFF064E3B),
              Color(0xFF043D2F),
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
                  color: const Color(0xFF0B6B4F),
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
                    AnimatedBuilder(
                      animation: progress,
                      builder: (context, child) => ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: LinearProgressIndicator(
                          value: progress.value,
                          minHeight: 7,
                          backgroundColor: Colors.white.withValues(alpha: .28),
                          valueColor: const AlwaysStoppedAnimation<Color>(
                              Color(0xFFBDE8C9)),
                        ),
                      ),
                    ),
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
