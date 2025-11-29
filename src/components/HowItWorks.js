import styles from './HowItWorks.module.css';

const steps = [
    {
        id: 1,
        title: 'Invite BotBot',
        description: "Add BotBot to your server or DM. It's ready to chat instantly.",
    },
    {
        id: 2,
        title: 'Teach & Customize',
        description: 'BotBot learns from your conversations and adapts to your style.',
    },
    {
        id: 3,
        title: 'Grow Together',
        description: 'Unlock new skills and plugins as you interact more.',
    },
];

export default function HowItWorks() {
    return (
        <section className={styles.section}>
            <h2 className={styles.heading}>How it Works</h2>
            <div className={styles.timeline}>
                <div className={styles.line}></div>
                {steps.map((step) => (
                    <div key={step.id} className={styles.step}>
                        <div className={styles.marker}>{step.id}</div>
                        <div className={styles.content}>
                            <h3 className={styles.title}>{step.title}</h3>
                            <p className={styles.description}>{step.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
