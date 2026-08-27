import 'package:flutter/material.dart';
import 'screens/voice_home_screen.dart';

void main() {
  runApp(const FaktuApp());
}

class FaktuApp extends StatelessWidget {
  const FaktuApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FAKTU',
      theme: ThemeData(colorSchemeSeed: Colors.indigo, useMaterial3: true),
      home: const VoiceHomeScreen(),
    );
  }
}
