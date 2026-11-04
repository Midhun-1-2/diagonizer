import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { buttonClass } from '../components/ui/Button'
import { EmptyState } from '../components/ui/Common'

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="This page does not exist"
      body="The address may be mistyped. Head back to the dashboard."
      action={
        <Link to="/" className={buttonClass('secondary')}>
          Back to dashboard
        </Link>
      }
    />
  )
}
