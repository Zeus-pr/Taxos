import { LoginForm } from './form';
export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';
export default function Page() { return <LoginForm googleClientId={process.env.GOOGLE_CLIENT_ID ?? ''} />; }
