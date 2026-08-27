import 'package:flutter/material.dart';
import '../models/invoice_preview.dart';
import '../services/faktu_api.dart';
import '../services/voice_input_service.dart';
import 'invoice_preview_screen.dart';

/// Écran principal — remplace le formulaire à champs séparés par le
/// vrai flux vocal : 🎙️ Parler -> transcription -> compréhension ->
/// prévisualisation (section 4 du prompt maître).
///
/// Un champ texte reste disponible en repli : le cahier des charges
/// exige que FAKTU reste utilisable en environnement bruyant ou avec
/// un micro/connexion défaillants (section 42 — pilote terrain).
///
/// NON TESTÉ : pas de SDK Flutter disponible dans cet environnement de
/// développement (voir STATUT.md). À valider en priorité lors du
/// premier `flutter run` sur un vrai appareil.
class VoiceHomeScreen extends StatefulWidget {
  const VoiceHomeScreen({super.key});

  @override
  State<VoiceHomeScreen> createState() => _VoiceHomeScreenState();
}

class _VoiceHomeScreenState extends State<VoiceHomeScreen> {
  final _voice = VoiceInputService();
  final _textController = TextEditingController();

  // À adapter : URL de l'API déployée + identifiant réel de l'entreprise
  // (viendra de l'authentification une fois FAKTU-003 fait).
  late final _api = FaktuApi(
    baseUrl: 'http://10.0.2.2:3000/api/v1',
    businessId: '00000000-0000-0000-0000-000000000001',
  );

  bool _micReady = false;
  bool _listening = false;
  bool _processing = false;
  String _liveTranscript = '';
  String? _statusMessage;

  @override
  void initState() {
    super.initState();
    _initVoice();
  }

  Future<void> _initVoice() async {
    final ok = await _voice.init(
      onStatus: (status) {
        if (status == 'notListening' && mounted) {
          setState(() => _listening = false);
        }
      },
      onError: (error) {
        if (!mounted) return;
        setState(() {
          _listening = false;
          _statusMessage = 'Erreur micro : $error';
        });
      },
    );
    if (mounted) {
      setState(() {
        _micReady = ok;
        _statusMessage = ok ? null : "Micro indisponible sur cet appareil — utilisez le champ texte ci-dessous.";
      });
    }
  }

  Future<void> _toggleListening() async {
    if (!_micReady) return;

    if (_listening) {
      await _voice.stopListening();
      setState(() => _listening = false);
      if (_liveTranscript.trim().isNotEmpty) {
        await _sendCommand(_liveTranscript.trim());
      }
      return;
    }

    setState(() {
      _liveTranscript = '';
      _statusMessage = null;
      _listening = true;
    });

    await _voice.startListening(
      onResult: (text, isFinal) {
        if (!mounted) return;
        setState(() => _liveTranscript = text);
        if (isFinal) {
          setState(() => _listening = false);
          if (text.trim().isNotEmpty) {
            _sendCommand(text.trim());
          }
        }
      },
    );
  }

  Future<void> _sendCommand(String transcript) async {
    setState(() {
      _processing = true;
      _statusMessage = null;
    });

    try {
      final result = await _api.runAssistantCommand(transcript);
      if (!mounted) return;

      switch (result['step']) {
        case 'PREVIEW_READY':
          final preview = InvoicePreview.fromJson(result['preview'] as Map<String, dynamic>);
          await Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => InvoicePreviewScreen(api: _api, preview: preview)),
          );
          setState(() => _liveTranscript = '');
          break;

        case 'CLARIFICATION_NEEDED':
          setState(() => _statusMessage = result['clarification_question'] as String? ?? "J'ai besoin de précisions.");
          break;

        case 'INTENT_NOT_YET_WIRED':
          setState(() => _statusMessage = result['message'] as String? ?? 'Cette action n\'est pas encore disponible.');
          break;

        default:
          setState(() => _statusMessage = "Je n'ai pas compris. Réessayez.");
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _statusMessage = 'Erreur : $e');
    } finally {
      if (mounted) setState(() => _processing = false);
    }
  }

  @override
  void dispose() {
    _voice.cancel();
    _textController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FAKTU')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            const Spacer(),
            Text(
              _listening
                  ? (_liveTranscript.isEmpty ? 'Je vous écoute…' : _liveTranscript)
                  : 'Parlez. FAKTU fait le reste.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 24),
            if (_processing) const CircularProgressIndicator(),
            if (!_processing)
              GestureDetector(
                onTap: _micReady ? _toggleListening : null,
                child: CircleAvatar(
                  radius: 44,
                  backgroundColor: _listening ? Colors.red : Theme.of(context).colorScheme.primary,
                  child: Icon(
                    _listening ? Icons.stop : Icons.mic,
                    color: Colors.white,
                    size: 40,
                  ),
                ),
              ),
            if (_statusMessage != null) ...[
              const SizedBox(height: 16),
              Text(_statusMessage!, textAlign: TextAlign.center, style: const TextStyle(color: Colors.orange)),
            ],
            const Spacer(),
            const Divider(),
            const SizedBox(height: 8),
            const Text('Ou tapez votre commande :'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'ex : facture à Mamadou pour 20 sacs de ciment à 6500 francs',
                      border: OutlineInputBorder(),
                    ),
                    onSubmitted: (text) {
                      if (text.trim().isNotEmpty) _sendCommand(text.trim());
                    },
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send),
                  onPressed: () {
                    final text = _textController.text.trim();
                    if (text.isNotEmpty) _sendCommand(text);
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
