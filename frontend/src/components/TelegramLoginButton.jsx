import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.innerHTML !== '') {
            return;
        }

        const cleanBotName = botName.replace('@', '');
        console.log('Initializing Telegram Widget for:', cleanBotName);

        // Persistent callback for the widget
        window.onTelegramAuth = (user) => {
            console.log("Telegram Auth callback received", user);
            if (dataOnauth) dataOnauth(user);
        };

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-onauth', 'onTelegramAuth');
        script.setAttribute('data-request-access', requestAccess);
        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        if (containerRef.current) {
            containerRef.current.appendChild(script);
        }

        return () => {
            // Cleanup on unmount - but carefully
            // Actually better not to touch global callback here to avoid race conditions
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic]); // Removed dataOnauth to avoid re-runs

    return (
        <div className="telegram-login-button-container">
            <div ref={containerRef} className="telegram-login-button" />
        </div>
    );
};

export default TelegramLoginButton;
