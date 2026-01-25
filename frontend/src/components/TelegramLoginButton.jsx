import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        window.onTelegramAuth = (user) => {
            dataOnauth(user);
        };

        // Sanitize bot name (remove @ if present)
        const cleanBotName = botName.replace('@', '');
        console.log('Initializing Telegram Widget with bot:', cleanBotName);

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');
        script.setAttribute('data-request-access', requestAccess);
        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            delete window.onTelegramAuth;
        };
    }, [botName, dataOnauth, buttonSize, cornerRadius, requestAccess, usePic]);

    return <div ref={containerRef} className="telegram-login-button" />;
};

export default TelegramLoginButton;
