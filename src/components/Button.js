import React from 'react';
import styles from './Button.module.css';

const Button = ({ children, variant = 'primary', href, onClick, className = '' }) => {
    const buttonClass = `${styles.button} ${styles[variant]} ${className}`;

    if (href) {
        return (
            <a href={href} className={buttonClass} target="_blank" rel="noopener noreferrer">
                {children}
            </a>
        );
    }

    return (
        <button className={buttonClass} onClick={onClick}>
            {children}
        </button>
    );
};

export default Button;
