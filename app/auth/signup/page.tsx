import { SignupForm } from './form';
export const metadata = { title: 'Sign up' };
export const dynamic = 'force-dynamic';
export default function Page() { return <SignupForm googleClientId={process.env.GOOGLE_CLIENT_ID ?? ''} />; }
