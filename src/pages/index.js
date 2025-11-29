import Head from 'next/head';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';
import Preview from '../components/Preview';
import Features from '../components/Features';
import Footer from '../components/Footer';

export default function Home() {
    return (
        <>
            <Head>
                <title>BotBot - Your AI Companion</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <main>
                <Hero />
                <HowItWorks />
                <Preview />
                <Features />
                <Footer />
            </main>
        </>
    );
}
