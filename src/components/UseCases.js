import React from 'react';
import styles from './UseCases.module.css';

const Card = ({ title, description }) => (
    <div className={styles.card}>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.cardDescription}>{description}</p>
    </div>
);

const UseCases = () => {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>More Than Just a Bot</h2>
                <div className={styles.grid}>
                    <Card
                        title="Long-term Memory"
                        description="BotBot remembers your preferences, past conversations, and context, so you don't have to repeat yourself."
                    />
                    <Card
                        title="Plugin Skills"
                        description="Extend BotBot's capabilities with plugins for productivity, games, and more."
                    />
                    <Card
                        title="Cross-Platform"
                        description="Start a chat on Discord, continue via SMS or Web. BotBot is where you are."
                    />
                    <Card
                        title="Personalized Growth"
                        description="The more you interact, the more BotBot adapts to your unique personality and needs."
                    />
                </div>
                <div className={styles.teaser}>
                    <p>Coming soon to SMS, Telegram, and more.</p>
                </div>
            </div>
        </section>
    );
};

export default UseCases;
