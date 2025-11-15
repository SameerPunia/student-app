
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Modal,
  ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';
import Icon from '../components/Icon';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { commonStyles, colors, buttonStyles, spacing, borderRadius, shadows, typography } from '../styles/commonStyles';
import * as DocumentPicker from 'expo-document-picker';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'summary' | 'keypoints' | 'quiz' | 'error' | 'info';
}

interface ModuleAnalysis {
  summary: string;
  keyPoints: string[];
  quiz: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Local fallback knowledge base
const technicalTerms: Record<string, string> = {
  "algorithm": "An algorithm is a step-by-step procedure or formula for solving a problem. Think of it like a recipe - it's a set of instructions that, when followed in order, will help you achieve a specific goal. For example, a sorting algorithm arranges data in a particular order.",
  "variable": "A variable is a container that stores data values in programming. It's like a labeled box where you can put information and retrieve it later. Variables can hold different types of data like numbers, text, or true/false values.",
  "function": "A function is a reusable block of code that performs a specific task. It's like a mini-program within your program. You can call a function whenever you need to perform that task, which helps keep your code organized and reduces repetition.",
  "loop": "A loop is a programming structure that repeats a set of instructions multiple times. It's useful when you need to do the same thing over and over. Common types include 'for loops' (repeat a specific number of times) and 'while loops' (repeat until a condition is met).",
  "array": "An array is a data structure that stores multiple values in a single variable. Think of it as a list or collection of items. For example, an array could store a list of student names or test scores.",
  "class": "A class is a blueprint for creating objects. It defines what properties and methods objects of that type will have. Think of it like a cookie cutter - the class is the cutter, and the objects are the cookies you make with it.",
  "database": "A database is an organized collection of data stored electronically. It's like a digital filing cabinet where information is stored in tables (like spreadsheets) and can be easily searched, updated, and managed.",
  "api": "API stands for Application Programming Interface. It's a set of rules that allows different software applications to communicate with each other. Think of it as a waiter in a restaurant - it takes your request, tells the kitchen, and brings back what you ordered.",
};

const studyTips = [
  "Break down complex topics into smaller, manageable chunks. This makes learning less overwhelming and helps you understand each part thoroughly.",
  "Use the Pomodoro Technique: Study for 25 minutes, then take a 5-minute break. This helps maintain focus and prevents burnout.",
  "Practice active recall by testing yourself regularly. Don't just re-read notes - try to remember information without looking.",
  "Teach concepts to someone else (or even to yourself out loud). If you can explain it clearly, you truly understand it.",
  "Create visual aids like mind maps, diagrams, or flowcharts. Visual representations help you see connections between concepts.",
];

// Local fallback response generator
function generateLocalFallbackResponse(question: string): string {
  const lowerQuestion = question.toLowerCase().trim();
  
  // Check for greetings
  const greetingWords = ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good afternoon', 'good evening'];
  if (greetingWords.some(word => lowerQuestion.startsWith(word) || lowerQuestion === word)) {
    return "Hello! I'm your AI Study Tutor. How can I help you with your studies today?";
  }
  
  // Check for study tips request
  if (lowerQuestion.includes('study tip') || lowerQuestion.includes('how to study') || lowerQuestion.includes('study better')) {
    return studyTips[Math.floor(Math.random() * studyTips.length)];
  }
  
  // Check for technical terms
  for (const [term, definition] of Object.entries(technicalTerms)) {
    if (lowerQuestion.includes(term)) {
      return `Great question about **${term}**!\n\n${definition}\n\nWould you like me to explain anything else related to this concept?`;
    }
  }
  
  // Check for "explain" requests
  if (lowerQuestion.includes('explain') || lowerQuestion.includes('what is') || lowerQuestion.includes('what are')) {
    const topic = lowerQuestion
      .replace(/explain|what is|what are|please|can you|could you|tell me about/gi, '')
      .trim();
    
    if (topic.length > 2) {
      return `I'd be happy to explain ${topic}!\n\nHere's a general approach to understanding this concept:\n\n1. Break down the concept into smaller parts\n2. Look for examples and analogies\n3. Practice with hands-on exercises\n4. Connect it to concepts you already know\n\nIs there a specific aspect of ${topic} you'd like to focus on?`;
    }
  }
  
  // Check for programming help
  if (lowerQuestion.includes('code') || lowerQuestion.includes('program') || lowerQuestion.includes('debug')) {
    return "Programming questions are great! Here's my advice:\n\n• Break the problem into smaller steps\n• Write pseudocode first to plan your logic\n• Test your code with simple examples\n• Use console.log() or print statements to debug\n• Read error messages carefully - they often tell you exactly what's wrong\n\nWhat specific programming concept would you like help with?";
  }
  
  // Default helpful response
  return "That's an interesting question! Here are some ways I can help you:\n\n• **Explain technical terms** - Ask me about programming concepts, algorithms, data structures, etc.\n• **Study tips** - I can share effective learning strategies\n• **Practice questions** - I can give you questions to test your knowledge\n• **General guidance** - I can help you approach problems systematically\n\nTry asking me to explain a specific concept, or ask for study tips!";
}

export default function AITutor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hello! I'm your AI Study Tutor. I can help you with:\n\n• Explaining technical terms and concepts\n• Providing study tips and strategies\n• Answering questions about various subjects\n• Analyzing uploaded documents\n• Creating practice quizzes\n\nHow can I assist you today?",
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  useEffect(() => {
    // Auto-scroll to bottom when new messages are added
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const generateAIResponse = async (question: string) => {
    try {
      setLoading(true);
      console.log('🤖 Sending question to AI:', question);
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Try to call the Edge Function with authentication
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('✅ Including auth token in request');
        } else {
          console.log('⚠️ No auth token available - function may require authentication');
        }
        
        const response = await fetch('https://telrerkizvtzbxjdlyoj.supabase.co/functions/v1/ai-tutor', {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            question,
            type: 'question'
          })
        });

        console.log('📥 AI response status:', response.status);

        // If we get a successful response, use it
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Received AI response');
          const aiResponse = data?.response || generateLocalFallbackResponse(question);
          
          const newMessage: Message = {
            id: Date.now().toString(),
            text: aiResponse,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          };

          setMessages(prev => [...prev, newMessage]);
          return;
        } else if (response.status === 401) {
          console.log('⚠️ Authentication required - using local fallback');
        } else {
          const errorText = await response.text();
          console.log('⚠️ Edge Function error:', response.status, errorText);
        }
      } catch (fetchError) {
        console.log('⚠️ Edge Function not available, using local fallback:', fetchError);
      }

      // If Edge Function fails or is not available, use local fallback
      const fallbackResponse = generateLocalFallbackResponse(question);
      
      const newMessage: Message = {
        id: Date.now().toString(),
        text: fallbackResponse,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, newMessage]);
      
    } catch (error: any) {
      console.error('❌ Error generating AI response:', error);
      
      // Always provide a helpful fallback message
      const errorMessage = "I'm here to help you learn! Here are some ways I can assist:\n\n• Explain technical terms (algorithm, variable, function, loop, array, etc.)\n• Provide study tips and learning strategies\n• Answer programming questions\n• Offer general learning advice\n\nPlease try asking your question again!";
      
      const errorMessageObj: Message = {
        id: Date.now().toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        type: 'info'
      };

      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
    }
  };

  const processFileWithAI = async (fileContent: string, fileName: string) => {
    try {
      setLoading(true);
      console.log('📄 Processing file with AI:', fileName);
      
      // Limit file size for processing
      if (fileContent.length > 50000) {
        throw new Error('FILE_TOO_LARGE');
      }
      
      // Get the current session to include auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Try to call the Edge Function with authentication
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        // Add authorization header if we have a session
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          console.log('✅ Including auth token in document request');
        } else {
          console.log('⚠️ No auth token available - function may require authentication');
        }
        
        const response = await fetch('https://telrerkizvtzbxjdlyoj.supabase.co/functions/v1/ai-tutor', {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            content: fileContent,
            fileName,
            type: 'document'
          })
        });

        console.log('📥 File processing response status:', response.status);

        // If we get a successful response, use it
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Received document analysis');
          const analysis: ModuleAnalysis = data;
          
          if (analysis && analysis.summary) {
            // Add summary message
            const summaryMessage: Message = {
              id: Date.now().toString(),
              text: `📄 **Document Summary: ${fileName}**\n\n${analysis.summary}`,
              isUser: false,
              timestamp: new Date(),
              type: 'summary'
            };

            // Add key points message
            const keyPointsMessage: Message = {
              id: (Date.now() + 1).toString(),
              text: `🔑 **Key Points:**\n\n${analysis.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n\n')}`,
              isUser: false,
              timestamp: new Date(),
              type: 'keypoints'
            };

            setMessages(prev => [...prev, summaryMessage, keyPointsMessage]);

            // Store quiz for later use
            if (analysis.quiz && analysis.quiz.length > 0) {
              setCurrentQuiz(analysis.quiz);
              
              const quizMessage: Message = {
                id: (Date.now() + 2).toString(),
                text: `📝 I've generated a ${analysis.quiz.length}-question quiz based on this document. Would you like to take it?`,
                isUser: false,
                timestamp: new Date(),
                type: 'quiz'
              };

              setMessages(prev => [...prev, quizMessage]);
            }
            return;
          }
        } else if (response.status === 401) {
          console.log('⚠️ Authentication required for document processing');
        } else {
          const errorText = await response.text();
          console.log('⚠️ Edge Function error:', response.status, errorText);
        }
      } catch (fetchError) {
        console.log('⚠️ Edge Function not available for document processing:', fetchError);
      }

      // Fallback document analysis
      const words = fileContent.split(/\s+/);
      const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const summaryMessage: Message = {
        id: Date.now().toString(),
        text: `📄 **Document Summary: ${fileName}**\n\n${sentences.slice(0, 3).join('. ')}.`,
        isUser: false,
        timestamp: new Date(),
        type: 'summary'
      };

      const keyPointsMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: `🔑 **Key Points:**\n\n1. This document contains approximately ${words.length} words\n2. Review the content carefully and take notes on main ideas\n3. Try to identify the main themes and supporting details\n4. Consider creating your own summary to test your understanding`,
        isUser: false,
        timestamp: new Date(),
        type: 'keypoints'
      };

      setMessages(prev => [...prev, summaryMessage, keyPointsMessage]);

    } catch (error: any) {
      console.error('❌ Error processing file:', error);
      
      let errorMessage = "I had trouble processing that document. ";
      
      if (error.message === 'FILE_TOO_LARGE') {
        errorMessage = "The document is too large to process. Please try a smaller document (under 50KB of text).";
      } else {
        errorMessage = "I can still help you! You can:\n\n• Ask me questions about the content\n• Request study tips for this type of material\n• Get general learning strategies\n\nPlease try uploading a different document or ask me a question!";
      }
      
      const errorMessageObj: Message = {
        id: Date.now().toString(),
        text: errorMessage,
        isUser: false,
        timestamp: new Date(),
        type: 'info'
      };

      setMessages(prev => [...prev, errorMessageObj]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Check file size (limit to 5MB)
        if (file.size && file.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a file smaller than 5MB.');
          return;
        }
        
        // Add user message
        const userMessage: Message = {
          id: Date.now().toString(),
          text: `📎 Uploaded: ${file.name}`,
          isUser: true,
          timestamp: new Date(),
          type: 'text'
        };

        setMessages(prev => [...prev, userMessage]);

        // Read file content
        try {
          const fileContent = await FileSystem.readAsStringAsync(file.uri);
          if (!fileContent || fileContent.trim().length === 0) {
            throw new Error('The file appears to be empty or unreadable');
          }
          await processFileWithAI(fileContent, file.name);
        } catch (readError) {
          console.error('Error reading file:', readError);
          Alert.alert('Error', 'Could not read the file. Please make sure it\'s a text document and try again.');
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Failed to upload file. Please try again.');
    }
  };

  const startQuiz = () => {
    if (currentQuiz.length > 0) {
      setCurrentQuestionIndex(0);
      setSelectedAnswer(null);
      setShowAnswer(false);
      setQuizScore(0);
      setShowQuiz(true);
    }
  };

  const handleQuizAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowAnswer(true);
    
    if (answerIndex === currentQuiz[currentQuestionIndex].correctAnswer) {
      setQuizScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowAnswer(false);
    } else {
      // Quiz completed
      const percentage = Math.round((quizScore / currentQuiz.length) * 100);
      Alert.alert(
        'Quiz Complete!',
        `You scored ${quizScore}/${currentQuiz.length} (${percentage}%)`,
        [{ text: 'OK', onPress: () => setShowQuiz(false) }]
      );
    }
  };

  const closeQuiz = () => {
    setShowQuiz(false);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowAnswer(false);
    setQuizScore(0);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const question = inputText;
    setInputText('');

    await generateAIResponse(question);
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([
              {
                id: '1',
                text: "Hello! I'm your AI Study Tutor. I can help you with:\n\n• Explaining technical terms and concepts\n• Providing study tips and strategies\n• Answering questions about various subjects\n• Analyzing uploaded documents\n• Creating practice quizzes\n\nHow can I assist you today?",
                isUser: false,
                timestamp: new Date(),
                type: 'text'
              }
            ]);
          }
        }
      ]
    );
  };

  const sendQuickMessage = (message: string) => {
    setInputText(message);
  };

  return (
    <SafeAreaView style={commonStyles.safeArea}>
      {/* Header */}
      <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={commonStyles.headerTitle}>AI Tutor</Text>
        <TouchableOpacity 
          onPress={clearChat}
          style={{
            padding: spacing.sm,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surface,
          }}
        >
          <Icon name="refresh" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['4xl'] }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={{
                alignSelf: message.isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                marginBottom: spacing.lg,
              }}
            >
              <View
                style={[
                  {
                    backgroundColor: message.isUser 
                      ? colors.primary 
                      : message.type === 'info' 
                        ? colors.info + '20'
                        : message.type === 'error'
                          ? colors.error + '20'
                          : colors.surfaceElevated,
                    padding: spacing.lg,
                    borderRadius: borderRadius.lg,
                    ...shadows.sm,
                    borderWidth: message.type === 'info' ? 2 : 0,
                    borderColor: message.type === 'info' ? colors.info : 'transparent',
                  },
                  message.isUser 
                    ? { borderBottomRightRadius: spacing.xs }
                    : { borderBottomLeftRadius: spacing.xs }
                ]}
              >
                <Text
                  style={{
                    color: message.isUser 
                      ? 'white' 
                      : message.type === 'info'
                        ? colors.text
                        : message.type === 'error'
                          ? colors.error
                          : colors.text,
                    fontSize: typography.base,
                    lineHeight: typography.base * 1.5,
                  }}
                >
                  {message.text}
                </Text>
                
                {message.type === 'quiz' && !message.isUser && (
                  <TouchableOpacity
                    style={[
                      buttonStyles.secondary,
                      { 
                        marginTop: spacing.md,
                        paddingVertical: spacing.sm,
                        paddingHorizontal: spacing.lg,
                      }
                    ]}
                    onPress={startQuiz}
                  >
                    <Icon name="help-circle" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                    <Text style={[buttonStyles.secondaryText, { fontSize: typography.sm }]}>
                      Start Quiz
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <Text
                style={[
                  commonStyles.caption,
                  {
                    marginTop: spacing.xs,
                    textAlign: message.isUser ? 'right' : 'left',
                    color: colors.textTertiary,
                  }
                ]}
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}

          {loading && (
            <View style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.surfaceElevated,
              padding: spacing.lg,
              borderRadius: borderRadius.lg,
              borderBottomLeftRadius: spacing.xs,
              ...shadows.sm,
            }}>
              <View style={commonStyles.row}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[commonStyles.body, { marginLeft: spacing.sm, color: colors.textSecondary }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={{
          padding: spacing.lg,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.borderLight,
        }}>
          {/* Quick Actions */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: spacing.md }}
          >
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TouchableOpacity
                style={[
                  buttonStyles.secondary,
                  { 
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }
                ]}
                onPress={handleFileUpload}
              >
                <Icon name="attach" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={[buttonStyles.secondaryText, { fontSize: typography.sm }]}>
                  Upload Document
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  buttonStyles.secondary,
                  { 
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }
                ]}
                onPress={() => sendQuickMessage("Give me a study tip")}
              >
                <Icon name="bulb" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={[buttonStyles.secondaryText, { fontSize: typography.sm }]}>
                  Study Tip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  buttonStyles.secondary,
                  { 
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }
                ]}
                onPress={() => sendQuickMessage("Explain what is algorithm")}
              >
                <Icon name="help-circle" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={[buttonStyles.secondaryText, { fontSize: typography.sm }]}>
                  Explain Term
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  buttonStyles.secondary,
                  { 
                    paddingVertical: spacing.sm,
                    paddingHorizontal: spacing.md,
                  }
                ]}
                onPress={() => sendQuickMessage("Give me a practice question")}
              >
                <Icon name="school" size={16} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={[buttonStyles.secondaryText, { fontSize: typography.sm }]}>
                  Practice Question
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Message Input */}
          <View style={commonStyles.row}>
            <TextInput
              style={[
                commonStyles.input,
                {
                  flex: 1,
                  marginRight: spacing.sm,
                  marginBottom: 0,
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                }
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask me anything..."
              placeholderTextColor={colors.textTertiary}
              multiline
              maxLength={1000}
              editable={!loading}
            />
            <TouchableOpacity
              style={[
                buttonStyles.primary,
                {
                  paddingHorizontal: spacing.lg,
                  paddingVertical: spacing.md,
                  opacity: (!inputText.trim() || loading) ? 0.5 : 1,
                }
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <Icon name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Quiz Modal */}
      <Modal visible={showQuiz} animationType="slide">
        <SafeAreaView style={commonStyles.safeArea}>
          <View style={[commonStyles.headerElevated, commonStyles.rowBetween]}>
            <TouchableOpacity 
              onPress={closeQuiz}
              style={{
                padding: spacing.sm,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surface,
              }}
            >
              <Icon name="close" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={commonStyles.headerTitle}>
              Quiz ({currentQuestionIndex + 1}/{currentQuiz.length})
            </Text>
            <View style={{
              backgroundColor: colors.primary,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: borderRadius.md,
            }}>
              <Text style={{ color: 'white', fontSize: typography.sm, fontWeight: typography.semibold }}>
                Score: {quizScore}
              </Text>
            </View>
          </View>

          {currentQuiz.length > 0 && (
            <View style={{ flex: 1, padding: spacing.lg }}>
              <View style={[commonStyles.card, { marginBottom: spacing.xl }]}>
                <Text style={[commonStyles.subtitle, { marginBottom: spacing.lg }]}>
                  {currentQuiz[currentQuestionIndex]?.question}
                </Text>

                {currentQuiz[currentQuestionIndex]?.options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      {
                        backgroundColor: colors.surface,
                        padding: spacing.lg,
                        borderRadius: borderRadius.lg,
                        marginBottom: spacing.md,
                        borderWidth: 2,
                        borderColor: selectedAnswer === index 
                          ? (showAnswer 
                              ? (index === currentQuiz[currentQuestionIndex].correctAnswer ? colors.success : colors.error)
                              : colors.primary)
                          : colors.border,
                      },
                      showAnswer && index === currentQuiz[currentQuestionIndex].correctAnswer && {
                        backgroundColor: colors.success + '20',
                      },
                      showAnswer && selectedAnswer === index && index !== currentQuiz[currentQuestionIndex].correctAnswer && {
                        backgroundColor: colors.error + '20',
                      }
                    ]}
                    onPress={() => !showAnswer && handleQuizAnswer(index)}
                    disabled={showAnswer}
                  >
                    <Text style={[
                      commonStyles.body,
                      {
                        color: selectedAnswer === index 
                          ? (showAnswer 
                              ? (index === currentQuiz[currentQuestionIndex].correctAnswer ? colors.success : colors.error)
                              : colors.primary)
                          : colors.text,
                        fontWeight: selectedAnswer === index ? typography.semibold : typography.normal,
                      }
                    ]}>
                      {String.fromCharCode(65 + index)}. {option}
                    </Text>
                  </TouchableOpacity>
                ))}

                {showAnswer && (
                  <View style={[
                    commonStyles.surface,
                    {
                      padding: spacing.lg,
                      marginTop: spacing.lg,
                      borderLeftWidth: 4,
                      borderLeftColor: colors.info,
                    }
                  ]}>
                    <View style={[commonStyles.row, { marginBottom: spacing.sm }]}>
                      <Icon name="information-circle" size={20} color={colors.info} />
                      <Text style={[commonStyles.label, { marginLeft: spacing.sm, marginBottom: 0 }]}>
                        Explanation
                      </Text>
                    </View>
                    <Text style={commonStyles.body}>
                      {currentQuiz[currentQuestionIndex]?.explanation}
                    </Text>
                  </View>
                )}
              </View>

              {showAnswer && (
                <TouchableOpacity
                  style={[buttonStyles.primary, { paddingVertical: spacing.lg }]}
                  onPress={nextQuestion}
                >
                  <Text style={buttonStyles.primaryText}>
                    {currentQuestionIndex < currentQuiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
