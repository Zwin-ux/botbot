import styles from './Preview.module.css';

export default function Preview() {
    return (
        <section className={styles.section}>
            <div className={styles.header}>
                <h2 className={styles.title}>Anywhere You Are</h2>
                <p className={styles.subtitle}>Seamless continuity across platforms.</p>
            </div>

            <div className={styles.container}>
                {/* Discord Interface */}
                <div className={styles.interface}>
                    <div className={styles.platformHeader}>
                        <span className={styles.discordIcon}>Discord</span>
                        <span className={styles.channelName}>#general</span>
                    </div>
                    <div className={styles.messages}>
                        <div className={styles.message}>
                            <div className={styles.avatar}>U</div>
                            <div className={styles.bubble}>
                                <div className={styles.user}>User <span className={styles.time}>10:42 AM</span></div>
                                <div className={styles.text}>Remind me to check the server logs in 2 hours.</div>
                            </div>
                        </div>
                        <div className={styles.message}>
                            <div className={styles.botAvatar}>B</div>
                            <div className={styles.bubble}>
                                <div className={styles.botName}>BotBot <span className={styles.botTag}>BOT</span> <span className={styles.time}>10:42 AM</span></div>
                                <div className={styles.text}>Set for 12:42 PM. I'll ping you.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Connection Line */}
                <div className={styles.connection}>
                    <div className={styles.line}></div>
                    <div className={styles.pulse}></div>
                </div>

                {/* SMS Interface */}
                <div className={`${styles.interface} ${styles.sms}`}>
                    <div className={styles.platformHeader}>
                        <span className={styles.smsIcon}>Messages</span>
                        <span className={styles.contactName}>BotBot</span>
                    </div>
                    <div className={styles.messages}>
                        <div className={styles.timeDivider}>Today 12:42 PM</div>
                        <div className={`${styles.smsBubble} ${styles.received}`}>
                            🔔 Reminder: Check the server logs.
                        </div>
                        <div className={`${styles.smsBubble} ${styles.sent}`}>
                            On it. Thanks.
                        </div>
                        <div className={`${styles.smsBubble} ${styles.received}`}>
                            You're welcome! Want me to run a diagnostic?
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
