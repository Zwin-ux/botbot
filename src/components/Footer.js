import styles from './Footer.module.css';

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.brand}>
                    <div className={styles.logo}>BotBot</div>
                    <p className={styles.copyright}>© 2025 BotBot. Built by Bonelli Labs.</p>
                </div>
                <div className={styles.links}>
                    <a href="#" className={styles.link}>Docs</a>
                    <a href="#" className={styles.link}>Support Server</a>
                    <a href="#" className={styles.link}>Privacy</a>
                    <a href="#" className={styles.link}>Terms</a>
                </div>
            </div>
        </footer>
    );
}
