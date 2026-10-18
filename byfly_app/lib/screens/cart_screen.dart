import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../core/constants.dart';
import '../core/api_client.dart';
import 'login_screen.dart';

class CartScreen extends StatefulWidget {
  final VoidCallback? onBack;

  const CartScreen({super.key, this.onBack});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _showCheckout = false;
  bool _isPlacingOrder = false;
  bool _isEditingAddress = false;

  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _cityController = TextEditingController();
  final _pincodeController = TextEditingController();
  String? _selectedState;

  void _goBack() {
    if (widget.onBack != null) {
      widget.onBack!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    }
  }

  @override
  void initState() {
    super.initState();
    _loadUserProfile();
  }

  Future<void> _loadUserProfile() async {
    try {
      final data = await ApiClient.getJson('/me');

      if (data != null && mounted) {
        setState(() {
          _nameController.text = data['name'] ?? '';
          _phoneController.text = data['phone'] ?? '';
          _addressController.text = data['address'] ?? '';
          _cityController.text = data['city'] ?? '';
          _selectedState = data['state'];
          _pincodeController.text = data['pincode']?.toString() ?? '';

          if (_nameController.text.isEmpty || _addressController.text.isEmpty) {
            _isEditingAddress = true;
          } else {
            _isEditingAddress = false;
          }
        });
      }
    } catch (e) {
      debugPrint('Error loading profile: $e');
    }
  }

  String getImageUrl(String path) {
    return ApiClient.imageUrl(path);
  }

