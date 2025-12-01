import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2, Bot, User } from 'lucide-react';

interface ChatMessage {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

interface ChatbotProps {
    isOpen: boolean;
    onClose: () => void;
    context?: string;
}

const Chatbot: React.FC<ChatbotProps> = ({ isOpen, onClose, context }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const API_BASE_URL = 'http://localhost:8000';

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            type: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage.content,
                    context: context || 'No specific medical context provided.'
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: data.response,
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'I apologize, but I encountered an error connecting to the server. Please try again later.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white/20 p-2 rounded-full">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Medical Assistant</h3>
                            <p className="text-xs text-blue-100">Powered by Gemini AI</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                            <div className="bg-blue-100 p-4 rounded-full">
                                <MessageCircle className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="text-center max-w-xs">
                                <p className="font-medium text-gray-900">Welcome!</p>
                                <p className="text-sm mt-1">I can help answer questions about brain tumors, symptoms, and treatments.</p>
                            </div>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-blue-600' : 'bg-indigo-600'
                                    }`}>
                                    {msg.type === 'user' ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-white" />}
                                </div>

                                <div
                                    className={`px-4 py-2 rounded-2xl shadow-sm ${msg.type === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-none'
                                            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                                        }`}
                                >
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 ${msg.type === 'user' ? 'text-blue-200' : 'text-gray-400'
                                        }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 flex items-center space-x-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-sm text-gray-500">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex space-x-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type your medical question..."
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            disabled={isLoading}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-center text-[10px] text-gray-400 mt-2">
                        AI can make mistakes. Please consult a medical professional.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
