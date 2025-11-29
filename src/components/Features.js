import styles from './Features.module.css';

const features = [
    {
        title: 'Long-term Memory',
        description: "BotBot remembers your preferences, past conversations, and context, so you don't have to repeat yourself.",
        icon: '🧠',
    },
    {
        title: 'Plugin Skills',
        description: "Extend BotBot's capabilities with plugins for productivity, games, and more.",
        icon: '🔌',
    },
    {
        title: 'Cross-Platform',
        description: 'Start a chat on Discord, continue via SMS or Web. BotBot is where you are.',
        icon: '🌐',
    },
    {
        title: 'Personalized Growth',
        description: 'The more you interact, the more BotBot adapts to your unique personality and needs.',
        icon: '🌱',
    },
];

export default function Features() {
    return (
        <section className={styles.section}>
            <h2 className={styles.heading}>More Than Just a Bot</h2>
            <div className={styles.grid}>
                {features.map((feature, index) => (
                    <div key={index} className={styles.card}>
                        <div className={styles.icon}>{feature.icon}</div>
                        <h3 className={styles.title}>{feature.title}</h3>
                        <p className={styles.description}>{feature.description}</p>
                    </div>
                ))}
            </div>
            <p className={styles.comingSoon}>Coming soon to SMS, Telegram, and more.</p>
        </section>
    );
}
