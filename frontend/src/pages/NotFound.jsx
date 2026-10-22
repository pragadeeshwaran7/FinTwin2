import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';

export default function NotFound() {
  return (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you are looking for does not exist."
      action={<Link to="/dashboard"><Button>Back to dashboard</Button></Link>}
      className="min-h-[60vh]"
    />
  );
}
