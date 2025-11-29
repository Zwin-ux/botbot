import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.links}>
                    <a href={process.env.NEXT_PUBLIC_DOCS_URL || '#'} className={styles.link}>Docs</a>
                    <a href={process.env.NEXT_PUBLIC_SUPPORT_SERVER_URL || '#'} className={styles.link}>Support Server</a>
                    <a href="/privacy" className={styles.link}>Privacy</a>
                    <a href="/terms" className={styles.link}>Terms</a>
                </div>
                <div className={styles.copyright}>
                    <p>&copy; {new Date().getFullYear()} BotBot. Built by Bonelli Labs.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
