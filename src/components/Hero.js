import React from 'react';
// import Image from 'next/image';
import Button from './Button';
import styles from './Hero.module.css';

const Hero = () => {
    return (
        <section className={styles.hero}>
            <div className={styles.container}>
                <div className={styles.logoWrapper}>
                    <img
                        src="/logo.png"
                        alt="BotBot Logo"
                        width={120}
                        height={120}
                        className={styles.logo}
                    />
                </div>
                <h1 className={styles.title}>
                    Your AI Companion <br />
                    <span className={styles.highlight}>That Remembers</span>
                </h1>
                <p className={styles.subtitle}>
                    BotBot isn't just a bot. It's a platform-agnostic friend that learns, grows, and hangs out wherever you are.
                </p>
                <div className={styles.actions}>
                    <Button href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || '#'} variant="primary">
                        Add to Discord
                    </Button>
                    <Button href={process.env.NEXT_PUBLIC_SUPPORT_SERVER_URL || '#'} variant="secondary">
                        Join Community
                    </Button>
                </div>
            </div>
        </section>
    );
};

export default Hero;
