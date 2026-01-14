import MobileApp from '@/pages/MobileApp'
import { OfflineIndicator } from '@/components/common/OfflineIndicator'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <>
      <Toaster position="top-right" />
      <OfflineIndicator />
      <MobileApp />
    </>
  )
}

export default App