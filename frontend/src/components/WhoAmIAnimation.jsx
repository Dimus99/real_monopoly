import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Heart, Star, Sun, Cloud, Coffee, Laugh, Skull, Ghost, Dizzy } from 'lucide-react';

const WhoAmIAnimation = ({ isVisible, onClose }) => {
    const jokes = [
        "— Мама, а почему папа так быстро бежит по полю?\n— Не болтай, доченька, подавай второй рожок!",
        "— Доктор, я задыхаюсь!\n— Не переживайте, сейчас выпишем вам справку, что вы здоровы, и всё пройдет.",
        "Приходит мужик к врачу:\n— Доктор, мне кажется, что я — мотылек.\n— Так вам к психиатру.\n— А я к вам шел — у вас свет горел...",
        "— Опишите свою жизнь двумя словами.\n— Еще нет.",
        "Бабушка так сильно любила внука, что когда он не доел суп, она просто дочитала за него завещание.",
        "— Папа, а почему бабушка по полю зигзагами бежит?\n— Для кого бабушка, а для кого — движущаяся мишень!",
        "Вчера мой дедушка за час убил 20 человек. В музее восковых фигур.",
        "— Девушка, можно с вами познакомиться?\n— Я для вас слишком дорогая.\n— Что, прямо настолько богатая фантазия?",
        "— Доктор, у меня депрессия.\n— А вы сходите в цирк, там выступает клоун Пальяччи.\n— Но доктор... я и есть Пальяччи.",
        "Маленький мальчик нашел пулемет — больше в деревне никто не живет.",
        "Люди как снежинки. Если на них пописать — они исчезают.",
        "— Почему в Африке так много детей?\n— Потому что лекарство от СПИДа еще не изобрели, а игры в 'Монополию' там нет.",
        "Что общего между черным юмором и едой? Не у всех есть.",
        "— Папа, а что такое 'черный юмор'?\n— Видишь вон того безрукого дядю? Попроси его похлопать в ладоши.\n— Но папа, я же слепой!\n— Вот именно.",
        "Врач: 'У меня для вас две новости: плохая и очень плохая'. Пациент: 'Давайте плохую'. Врач: 'Вам осталось жить 24 часа'. Пациент: 'Боже мой! А какая же тогда очень плохая?'. Врач: 'Я вчера забыл вам это сказать'."
    ];

    const icons = [Sparkles, Heart, Star, Sun, Cloud, Coffee, Laugh, Skull, Ghost, Dizzy];
    const [currentJoke, setCurrentJoke] = useState(jokes[0]);
    const [currentIcon, setCurrentIcon] = useState(0);

    useEffect(() => {
        if (isVisible) {
            const randomIdx = Math.floor(Math.random() * jokes.length);
            setCurrentJoke(jokes[randomIdx]);
            setCurrentIcon(Math.floor(Math.random() * icons.length));
        }
    }, [isVisible]);

    const IconComponent = icons[currentIcon];

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-indigo-950/90 backdrop-blur-xl cursor-pointer overflow-hidden"
                >
                    {/* Floating Background Particles */}
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{
                                x: Math.random() * 2000 - 1000,
                                y: Math.random() * 2000 - 1000,
                                opacity: 0
                            }}
                            animate={{
                                x: Math.random() * 2000 - 1000,
                                y: Math.random() * 2000 - 1000,
                                opacity: [0, 0.3, 0],
                                scale: [0, 1, 0]
                            }}
                            transition={{
                                duration: Math.random() * 5 + 5,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                            className="absolute w-2 h-2 bg-yellow-400 rounded-full blur-sm"
                        />
                    ))}

                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        className="bg-white/10 p-12 rounded-[40px] border border-white/20 shadow-2xl backdrop-blur-md flex flex-col items-center gap-8 text-center max-w-lg mx-4"
                    >
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                rotate: [0, 10, -10, 0]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 rounded-3xl shadow-lg"
                        >
                            <IconComponent size={64} className="text-white" />
                        </motion.div>

                        <div className="space-y-4">
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white/60 uppercase tracking-[0.2em] text-sm font-bold"
                            >
                                Анекдот дня:
                            </motion.h2>
                            <motion.h1
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-2xl md:text-3xl font-bold text-white whitespace-pre-line leading-relaxed"
                            >
                                {currentJoke}
                            </motion.h1>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="absolute bottom-10 text-white/40 text-sm font-medium tracking-widest uppercase flex items-center gap-2"
                    >
                        <span>Нажми везде, чтобы вернуться к игре</span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default WhoAmIAnimation;
