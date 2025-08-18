import InstagramMonitor from '../../components/InstagramMonitor';

export default function InstagramMonitorPage() {
  return <InstagramMonitor autoRefresh={true} refreshInterval={30000} />;
}