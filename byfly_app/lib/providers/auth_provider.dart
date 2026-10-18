import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/api_client.dart';
import '../core/constants.dart';

class AppUser {
  final String id, email, name;
  const AppUser({required this.id, required this.email, this.name = ''});
  Map<String, dynamic> get userMetadata => {'full_name': name, 'name': name};
}

class AuthProvider extends ChangeNotifier {
  AppUser? _user; bool _isLoading = true;
  AppUser? get user => _user; bool get isLoading => _isLoading; bool get isAuthenticated => _user != null;
  bool get isAdmin => _user != null && AppConstants.adminEmails.contains(_user!.email.toLowerCase());
  AuthProvider() { _init(); }
  Future<void> _init() async { final p = await SharedPreferences.getInstance(); final id=p.getString('byfly_user_id'); final email=p.getString('byfly_user_email'); if(id!=null&&email!=null) _user=AppUser(id:id,email:email,name:p.getString('byfly_user_name')??''); _isLoading=false; notifyListeners(); }
  Future<void> signIn(String email,String password) async => _save(await ApiClient.sendJson('/auth/login',body:{'email':email,'password':password}));
  Future<void> signUp(String email,String password,{String? name}) async => _save(await ApiClient.sendJson('/auth/register',body:{'email':email,'password':password,'name':name??''}));
  Future<void> _save(dynamic result) async { final u=Map<String,dynamic>.from(result['user']); final p=await SharedPreferences.getInstance(); await p.setString('byfly_token',result['token']); await p.setString('byfly_user_id',u['id'].toString()); await p.setString('byfly_user_email',u['email'].toString()); await p.setString('byfly_user_name',u['name']?.toString()??''); _user=AppUser(id:u['id'].toString(),email:u['email'].toString(),name:u['name']?.toString()??''); notifyListeners(); }
  Future<void> signOut() async { final p=await SharedPreferences.getInstance(); for(final k in ['byfly_token','byfly_user_id','byfly_user_email','byfly_user_name']) { await p.remove(k); } _user=null; notifyListeners(); }
  Future<void> signInWithGoogle() async { final account=await GoogleSignIn().signIn(); if(account==null)return; final auth=await account.authentication; final credential=firebase_auth.GoogleAuthProvider.credential(accessToken:auth.accessToken,idToken:auth.idToken); final result=await firebase_auth.FirebaseAuth.instance.signInWithCredential(credential); await signInWithFirebaseUser(result.user!); }
  Future<void> signInWithFirebaseUser(firebase_auth.User user) async { await _save(await ApiClient.sendJson('/auth/firebase',body:{'id_token':await user.getIdToken(true),'name':user.displayName??''})); }
  Future<void> sendPhoneCode(String phone, void Function(String) onCodeSent) async { await firebase_auth.FirebaseAuth.instance.verifyPhoneNumber(phoneNumber:phone,verificationCompleted:(credential) async { final result=await firebase_auth.FirebaseAuth.instance.signInWithCredential(credential); await signInWithFirebaseUser(result.user!); },verificationFailed:(error)=>throw error,codeSent:(id,_)=>onCodeSent(id),codeAutoRetrievalTimeout:(_)=>{}); }
  Future<void> verifyPhoneCode(String verificationId,String code) async { final credential=firebase_auth.PhoneAuthProvider.credential(verificationId:verificationId,smsCode:code); final result=await firebase_auth.FirebaseAuth.instance.signInWithCredential(credential); await signInWithFirebaseUser(result.user!); }
  Future<void> updateDisplayName(String name) async { await ApiClient.sendJson('/me',method:'PUT',body:{'name':name}); final p=await SharedPreferences.getInstance(); await p.setString('byfly_user_name',name); _user=AppUser(id:_user!.id,email:_user!.email,name:name); notifyListeners(); }
}
