import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Bell, ChevronUp, ChevronDown, Send } from 'lucide-react';

const ToastNotification = ({ logs, onSendMessage }) => {
    const [showChat, setShowChat] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const chatEndRef = useRef(null);

    // Filter to show only the very last log entry when collapsed
    const lastLog = logs && logs.length > 0 ? logs[logs.length - 1] : null;

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
                        className="pointer-events-auto bg-black/95 backdrop-blur-xl border border-white/20 p-3 rounded-2xl w-full h-80 flex flex-col shadow-2xl mb-2 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10 shrink-0">
                            <h3 className="text-white font-bold text-xs flex items-center gap-2 uppercase tracking-wider">
                                <MessageSquare size={14} className="text-yellow-400" />
                                Чат и события
                            </h3>
                            <button
                                onClick={() => setShowChat(false)}
                                className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 pr-1 custom-scrollbar">
                            {logs?.map((log, i) => (
                                <div key={i} className={`text-[11px] p-2 rounded-lg break-words ${log.includes('выбросил') || log.includes('Turn') || log.includes('Game started')
                                        ? 'text-yellow-200/80 bg-yellow-500/10'
                                        : 'text-gray-300 bg-white/5'
                                    }`}>
                                    {log}
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Emojis Bar (Satirical Mix) */}
                        <div className="flex items-center gap-1 px-1 py-1 overflow-x-auto no-scrollbar shrink-0 mt-1 border-t border-white/5">
                            {[
                                { e: '🤡', t: 'Клоун' }, { e: '🤑', t: 'Олигарх' }, { e: '🗿', t: 'База' },
                                { e: '☢️', t: 'Орешник' }, { e: '💸', t: 'Откат' }, { e: '💩', t: 'Оппозиция' },
                                { e: '🍿', t: 'Наблюдаю' }, { e: '🎪', t: 'Цирк' }, { e: '💣', t: 'Бум' },
                                { e: '🥂', t: 'За победу' }, { e: '📉', t: 'Дефолт' }, { e: '🚀', t: 'Взлетаем' },
                                { e: '👮', t: 'ФСБ' }, { e: '🕊️', t: 'Мир' }
                            ].map((item, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setInputValue(prev => prev + item.e)}
                                    className="text-lg hover:scale-125 transition-transform p-1 filter drop-shadow-sm"
                                    title={item.t}
                                >
                                    {item.e}
                                </button>
                            ))}
                        </div>

                        {/* Input Area */}
                        <form onSubmit={handleSubmit} className="mt-1 flex gap-2 shrink-0">
                            <input
                                autoFocus
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Напишите сообщение..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-yellow-400/50 transition-colors"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim()}
                                className="p-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-30 disabled:grayscale text-black rounded-xl transition-all active:scale-95"
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed Chat / Last Message Toast */}
            {!showChat && (
                <div className="flex justify-center w-full pointer-events-auto">
                    <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setShowChat(true)}
                        className="bg-black/80 backdrop-blur-md border border-white/20 text-white px-4 py-2.5 rounded-2xl shadow-xl hover:bg-black/90 transition-all cursor-pointer flex items-center gap-3 w-full max-w-[320px] group"
                    >
                        <div className="shrink-0 w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                        <div className="flex-1 min-w-0 pr-2">
                            <p className="text-[11px] font-medium text-white/90 truncate leading-tight">
                                {lastLog || "Чат пуст... Напишите первым!"}
                            </p>
                        </div>
                        <ChevronUp size={14} className="text-white/40 group-hover:text-white group-hover:-translate-y-0.5 transition-all shrink-0" />
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ToastNotification;
