import styles from './Hero.module.css';
import Button from './Button';

export default function Hero() {
    return (
        <section className={styles.hero}>
            <div className={styles.gridBackground}></div>
            <div className={styles.content}>
                <div className={styles.logo}>BotBot</div>
                <h1 className={styles.title}>
                    Your AI Companion <br />
                    <span className={styles.highlight}>That Remembers</span>
                </h1>
                <p className={styles.subtitle}>
                    BotBot isn't just a bot. It's a platform-agnostic friend that learns,
                    grows, and hangs out wherever you are.
                </p>
                <div className={styles.actions}>
                    <Button variant="primary">Add to Discord</Button>
                    <Button variant="secondary">Join Community</Button>
                </div>
            </div>

            {/* Neural Network Animation Overlay */}
            <div className={styles.neuralNetwork}>
                <div className={styles.node} style={{ top: '20%', left: '10%' }}></div>
                <div className={styles.node} style={{ top: '50%', left: '80%' }}></div>
                <div className={styles.node} style={{ top: '80%', left: '30%' }}></div>
                <div className={styles.connection}></div>
            </div>
        </section>
    );
}
