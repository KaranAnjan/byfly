import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final phone = TextEditingController();
  final otp = List.generate(6, (_) => TextEditingController());
  final otpFocus = List.generate(6, (_) => FocusNode());
  String? verificationId;
  bool codeMode = false;
  bool loading = false;

  String get enteredCode => otp.map((controller) => controller.text).join();

  @override
  void dispose() {
    phone.dispose();
    for (final controller in otp) { controller.dispose(); }
    for (final focus in otpFocus) { focus.dispose(); }
    super.dispose();
  }

  Future<void> google() async {
    setState(() => loading = true);
    try {
      await context.read<AuthProvider>().signInWithGoogle();
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> sendCode() async {
    var raw = phone.text.replaceAll(RegExp(r'\D'), '');
    if (raw.startsWith('91') && raw.length == 12) raw = raw.substring(2);
    if (raw.startsWith('0') && raw.length == 11) raw = raw.substring(1);
    final value = '+91$raw';
    if (!RegExp(r'^\+91[6-9]\d{9}$').hasMatch(value)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid Indian phone number')));
      return;
    }
    setState(() => loading = true);
    try {
      await context.read<AuthProvider>().sendPhoneCode(value, (id) {
        if (mounted) setState(() { verificationId = id; codeMode = true; });
      });
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> verify() async {
    if (verificationId == null) return;
    setState(() => loading = true);
    try {
      await context.read<AuthProvider>().verifyPhoneCode(verificationId!, enteredCode);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Widget otpBox(int index, double width) {
    return SizedBox(
      width: width,
      height: 56,
      child: TextField(
        controller: otp[index],
        focusNode: otpFocus[index],
        textAlign: TextAlign.center,
        textAlignVertical: TextAlignVertical.center,
        keyboardType: TextInputType.number,
        maxLength: 1,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
        decoration: const InputDecoration(
          counterText: '',
          contentPadding: EdgeInsets.zero,
          constraints: BoxConstraints(minHeight: 56, maxHeight: 56),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(),
        ),
        onChanged: (value) {
          if (value.isNotEmpty && index < 5) otpFocus[index + 1].requestFocus();
          if (mounted) setState(() {});
        },
      ),
    );
  }

  void resetOtp() {
    for (final controller in otp) { controller.clear(); }
    setState(() => codeMode = false);
  }

  @override
  Widget build(BuildContext context) {
    final green = Theme.of(context).colorScheme.primary;
    final modalWidth = (MediaQuery.sizeOf(context).width - 48).clamp(0.0, 420.0);
    final whiteButtonStyle = FilledButton.styleFrom(
      backgroundColor: Colors.white,
      foregroundColor: green,
    );
    final whiteInputDecoration = InputDecoration(
      filled: true,
      fillColor: Colors.white,
      labelStyle: const TextStyle(color: Color(0xFF475569)),
      hintStyle: const TextStyle(color: Color(0xFF94A3B8)),
      prefixStyle: const TextStyle(color: Color(0xFF0F172A)),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide(color: green, width: 2),
      ),
    );

    final content = <Widget>[
      Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: green,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Image.asset(
          'assets/images/newlogo.png',
          height: 64,
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) => const Icon(Icons.store, size: 56, color: Colors.white),
        ),
      ),
      const SizedBox(height: 16),
      const Text('Sign in to ByFly', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
      const SizedBox(height: 24),
    ];

    if (!codeMode) {
      content.addAll([
        SizedBox(width: double.infinity, child: FilledButton.icon(style: whiteButtonStyle, onPressed: loading ? null : google, icon: const Icon(Icons.account_circle), label: const Text('Continue with Google'))),
        const SizedBox(height: 20),
        TextField(controller: phone, keyboardType: TextInputType.phone, inputFormatters: [FilteringTextInputFormatter.digitsOnly], decoration: whiteInputDecoration.copyWith(labelText: 'Phone number', hintText: '10-digit mobile number', prefixText: '+91 ')),
        const SizedBox(height: 12),
        SizedBox(width: double.infinity, child: FilledButton(style: whiteButtonStyle, onPressed: loading ? null : sendCode, child: Text(loading ? 'Please wait...' : 'Send phone OTP'))),
      ]);
    } else {
      content.addAll([
        Text('Enter the 6-digit code sent to +91 ${phone.text}', textAlign: TextAlign.center, style: const TextStyle(color: Colors.white70)),
        const SizedBox(height: 16),
        LayoutBuilder(
          builder: (context, constraints) {
            final boxWidth = ((constraints.maxWidth - 25) / 6).clamp(30.0, 40.0);
            return Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                6,
                (index) => Padding(
                  padding: EdgeInsets.only(right: index == 5 ? 0 : 5),
                  child: otpBox(index, boxWidth),
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: FilledButton(style: whiteButtonStyle, onPressed: loading || enteredCode.length != 6 ? null : verify, child: Text(loading ? 'Verifying...' : 'Verify OTP'))),
        TextButton.icon(style: TextButton.styleFrom(foregroundColor: Colors.white), onPressed: resetOtp, icon: const Icon(Icons.arrow_back, size: 16), label: const Text('Change number')),
      ]);
    }

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 350),
            transitionBuilder: (child, animation) => FadeTransition(opacity: animation, child: SlideTransition(position: Tween(begin: const Offset(0.08, 0), end: Offset.zero).animate(animation), child: child)),
          child: SizedBox(
            width: modalWidth,
            child: Card(
              key: ValueKey(codeMode),
              color: green,
              elevation: 8,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
              child: Padding(padding: const EdgeInsets.all(24), child: Column(children: content)),
            ),
          ),
          ),
        ),
      ),
    );
  }
}
