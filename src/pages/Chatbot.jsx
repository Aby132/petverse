import React, { useState, useRef, useEffect } from 'react';
import aiService from '../services/aiService';

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "🏥 Hello! I'm Dr. PetCare, your specialized AI veterinary assistant!\n\n🎯 **I can help you with:**\n• 🚨 Emergency pet situations\n• 🏥 Health symptoms and concerns\n• 🥘 Nutrition and feeding guidance\n• 🎓 Training and behavior issues\n• 🧴 Pet product recommendations\n• 🐕🐱 Care for dogs, cats, and other pets\n\n⚠️ **Important:** I only answer pet-related questions. For human health or non-pet topics, I'll redirect you back to pet care.\n\n🐾 **What can I help you with regarding your pet today?**",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Quick action buttons for common pet healthcare questions
  const quickActions = [
    { text: "My pet isn't eating", icon: "🍽️" },
    { text: "My pet is vomiting", icon: "🤢" },
    { text: "Pet has diarrhea", icon: "💩" },
    { text: "Emergency help needed", icon: "🚨" },
    { text: "What should I feed my dog", icon: "🐕" },
    { text: "Cat behavior problems", icon: "�" },
    { text: "Pet training tips", icon: "🎓" },
    { text: "Vaccination schedule", icon: "💉" },
    { text: "Pet grooming advice", icon: "✂️" },
    { text: "Signs my pet is sick", icon: "🏥" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Pet healthcare focused quick actions are defined above

  const getBotResponse = async (userMessage) => {
    try {
      // Get conversation context (last 5 messages)
      const context = messages
        .slice(-5)
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      // Use AI service to generate response
      const aiResponse = await aiService.generateResponse(userMessage, context);
      return aiResponse;
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback to simple responses if AI fails
      return aiService.getPetFallbackResponse(userMessage);
    }
  };

  const handleSendMessage = async (messageText = null) => {
    const message = messageText || inputMessage.trim();
    if (!message) return;

    const userMessage = {
      id: messages.length + 1,
      text: message,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!messageText) setInputMessage(''); // Only clear input if it came from input field
    setIsTyping(true);

    try {
      // Get AI response
      const aiResponseText = await getBotResponse(message);

      const botResponse = {
        id: messages.length + 2,
        text: aiResponseText,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorResponse = {
        id: messages.length + 2,
        text: "I'm sorry, I'm having trouble responding right now. Please try again later.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickQuestion = (question) => {
    handleSendMessage(question);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🩺🐾</div>
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
            Dr. PetCare AI Assistant
          </h1>
          <p className="text-gray-600 mb-3">
            AI-powered pet healthcare guidance using Hugging Face models
          </p>
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-3 text-sm max-w-2xl mx-auto">
            <div className="flex items-center justify-center mb-2">
              <span className="text-blue-600 font-semibold">🤖 Powered by Hugging Face AI</span>
              <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">FREE</span>
            </div>
            <p className="text-gray-700">
              <strong>🎯 Pet-Focused Only:</strong> I specialize in pet health, nutrition, behavior, and emergency guidance.
              For non-pet questions, I'll redirect you to pet care topics.
            </p>
          </div>

          {/* AI Status Indicator */}
          <div className="flex justify-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              aiService.isConfigured()
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                aiService.isConfigured() ? 'bg-green-400' : 'bg-yellow-400'
              }`}></div>
              {aiService.isConfigured() ? 'AI Enhanced Mode' : 'Basic Mode'}
            </div>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-primary-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Healthcare Actions */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-3">🩺 Quick pet healthcare questions:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuestion(action.text)}
                  className="flex flex-col items-center justify-center text-xs bg-gradient-to-br from-blue-50 to-green-50 hover:from-blue-100 hover:to-green-100 text-gray-700 px-2 py-3 rounded-lg transition-colors border border-gray-200 hover:border-primary-300"
                >
                  <span className="text-lg mb-1">{action.icon}</span>
                  <span className="text-center leading-tight">{action.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-4">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me about pet health, nutrition, behavior, or emergency care..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white px-6 py-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ⚠️ This AI assistant provides general pet care information only. 
            For medical emergencies or specific health concerns, please consult a qualified veterinarian.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
