"use client";

import { useState, useEffect, useRef } from "react";
import { useToast } from "@/contexts/ToastContext";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

interface VoiceCommandProps {
  onCommandProcessed?: (result: { content: string }) => void;
}

export default function VoiceCommand({
  onCommandProcessed,
}: VoiceCommandProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] =
    useState(true);

  const recognitionRef = useRef<any>(null);
  const { showToast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check if browser supports speech recognition
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setIsSpeechRecognitionSupported(false);
        setError(
          "Speech recognition is not supported in this browser. Try using Chrome, Edge, or Safari.",
        );
        return;
      }

      // Create recognition instance
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      // Set up event handlers
      recognitionRef.current.onresult = (event: any) => {
        const command = event.results[0][0].transcript;
        setTranscript(command);

        // Auto-execute command
        handleExecuteCommand(command);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);

        if (event.error === "no-speech") {
          setError("No speech was detected. Please try again.");
        } else if (event.error === "not-allowed") {
          setError(
            "Microphone access was denied. Please allow microphone access to use voice commands.",
          );
        } else {
          setError(`Error: ${event.error}`);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      // Clean up
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
      }
    };
  }, []);

  // Toggle listening state
  const toggleListening = () => {
    if (!isSpeechRecognitionSupported) {
      showToast({
        type: "error",
        title: "Not Supported",
        message:
          "Speech recognition is not supported in this browser. Try using Chrome, Edge, or Safari.",
      });
      return;
    }

    if (isListening) {
      // Stop listening
      recognitionRef.current.stop();
    } else {
      // Start listening
      setError(null);
      setTranscript("");
      setResult(null);

      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setError("Failed to start speech recognition. Please try again.");
      }
    }
  };

  // Execute the voice command
  const handleExecuteCommand = async (command: string) => {
    if (!command.trim() || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Send command to API
      const response = await fetch("/api/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: command,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process command");
      }

      const data = await response.json();
      setResult(data.content);

      // Notify parent component if callback provided
      if (onCommandProcessed) {
        onCommandProcessed(data);
      }

      showToast({
        type: "success",
        title: "Command Executed",
        message: "Your voice command was processed successfully",
      });
    } catch (error: any) {
      console.error("Command execution error:", error);
      setError(
        error.message || "An error occurred while processing your command",
      );

      showToast({
        type: "error",
        title: "Command Failed",
        message: error.message || "Failed to process voice command",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleListening}
          disabled={!isSpeechRecognitionSupported || isProcessing}
          className={`flex items-center justify-center rounded-full w-12 h-12 ${
            isListening
              ? "bg-red-600 hover:bg-red-700 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          aria-label={isListening ? "Stop listening" : "Start voice command"}
        >
          {isListening ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>

        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {isListening ? "Listening..." : "Voice Command"}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isListening
              ? "Speak your command clearly..."
              : "Click the microphone button to speak a command"}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded-md text-sm">
          {error}
        </div>
      )}

      {transcript && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Your command:
          </p>
          <p className="text-gray-900 dark:text-white mt-1">{transcript}</p>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span>Processing your command...</span>
        </div>
      )}

      {result && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Result:
          </p>
          <div className="prose dark:prose-invert max-w-none">
            <MarkdownRenderer content={result} />
          </div>
        </div>
      )}
    </div>
  );
}
