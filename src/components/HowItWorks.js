import React from 'react';
import styles from './HowItWorks.module.css';

const Step = ({ number, title, description }) => (
    <div className={styles.step}>
        <div className={styles.number}>{number}</div>
        <h3 className={styles.stepTitle}>{title}</h3>
        <p className={styles.stepDescription}>{description}</p>
    </div>
);

const HowItWorks = () => {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>How it Works</h2>
                <div className={styles.steps}>
                    <Step
                        number="1"
                        title="Invite BotBot"
                        description="Add BotBot to your server or DM. It's ready to chat instantly."
                    />
                    <Step
                        number="2"
                        title="Teach & Customize"
                        description="BotBot learns from your conversations and adapts to your style."
                    />
                    <Step
                        number="3"
                        title="Grow Together"
                        description="Unlock new skills and plugins as you interact more."
                    />
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
