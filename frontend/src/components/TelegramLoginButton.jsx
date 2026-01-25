import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.innerHTML !== '') {
            return;
        }

        const cleanBotName = botName.replace('@', '');
        console.log('DEBUG AUTH: [Widget] Initializing for:', cleanBotName);

        // Define a truly global callback with a unique name if possible, 
        // but the widget attribute 'data-onauth' needs a static string.
        const callbackName = 'onTelegramAuthInternal';

        window[callbackName] = (user) => {
            console.log("DEBUG AUTH: [Widget] Global callback triggered!", user);
            if (dataOnauth) {
                dataOnauth(user);
            } else {
                console.error("DEBUG AUTH: [Widget] No auth handler provided to component");
            }
        };

        console.log(`DEBUG AUTH: [Widget] Callback ${callbackName} registered:`, typeof window[callbackName]);

        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.setAttribute('data-telegram-login', cleanBotName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-onauth', callbackName);
        script.setAttribute('data-request-access', requestAccess);
        if (!usePic) script.setAttribute('data-userpic', 'false');
        script.async = true;

        script.onload = () => console.log("DEBUG AUTH: [Widget] Script loaded successfully");
        script.onerror = (e) => console.error("DEBUG AUTH: [Widget] Script failed to load", e);

        if (containerRef.current) {
            console.log("DEBUG AUTH: [Widget] Appending script to container");
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
