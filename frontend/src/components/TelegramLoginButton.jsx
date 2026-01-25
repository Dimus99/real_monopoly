import React, { useEffect, useRef } from 'react';

const TelegramLoginButton = ({ botName, dataOnauth, buttonSize = 'large', cornerRadius = 10, requestAccess = 'write', usePic = true }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // Prevent multiple buttons/scripts from being added if already initialized
        if (containerRef.current && containerRef.current.innerHTML !== '') {
            return;
        }

        const cleanBotName = botName.replace('@', '');
        const currentOrigin = window.location.origin;
        console.log('DEBUG AUTH: [Widget] Initializing for:', cleanBotName, 'on origin:', currentOrigin);
        console.log('DEBUG AUTH: [Widget] IMPORTANT: Check if', currentOrigin, 'is allowed in @BotFather /setdomain');

        const callbackName = 'onTelegramAuth';
        window[callbackName] = (user) => {
            console.log("DEBUG AUTH: [Widget] Global callback triggered! Data:", user);
            if (dataOnauth) {
                dataOnauth(user);
            } else {
                console.error("DEBUG AUTH: [Widget] No auth handler provided to component");
            }
        };

        console.log(`DEBUG AUTH: [Widget] Global callback window.${callbackName} is ready:`, typeof window[callbackName]);

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
            containerRef.current.innerHTML = '';
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
