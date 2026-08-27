import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:speech_to_text/speech_recognition_error.dart';

/// Enveloppe autour du plugin `speech_to_text` (reconnaissance vocale
/// EMBARQUÉE, sur l'appareil — pas d'appel réseau nécessaire pour cette
/// partie, ce qui aide pour le mode hors ligne, section 35).
///
/// NON TESTÉ : aucun SDK Flutter/Dart n'est disponible dans cet
/// environnement de développement, donc ce code n'a jamais été compilé
/// ni exécuté sur un appareil. Écrit selon la documentation officielle
/// du package `speech_to_text` (v7). À vérifier en premier lors du
/// premier `flutter run` réel.
class VoiceInputService {
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _available = false;

  bool get isAvailable => _available;
  bool get isListening => _speech.isListening;

  /// À appeler une fois (ex: dans initState) avant toute écoute.
  /// Déclenche la demande de permission micro côté OS si nécessaire.
  Future<bool> init({
    required void Function(String status) onStatus,
    required void Function(String error) onError,
  }) async {
    _available = await _speech.initialize(
      onStatus: onStatus,
      onError: (SpeechRecognitionError e) => onError(e.errorMsg),
    );
    return _available;
  }

  Future<void> startListening({
    required void Function(String text, bool isFinal) onResult,
    String localeId = 'fr_FR',
  }) async {
    if (!_available) return;
    await _speech.listen(
      localeId: localeId,
      onResult: (result) => onResult(result.recognizedWords, result.finalResult),
      listenOptions: stt.SpeechListenOptions(
        partialResults: true,
        cancelOnError: true,
      ),
    );
  }

  Future<void> stopListening() => _speech.stop();

  Future<void> cancel() => _speech.cancel();
}