  void _launchWhatsApp(CartProvider cart) async {
    if (cart.items.isEmpty) return;

    String message = "Hi ByFly Store, I want to order:\n\n";
    for (var item in cart.items.values) {
      message +=
          "${item.product.productName} x${item.quantity} - Rs.${(item.product.price * item.quantity).toStringAsFixed(0)}\n";
    }
    message += "\nTotal: Rs.${cart.totalAmount.toStringAsFixed(0)}";

    final phone = AppConstants.contactPhone.replaceAll(RegExp(r'[^0-9]'), '');
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
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Could not launch WhatsApp")),
        );
      }
    }
  }

  Future<void> _placeOrder(CartProvider cart) async {
    if (_isEditingAddress) {
      if (!_formKey.currentState!.validate()) return;
      if (_selectedState == null) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please select a state')));
        return;
      }
    }

    setState(() => _isPlacingOrder = true);

    try {
      await ApiClient.sendJson('/me', method: 'PUT', body: {
        'name': _nameController.text,
        'phone': _phoneController.text,
        'address': _addressController.text,
        'city': _cityController.text,
        'state': _selectedState,
        'pincode': _pincodeController.text,
      });

      final fullAddress =
          "${_addressController.text}, ${_cityController.text}, $_selectedState - ${_pincodeController.text}";

      final orderResponse = await ApiClient.sendJson('/orders', body: {
        'customer_name': _nameController.text,
        'customer_address': fullAddress,
        'customer_pincode': _pincodeController.text,
        'items': cart.items.values
            .map((item) => {
                  'product_id': item.product.id,
                  'quantity': item.quantity,
                })
            .toList(),
      });

      if (mounted) {
        final displayOrderNum = orderResponse['order_number']?.toString() ??
            orderResponse['order_no']?.toString() ??
            orderResponse['id'].toString().substring(0, 8);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                'Order #$displayOrderNum placed successfully! (Cash on Delivery)'),
            backgroundColor: Colors.green.shade700,
            duration: const Duration(seconds: 4),
          ),
        );
        cart.clear();
        _goBack();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
              content: Text('Failed to place order: $e'),
              backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isPlacingOrder = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();
    final auth = context.read<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFFF6F6EF),
      appBar: AppBar(
        title: Text(_showCheckout ? 'Checkout & Summary' : 'My Shopping Cart'),
        backgroundColor: const Color(0xFF064E3B),
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_showCheckout) {
              setState(() => _showCheckout = false);
            } else {
              _goBack();
            }
          },
        ),
      ),
      body: cart.items.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(LucideIcons.shopping_cart,
                      size: 80, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('Your cart is empty!',
                      style: TextStyle(fontSize: 18, color: Colors.grey)),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _goBack,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Continue Shopping'),
                  ),
                ],
              ),
            )
          : AnimatedSwitcher(
              duration: const Duration(milliseconds: 280),
              switchInCurve: Curves.easeOutCubic,
              switchOutCurve: Curves.easeInCubic,
              transitionBuilder: (child, animation) => FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0, .025),
                    end: Offset.zero,
                  ).animate(animation),
                  child: child,
                ),
              ),
              child: _showCheckout
                  ? KeyedSubtree(
                      key: const ValueKey('checkout'),
                      child: _buildCheckoutView(cart),
                    )
                  : KeyedSubtree(
                      key: const ValueKey('cart'),
                      child: _buildCartView(cart, auth),
                    ),
            ),
    );
  }

  Widget _buildCartView(CartProvider cart, AuthProvider auth) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            itemCount: cart.items.length,
            itemBuilder: (context, index) {
              final item = cart.items.values.toList()[index];
              return Container(
                margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE4E9E1)),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: .035),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: 80,
                      height: 80,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFFF0F3EB),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: item.product.imageUrl != null
                              ? CachedNetworkImage(
                                  imageUrl:
                                      getImageUrl(item.product.imageUrl ?? ''),
                                  fit: BoxFit.cover,
                                )
                              : const Center(child: Icon(Icons.image)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  item.product.productName,
                                  style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w500),
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              IconButton(
                                onPressed: () =>
                                    cart.removeItem(item.product.id),
                                icon: const Icon(Icons.delete_outline),
                                iconSize: 18,
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(
                                    minWidth: 28, minHeight: 28),
                                visualDensity: VisualDensity.compact,
                                color: Colors.red.shade500,
                                tooltip: 'Remove',
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          const Text('Price',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF047857),
                                  fontWeight: FontWeight.w600)),
                          Row(
                            children: [
                              Text(
                                '₹${item.product.price.toStringAsFixed(0)}',
                                style: const TextStyle(
                                    fontSize: 17, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(width: 8),
                              if (item.product.mrp != null &&
                                  item.product.mrp! > item.product.price)
                                Text(
                                  '₹${item.product.mrp!.toStringAsFixed(0)}',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: Colors.grey,
                                    decoration: TextDecoration.lineThrough,
                                  ),
                                ),
                              const Spacer(),
                              _buildQtyBtn(
                                icon: LucideIcons.minus,
                                onPressed: () =>
                                    cart.removeSingleItem(item.product.id),
                              ),
                              Container(
                                margin:
                                    const EdgeInsets.symmetric(horizontal: 5),
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF6F6EF),
                                  borderRadius: BorderRadius.circular(9),
                                  border: Border.all(
                                      color: const Color(0xFFDCE5DA)),
                                ),
                                child: Text('${item.quantity}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold)),
                              ),
                              _buildQtyBtn(
                                icon: LucideIcons.plus,
                                onPressed: () => cart.addItem(item.product),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Minimum order quantity: ${item.product.minOrderQty} pcs',
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade700),
                          ),
                          const SizedBox(height: 8),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFF6F6EF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
              boxShadow: [
                BoxShadow(
                    color: Colors.black12, blurRadius: 4, offset: Offset(0, -2))
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Amount',
                        style: TextStyle(
                            fontSize: 17, fontWeight: FontWeight.bold)),
                    Text('₹${cart.totalAmount.toStringAsFixed(0)}',
                        style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => _launchWhatsApp(cart),
                        icon: const Icon(LucideIcons.message_circle, size: 18),
                        label: const Text('WHATSAPP'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade600,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          if (!auth.isAuthenticated) {
                            Navigator.push(
                                context,
                                MaterialPageRoute(
                                    builder: (context) => const LoginScreen()));
                          } else {
                            setState(() => _showCheckout = true);
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor:
                              Theme.of(context).colorScheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16)),
                          elevation: 0,
                        ),
                        child: const Text('CHECKOUT',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextButton(
                  onPressed: _goBack,
                  child: Text('CONTINUE SHOPPING',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQtyBtn(
      {required IconData icon, required VoidCallback onPressed}) {
    return InkWell(
      onTap: onPressed,
      child: Container(
        padding: const EdgeInsets.all(6),
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.grey[300]!),
        ),
        child: Icon(icon, size: 14),
      ),
    );
  }

  Widget _buildCheckoutView(CartProvider cart) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            child: Column(
              children: [
                _isEditingAddress
                    ? _buildAddressForm()
                    : _buildAddressSummary(),
                const SizedBox(height: 8),
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE4E9E1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Order Items Summary',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      const Divider(),
                      ...cart.items.values.map((item) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                    child: Text(
                                        "${item.product.productName} (x${item.quantity})",
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis)),
                                Text(
                                    '₹${(item.product.price * item.quantity).toStringAsFixed(0)}',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w500)),
                              ],
                            ),
                          )),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 0, 12, 0),
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE4E9E1)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Pricing details',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 14),
                      _pricingRow('Sub-total',
                          '₹${cart.totalAmount.toStringAsFixed(2)}'),
                      const SizedBox(height: 10),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Delivery Fee',
                              style: TextStyle(
                                  color: Color(0xFF5D6B62), fontSize: 13)),
                          Row(
                            children: [
                              const Text('₹16.00',
                                  style: TextStyle(
                                      color: Colors.grey,
                                      fontSize: 13,
                                      decoration: TextDecoration.lineThrough)),
                              const SizedBox(width: 8),
                              Text('FREE',
                                  style: TextStyle(
                                      color:
                                          Theme.of(context).colorScheme.primary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13)),
                            ],
                          ),
                        ],
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Divider(height: 1),
                      ),
                      _pricingRow('Total Price',
                          '₹${cart.totalAmount.toStringAsFixed(2)}',
                          emphasized: true),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE4E9E1)),
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Payment Options',
                          style: TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.radio_button_checked,
                              color: Color(0xFF059669)),
                          SizedBox(width: 12),
                          Text('Cash on Delivery (COD)',
                              style: TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w500)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        SafeArea(
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Color(0xFFF6F6EF),
              borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
              boxShadow: [
                BoxShadow(
                    color: Colors.black12, blurRadius: 4, offset: Offset(0, -2))
              ],
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total',
                          style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text('₹${cart.totalAmount.toStringAsFixed(0)}',
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: _isPlacingOrder ? null : () => _placeOrder(cart),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 40, vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isPlacingOrder
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              color: Colors.white, strokeWidth: 2))
                      : const Text('PLACE ORDER',
                          style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddressSummary() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4E9E1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Deliver to:',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              OutlinedButton(
                onPressed: () => setState(() => _isEditingAddress = true),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  side:
                      BorderSide(color: Theme.of(context).colorScheme.primary),
                ),
                child: Text('CHANGE',
                    style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.primary,
                        fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_nameController.text,
              style:
                  const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 4),
          Text(
            "${_addressController.text}, ${_cityController.text}, $_selectedState - ${_pincodeController.text}",
            style: const TextStyle(fontSize: 14, color: Colors.black87),
          ),
          const SizedBox(height: 4),
          Text(_phoneController.text, style: const TextStyle(fontSize: 14)),
        ],
      ),
    );
  }

  Widget _pricingRow(String label, String value, {bool emphasized = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: TextStyle(
                color: emphasized ? Colors.black87 : const Color(0xFF5D6B62),
                fontSize: emphasized ? 14 : 13,
                fontWeight: emphasized ? FontWeight.bold : FontWeight.w500)),
        Text(value,
            style: TextStyle(
                color: emphasized
                    ? Theme.of(context).colorScheme.primary
                    : const Color(0xFF31513E),
                fontSize: emphasized ? 16 : 13,
                fontWeight: FontWeight.bold)),
      ],
    );
  }

  Widget _buildAddressForm() {
    return Container(
      margin: const EdgeInsets.fromLTRB(12, 8, 12, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE4E9E1)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Delivery Address',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: _fieldDecoration('Full Name'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phoneController,
              decoration: _fieldDecoration('Phone Number'),
              keyboardType: TextInputType.phone,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _pincodeController,
              decoration: _fieldDecoration('Pincode'),
              keyboardType: TextInputType.number,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _addressController,
              decoration: _fieldDecoration('Address'),
              maxLines: 2,
              validator: (v) => v!.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _cityController,
                    decoration: _fieldDecoration('City'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    initialValue: _selectedState,
                    isExpanded: true,
                    decoration: _fieldDecoration('State').copyWith(
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 14),
                    ),
                    items: AppConstants.indianStates
                        .map((s) => DropdownMenuItem(
                            value: s,
                            child: Text(s,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12))))
                        .toList(),
                    onChanged: (v) => setState(() => _selectedState = v),
                    validator: (v) => v == null ? 'Required' : null,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (_nameController.text.isNotEmpty &&
                _addressController.text.isNotEmpty)
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => setState(() => _isEditingAddress = false),
                  child: Text('CANCEL',
                      style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  InputDecoration _fieldDecoration(String label) {
    final green = Theme.of(context).colorScheme.primary;
    return InputDecoration(
      labelText: label,
      filled: true,
      fillColor: const Color(0xFFF6F6EF),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Color(0xFFE1E9E0)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: green, width: 1.4),
      ),
    );
  }
}
