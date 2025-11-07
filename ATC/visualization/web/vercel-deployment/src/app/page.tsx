import Dashboard from '@/components/Dashboard'

export default function Home() {
  const isDemoMode = process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA === 'true'
  
  return (
    <div className="w-full h-screen">
      <Dashboard demoMode={isDemoMode} />
    </div>
  )
}
