import React, { useState, useRef, useEffect } from "react";
import { marked } from 'marked';

const PETBOT_LOGO = (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="24" fill="#4F8AF4"/>
    <ellipse cx="16" cy="20" rx="4" ry="6" fill="#fff"/>
    <ellipse cx="32" cy="20" rx="4" ry="6" fill="#fff"/>
    <ellipse cx="24" cy="32" rx="10" ry="8" fill="#fff"/>
    <circle cx="19" cy="22" r="1.5" fill="#4F8AF4"/>
    <circle cx="29" cy="22" r="1.5" fill="#4F8AF4"/>
    <ellipse cx="24" cy="34" rx="3" ry="1.5" fill="#4F8AF4"/>
  </svg>
);

const funFacts = [
  "Dogs have about 1,700 taste buds. Humans have about 9,000!",
  "Cats can rotate their ears 180 degrees.",
  "A group of kittens is called a kindle.",
  "Some turtles can breathe through their butts!",
  "Goldfish have a memory-span of at least three months.",
  "Rabbits can't vomit.",
  "Guinea pigs need vitamin C in their diet, just like humans!"
];

const Chatbot = () => {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState([
    {
      sender: "bot",
      text: "🐾 Hi! I'm PetCare AI. Ask me anything about your pet's health, nutrition, behavior, or products!",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expanded: true
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const chatEndRef = useRef(null);
  // Use API key directly here
  const API_KEY = "AIzaSyAywhccPmyHxbbK_D5hhM6n7tC8PnX_El0";
  const [factIdx, setFactIdx] = useState(Math.floor(Math.random() * funFacts.length));
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 640); // open by default on desktop

  // Responsive sidebar toggle for mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Quick action buttons for common pet care topics
  const quickActions = [
    "My dog is not eating",
    "Best food for kittens",
    "How often should I bathe my cat?",
    "Safe chew toys for puppies",
    "My pet is scratching a lot",
    "Recommended supplements for senior dogs",
    "How to stop my dog from barking?",
    "Emergency help needed",
    "Vaccination schedule for puppies",
    "Pet grooming tips"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, loading]);

  const handleSend = async (msg) => {
    if (!API_KEY) {
      setError("API key is missing. Please set REACT_APP_GEMINI_API_KEY in your .env file.");
      return;
    }
    const message = typeof msg === "string" ? msg : input;
    if (!message || loading) return;
    setError("");
    setLoading(true);
    const userMessage = {
      sender: "user",
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      expanded: true
    };
    const updatedChat = [...chat, userMessage];
    setChat(updatedChat);
    setInput("");

    // System prompt to keep AI focused on pet care only
    const systemPrompt =
      "You are PetCare AI, an expert assistant for pet healthcare and pet product advice. Only answer questions related to pet health, nutrition, behavior, and recommend pet products. If asked about anything non-pet-related, politely redirect to pet care topics.";

    // Build the contents array with correct roles
    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...updatedChat.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }))
    ];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents })
        }
      );
      const data = await response.json();
      if (data.error) {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: `Error: ${data.error.message}`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
        setError(data.error.message);
        setLoading(false);
        return;
      }
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: data.candidates[0].content.parts[0].text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
      } else {
        setChat([
          ...updatedChat,
          {
            sender: "bot",
            text: "Sorry, I couldn't get a valid response from the AI.",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expanded: true
          }
        ]);
      }
    } catch (err) {
      setError("Network or API error. Please try again later.");
      setChat([
        ...updatedChat,
        {
          sender: "bot",
          text: "Sorry, something went wrong. Please try again later.",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          expanded: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand/collapse for Q&A pairs
  const toggleExpand = (idx) => {
    setChat((prev) =>
      prev.map((msg, i) =>
        i === idx ? { ...msg, expanded: !msg.expanded } : msg
      )
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group chat into Q&A pairs for collapsible view
  const qaPairs = [];
  let i = 0;
  while (i < chat.length) {
    if (chat[i].sender === "user" && chat[i + 1]?.sender === "bot") {
      qaPairs.push([chat[i], chat[i + 1]]);
      i += 2;
    } else {
      qaPairs.push([chat[i]]);
      i += 1;
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 to-green-100 flex flex-col sm:flex-row items-stretch overflow-hidden">
      {/* Sidebar with logo, welcome, tips, fun fact */}
      <aside
        className={`transition-all duration-300 fixed sm:static z-30 top-0 left-0 h-full sm:h-auto bg-white/90 border-r border-blue-100 shadow-lg flex flex-col items-center py-6 px-4 gap-4
        ${sidebarOpen ? 'w-4/5 sm:w-80' : 'w-16 sm:w-16'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}
        sm:relative sm:translate-x-0`}
        style={{ minWidth: sidebarOpen ? undefined : 64 }}
      >
        <div className="flex flex-col items-center w-full">
          <div className="mb-2">{PETBOT_LOGO}</div>
          <button
            className="sm:absolute sm:right-2 sm:top-2 absolute right-2 top-2 bg-blue-100 hover:bg-blue-200 rounded-full p-1 text-blue-700 focus:outline-none"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
            ) : (
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
            )}
          </button>
        </div>
        {sidebarOpen && (
          <>
            <h2 className="text-xl font-bold text-blue-900 mb-1 mt-2">PetCare AI</h2>
            <p className="text-gray-600 text-center mb-2">Your friendly pet health & product assistant. Ask me anything about your pet's care, nutrition, or behavior!</p>
            <div className="w-full mt-4">
              <h3 className="font-semibold text-blue-700 mb-1">Tips for Best Results:</h3>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                <li>Be specific about your pet's species, age, and symptoms.</li>
                <li>Ask one question at a time for detailed answers.</li>
                <li>Try the quick action buttons for common topics!</li>
              </ul>
            </div>
            <div className="w-full mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800 text-center">
              <span className="font-semibold">🐶 Fun Pet Fact:</span><br />
              {funFacts[factIdx]}
              <button className="ml-2 text-blue-500 underline text-xs" onClick={() => setFactIdx((factIdx + 1) % funFacts.length)}>Next fact</button>
            </div>
            <div className="mt-auto text-xs text-gray-400 pt-4 border-t w-full text-center">&copy; {new Date().getFullYear()} PetCare AI | Made with ❤️ for pets</div>
          </>
        )}
      </aside>
      {/* Main chat area */}
      <main className="flex-1 flex flex-col bg-white rounded-3xl shadow-2xl p-0 sm:p-6 h-full overflow-hidden">
        {/* Header with sidebar toggle for mobile */}
        <header className="w-full bg-white/80 backdrop-blur border-b border-blue-100 shadow-sm flex items-center justify-between py-3 mb-2 px-4 sm:px-0 flex-shrink-0">
          <div className="flex items-center">
            {window.innerWidth < 640 && (
              <button
                className="mr-2 bg-blue-100 hover:bg-blue-200 rounded-full p-1 text-blue-700 focus:outline-none"
                onClick={() => setSidebarOpen((v) => !v)}
                aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarOpen ? (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
                ) : (
                  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
                )}
              </button>
            )}
            <span className="text-3xl mr-2">🐾</span>
            <h1 className="text-2xl font-bold text-blue-900 tracking-tight">PetCare AI Chatbot</h1>
          </div>
        </header>
        {/* Chat window with collapsible Q&A pairs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-2 sm:px-0 py-4 space-y-3 custom-scrollbar">
            {qaPairs.map((pair, idx) => (
              <div key={idx} className="mb-2">
                {/* User bubble (right) */}
                {pair[0].sender === "user" && (
                  <div className="flex justify-end items-center gap-2 cursor-pointer group" onClick={() => pair.length === 2 && toggleExpand(chat.indexOf(pair[0]))}>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center mb-1">
                        <span className="font-semibold text-blue-700 mr-2">You</span>
                        <span className="text-xs text-gray-400">{pair[0].time}</span>
                        <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-lg font-bold ml-2">
                          <span role="img" aria-label="User">🧑</span>
                        </div>
                      </div>
                      <div className={`bg-blue-600 text-white px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`}>{pair[0].text}</div>
                    </div>
                    <span className="ml-2 text-gray-400 text-xs group-hover:underline">{pair.length === 2 ? (pair[0].expanded ? 'Collapse' : 'Expand') : ''}</span>
                  </div>
                )}
                {/* Bot bubble (left) */}
                {pair[1] && (
                  <div className="flex justify-start items-center gap-2 mt-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center mb-1">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[1].time}</span>
                      </div>
                      <div className={`bg-green-50 text-green-900 px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg ${pair[0].expanded ? '' : 'max-h-8 overflow-hidden'}`} dangerouslySetInnerHTML={{ __html: marked(pair[1].text) }}></div>
                    </div>
                    <span className="ml-2 text-gray-400 text-xs group-hover:underline">{pair[0].expanded ? 'Collapse' : 'Expand'}</span>
                  </div>
                )}
                {/* If only bot message (welcome) */}
                {pair[0].sender === "bot" && !pair[1] && (
                  <div className="flex justify-start items-center gap-2">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center mb-1">
                        <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                          <span role="img" aria-label="Bot">🤖</span>
                        </div>
                        <span className="font-semibold text-green-700">PetBot</span>
                        <span className="ml-2 text-xs text-gray-400">{pair[0].time}</span>
                      </div>
                      <div className="bg-green-50 text-green-900 px-5 py-3 rounded-2xl shadow-lg text-base whitespace-pre-line max-w-lg" dangerouslySetInnerHTML={{ __html: marked(pair[0].text) }}></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 ml-10 mt-2">
                <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-lg font-bold mr-2">
                  <span role="img" aria-label="Bot">🤖</span>
                </div>
                <div className="bg-green-50 text-green-900 px-4 py-2 rounded-2xl shadow-sm text-sm animate-pulse">
                  PetBot is typing...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        {/* Floating quick action bar */}
        <div className="bg-white/90 py-2 px-2 rounded-b-3xl border-t border-blue-100 shadow-inner flex-shrink-0">
          <div className="flex flex-wrap gap-2 justify-center mb-2">
            {quickActions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="bg-gradient-to-br from-blue-100 to-green-100 hover:from-blue-200 hover:to-green-200 text-gray-700 px-3 py-2 rounded-full text-xs border border-gray-200 hover:border-blue-400 transition-colors min-w-[120px] min-h-[40px]"
                disabled={loading}
              >
                {q}
              </button>
            ))}
          </div>
          {/* Input area */}
          <div className="flex gap-2 pb-2 sm:pb-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-base"
              placeholder="Ask about pet health, nutrition, behavior, or products..."
              disabled={loading}
            />
            <button
              onClick={() => handleSend()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-semibold transition-colors disabled:bg-blue-300 text-base"
              disabled={loading || !input.trim()}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </div>
          {error && <div className="text-red-500 text-xs mt-2 text-center">{error}</div>}
        </div>
        <footer className="mt-2 text-center text-xs text-gray-400 flex-shrink-0">
          ⚠️ This AI assistant provides general pet care and product information only.<br />For emergencies or specific health concerns, always consult a licensed veterinarian.<br />
          <a href="https://www.aspca.org/pet-care" className="underline text-blue-500" target="_blank" rel="noopener noreferrer">More pet care resources</a>
        </footer>
      </main>
    </div>
  );
};

export default Chatbot;