import React, { useEffect, useRef } from 'react';

/**
 * Telegram Login Button Component
 * Based on official documentation: https://core.telegram.org/widgets/login
 */
const TelegramLoginButton = ({
    botName,
    dataOnauth,
    buttonSize = 'large',
    cornerRadius = 10,
    requestAccess = 'write',
    usePic = true
}) => {
    const containerRef = useRef(null);

    useEffect(() => {
        // 1. Define the global callback function that Telegram widget will call
        window.onTelegramAuth = (user) => {
            console.log("Telegram Auth Success:", user);
            if (dataOnauth) {
                dataOnauth(user);
            }
        };

        // 2. Prepare the script element
        const script = document.createElement('script');
        script.src = 'https://telegram.org/js/telegram-widget.js?22';
        script.async = true;

        // 3. Set data attributes as per documentation
        script.setAttribute('data-telegram-login', botName);
        script.setAttribute('data-size', buttonSize);
        script.setAttribute('data-radius', cornerRadius);
        script.setAttribute('data-request-access', requestAccess);
        script.setAttribute('data-onauth', 'onTelegramAuth(user)');

        if (!usePic) {
            script.setAttribute('data-userpic', 'false');
        }

        // 4. Mount the script
        if (containerRef.current) {
            containerRef.current.innerHTML = ''; // Clear previous instances
            containerRef.current.appendChild(script);
        }

        // Cleanup
        return () => {
            // Optional: remove the global callback if strictly necessary, 
            // but keeping it might be safer for pending callbacks.
            // window.onTelegramAuth = undefined; 
        };
    }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

    return (
        <div
            ref={containerRef}
            className="telegram-login-button flex justify-center items-center my-4"
        >
            {/* Script will be injected here */}
        </div>
    );
};

export default TelegramLoginButton;
