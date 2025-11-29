import React from 'react';
import styles from './Preview.module.css';

const Message = ({ author, content, isBot, timestamp, type = 'discord' }) => {
    if (type === 'sms') {
        return (
            <div className={`${styles.smsMessage} ${isBot ? styles.smsBot : styles.smsUser}`}>
                <div className={styles.smsBubble}>
                    {content}
                </div>
                <span className={styles.smsTimestamp}>{timestamp}</span>
            </div>
        );
    }

    return (
        <div className={styles.message}>
            <div className={styles.avatar}>
                {isBot ? (
                    <img src="/logo.png" alt="BotBot" width={40} height={40} className={styles.avatarImg} />
                ) : (
                    <div className={styles.userAvatar} />
                )}
            </div>
            <div className={styles.content}>
                <div className={styles.header}>
                    <span className={isBot ? styles.botName : styles.userName}>{author}</span>
                    {isBot && <span className={styles.botTag}>BOT</span>}
                    <span className={styles.timestamp}>{timestamp}</span>
                </div>
                <p className={styles.text}>{content}</p>
            </div>
        </div>
    );
};

const Preview = () => {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.headerGroup}>
                    <h2 className={styles.sectionTitle}>Anywhere You Are</h2>
                    <p className={styles.sectionSubtitle}>Seamless continuity across platforms.</p>
                </div>

                <div className={styles.grid}>
                    {/* Discord View */}
                    <div className={styles.mockupWindow}>
                        <div className={styles.windowHeader}>
                            <div className={styles.dot} style={{ background: '#FF5F56' }} />
                            <div className={styles.dot} style={{ background: '#FFBD2E' }} />
                            <div className={styles.dot} style={{ background: '#27C93F' }} />
                            <div className={styles.channelName}># general</div>
                        </div>
                        <div className={styles.chatArea}>
                            <Message
                                author="User"
                                timestamp="10:42 AM"
                                content="Remind me to check the server logs in 2 hours."
                            />
                            <Message
                                author="BotBot"
                                isBot
                                timestamp="10:42 AM"
                                content="Set for 12:42 PM. I'll ping you."
                            />
                        </div>
                    </div>

                    {/* SMS View */}
                    <div className={styles.phoneMockup}>
                        <div className={styles.phoneNotch} />
                        <div className={styles.phoneHeader}>
                            <span className={styles.phoneTime}>12:42</span>
                            <span className={styles.phoneContact}>BotBot</span>
                        </div>
                        <div className={styles.smsArea}>
                            <div className={styles.dateDivider}>Today 12:42 PM</div>
                            <Message
                                type="sms"
                                isBot
                                timestamp="12:42 PM"
                                content="🔔 Reminder: Check the server logs."
                            />
                            <Message
                                type="sms"
                                timestamp="12:43 PM"
                                content="On it. Thanks."
                            />
                            <Message
                                type="sms"
                                isBot
                                timestamp="12:43 PM"
                                content="You're welcome! Want me to run a diagnostic?"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Preview;
