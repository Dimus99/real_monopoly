import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Bell, ChevronUp, ChevronDown, Send } from 'lucide-react';

const ToastNotification = ({ logs, onSendMessage }) => {
    const [recentLogs, setRecentLogs] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const chatEndRef = useRef(null);

    const processedCountRef = useRef(0);
    // Initialize processed count on mount if logs exist
    useEffect(() => {
        if (logs?.length) {
            processedCountRef.current = Math.max(0, logs.length - 3); // Show last 3 on reload
        }
    }, []);

    // Filter to show only new logs as toasts
    useEffect(() => {
        if (logs && logs.length > processedCountRef.current) {
            const newLogs = logs.slice(processedCountRef.current);
            processedCountRef.current = logs.length;

            const newEntries = newLogs.map((text, i) => ({
                id: Date.now() + i,
                text
            }));

            setRecentLogs(prev => [...prev.slice(-1), ...newEntries]);

            // Auto remove toast after 5 seconds
            newEntries.forEach(entry => {
                setTimeout(() => {
                    setRecentLogs(prev => prev.filter(l => l.id !== entry.id));
                }, 5000);
            });
        }
    }, [logs]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs, showChat]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (inputValue.trim() && onSendMessage) {
            onSendMessage(inputValue);
            setInputValue('');
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-end pointer-events-none">
            {/* Chat Window - Expandable */}
            <AnimatePresence>
                {showChat && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="pointer-events-auto bg-black/90 backdrop-blur-md border border-white/20 p-3 rounded-xl w-full h-80 flex flex-col shadow-2xl mb-2"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 shrink-0">
                            <h3 className="text-white font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
                                <MessageSquare size={14} className="text-yellow-400" />
                                Чат
                            </h3>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 custom-scrollbar">
                            {logs?.map((log, i) => (
                                <div key={i} className="text-xs text-gray-300 bg-white/5 p-2 rounded-lg break-words">
                                    {log}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Emojis Bar (Satirical Mix) */}
                        <div className="flex items-center gap-1.5 px-1 py-1 overflow-x-auto custom-scrollbar no-scrollbar scrollbar-hide shrink-0 mt-1">
                            {[
                                { e: '🤡', t: 'Клоун' },
                                { e: '🤑', t: 'Олигарх' },
                                { e: '🗿', t: 'База' },
                                { e: '☢️', t: 'Орешник' },
                                { e: '💸', t: 'Откат' },
                                { e: '🤡', t: 'Клоун' },
                                { e: '💩', t: 'Оппозиция' },
                                { e: '🍿', t: 'Наблюдаю' },
                                { e: '🎪', t: 'Цирк' },
                                { e: '💣', t: 'Бум' },
                                { e: '🥂', t: 'За победу' },
                                { e: '📉', t: 'Дефолт' },
                                { e: '🚀', t: 'Взлетаем' },
                                { e: '👮', t: 'ФСБ' },
                                { e: '🕊️', t: 'Мирные переговоры' }
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setInputValue(prev => prev + item.e)}
                                    className="text-lg hover:scale-125 transition-transform p-1 grayscale-[0.3] hover:grayscale-0"
                                    title={item.t}
                                >
                                    {item.e}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="mt-1 pt-2 border-t border-white/10 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Напишите сообщение..."
                                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="p-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-lg transition-colors"
                            >
                                <Send size={14} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Notification Toasts (Only visible when chat is CLOSED) */}
            <AnimatePresence mode="popLayout">
                {!showChat && recentLogs.map((log) => (
                    <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -50, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 0.8 }}
                        layout
                        className="pointer-events-auto mb-2 bg-gradient-to-r from-slate-900 to-slate-800 border-l-4 border-yellow-400 text-white p-3 rounded-r-lg shadow-lg flex items-center gap-3 w-full backdrop-blur-sm"
                    >
                        <Bell size={16} className="text-yellow-400 shrink-0" />
                        <span className="text-xs font-medium line-clamp-2">{log.text}</span>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Toggle Button */}
            {!showChat && (
                <div className="flex justify-center w-full pointer-events-auto">
                    <motion.button
                        layout
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowChat(true)}
                        className="bg-black/60 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full shadow-lg hover:bg-black/80 transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wide group"
                    >
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Открыть Чат
                        <ChevronUp size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                    </motion.button>
                </div>
            )}
        </div>
    );
};

export default ToastNotification;
